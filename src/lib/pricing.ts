import { DEMO_TODAY, pricingChangeLeadMinutes, pricingDemandRule } from '../config'
import type { AdminOrder, PricingRules, ProductCost, ScheduledPricingChange } from '../types'
import { addDays } from './reporting'

export interface PricingSuggestionInput {
  product: string
  currentMarkupPercent: number
  suggestedMarkupPercent: number
  currentPrice: number
  suggestedPrice: number
  basis: string
}

function roundToCentavo(amount: number): number {
  return Math.round(amount * 100) / 100
}

/** Formula 2: Selling Price = (Material Cost + Labor Cost + Overhead Cost) × (1 + Markup). */
export function sellingPrice(cost: ProductCost, markupPercent = cost.markupPercent): number {
  const values = [cost.materialCost, cost.laborCost, cost.overheadCost, markupPercent]
  if (values.some(value => !Number.isFinite(value) || value < 0)) {
    throw new RangeError('Costs and markup must be finite numbers greater than or equal to zero.')
  }
  return roundToCentavo((cost.materialCost + cost.laborCost + cost.overheadCost) * (1 + markupPercent / 100))
}

/**
 * Earliest moment a price change may take effect. The lead time is longer than the
 * five-minute API Bridge sync, so the Billing System and Customer Portal both hold the
 * new rules before either starts using them.
 */
export function earliestEffectiveAt(now: string, leadMinutes = pricingChangeLeadMinutes): string {
  return new Date(Date.parse(now) + leadMinutes * 60_000).toISOString()
}

/** Default effective time: the start of the next day (local time), and never before the lead time. */
export function defaultEffectiveAt(now: string, leadMinutes = pricingChangeLeadMinutes): string {
  const nextDay = new Date(now)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(0, 0, 0, 0)
  const earliest = earliestEffectiveAt(now, leadMinutes)
  return nextDay.toISOString() > earliest ? nextDay.toISOString() : earliest
}

export function validateEffectiveAt(effectiveAt: string, now: string, leadMinutes = pricingChangeLeadMinutes): void {
  if (Number.isNaN(Date.parse(effectiveAt))) {
    throw new RangeError('Choose a valid date and time for the price change to take effect.')
  }
  if (Date.parse(effectiveAt) < Date.parse(earliestEffectiveAt(now, leadMinutes))) {
    throw new RangeError(`A price change must take effect at least ${leadMinutes} minutes from now, so both systems have it before it applies.`)
  }
}

/**
 * The pricing rules in effect at a moment. Quotations and orders compute their price with the
 * rules in effect when they are created, then keep that price; a later change never alters them.
 */
export function pricingRulesAt(
  active: PricingRules,
  scheduled: Pick<ScheduledPricingChange, 'rules' | 'effectiveAt'> | null,
  at: string,
): PricingRules {
  return scheduled && Date.parse(scheduled.effectiveAt) <= Date.parse(at) ? scheduled.rules : active
}

/** Human-readable list of what a price change does, for the schedule banner and history. */
export function describePricingChanges(from: PricingRules, to: PricingRules): string[] {
  const changes: string[] = []
  const peso = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const before = productPriceList(from)
  const after = productPriceList(to)
  for (const product of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[product] !== after[product]) {
      changes.push(before[product] === undefined
        ? `${product}: added at ${peso(after[product])}`
        : after[product] === undefined
          ? `${product}: removed`
          : `${product}: ${peso(before[product])} → ${peso(after[product])}`)
    }
  }
  const percent = (label: string, a: number, b: number) => {
    if (a !== b) changes.push(`${label}: ${a}% → ${b}%`)
  }
  for (const tier of ['Bronze', 'Silver', 'Gold', 'Platinum'] as const) {
    percent(`${tier} discount`, from.membershipDiscount[tier], to.membershipDiscount[tier])
  }
  percent('Rush surcharge', from.rushPercent, to.rushPercent)
  percent('15-day credit charge', from.creditCharge[15], to.creditCharge[15])
  percent('30-day credit charge', from.creditCharge[30], to.creditCharge[30])
  percent('Storage fee per week', from.storageFee.percentPerWeek, to.storageFee.percentPerWeek)
  percent('Late-payment penalty', from.latePaymentPenalty.percentPer30Days, to.latePaymentPenalty.percentPer30Days)
  if (from.storageFee.graceDays !== to.storageFee.graceDays) {
    changes.push(`Free storage: ${from.storageFee.graceDays} → ${to.storageFee.graceDays} days`)
  }
  if (JSON.stringify(from.volumeDiscounts) !== JSON.stringify(to.volumeDiscounts)) {
    changes.push('Volume discounts changed')
  }
  if (JSON.stringify(from.screenPrint) !== JSON.stringify(to.screenPrint)) {
    changes.push('Screen-print charges changed')
  }
  return changes
}

/** The per-piece prices the Billing System locks, derived from the Formula 2 inputs. */
export function productPriceList(rules: Pick<PricingRules, 'productCosts'>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(rules.productCosts).map(([product, cost]) => [product, sellingPrice(cost)]),
  )
}

export interface ScreenPrintJob {
  pieces: number
  colors: number
  printAreaSqIn: number
}

/** Screen-print charge for a whole job, from color count and print area. */
export function screenPrintCharge(rules: Pick<PricingRules, 'screenPrint'>, job: ScreenPrintJob): number {
  const { pieces, colors, printAreaSqIn } = job
  if (!Number.isInteger(pieces) || pieces <= 0 || !Number.isInteger(colors) || colors <= 0) {
    throw new RangeError('Pieces and colors must be whole numbers greater than zero.')
  }
  if (!Number.isFinite(printAreaSqIn) || printAreaSqIn <= 0) {
    throw new RangeError('Print area must be greater than zero square inches.')
  }
  const { setupFeePerColor, perColorPerPiece, perSquareInchPerPiece } = rules.screenPrint
  return roundToCentavo(
    setupFeePerColor * colors + pieces * (colors * perColorPerPiece + printAreaSqIn * perSquareInchPerPiece),
  )
}

/**
 * Rule-based pricing suggestions from pieces sold in the lookback window: high-demand
 * products get a higher markup, underperforming products a lower one.
 */
export function buildPricingSuggestions(
  rules: Pick<PricingRules, 'productCosts'>,
  orders: readonly Pick<AdminOrder, 'product' | 'pieces' | 'amountPaid' | 'createdAt'>[],
  today = DEMO_TODAY,
  rule = pricingDemandRule,
): PricingSuggestionInput[] {
  const since = addDays(today, -rule.lookbackDays)
  const piecesByProduct = new Map<string, number>()
  for (const order of orders) {
    const date = order.createdAt.slice(0, 10)
    if (order.amountPaid > 0 && date > since && date <= today) {
      piecesByProduct.set(order.product, (piecesByProduct.get(order.product) ?? 0) + order.pieces)
    }
  }

  const suggestions: PricingSuggestionInput[] = []
  for (const [product, cost] of Object.entries(rules.productCosts)) {
    const pieces = piecesByProduct.get(product) ?? 0
    let suggestedMarkupPercent: number
    let reason: string
    if (pieces >= rule.highDemandPieces) {
      suggestedMarkupPercent = cost.markupPercent + rule.markupStepPercent
      reason = `High demand: ${pieces} pieces sold in the last ${rule.lookbackDays} days (threshold ${rule.highDemandPieces}).`
    } else if (pieces <= rule.lowDemandPieces && cost.markupPercent > 0) {
      suggestedMarkupPercent = Math.max(0, cost.markupPercent - rule.markupStepPercent)
      reason = `Underperforming: ${pieces} pieces sold in the last ${rule.lookbackDays} days (threshold ${rule.lowDemandPieces}).`
    } else {
      continue
    }
    suggestions.push({
      product,
      currentMarkupPercent: cost.markupPercent,
      suggestedMarkupPercent,
      currentPrice: sellingPrice(cost),
      suggestedPrice: sellingPrice(cost, suggestedMarkupPercent),
      basis: reason,
    })
  }
  return suggestions
}
