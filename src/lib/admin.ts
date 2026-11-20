import { DEMO_TODAY, commissionPerPiece, pointsPer1000Paid, reorderRule, tierPointThresholds } from '../config'
import type {
  AdminOrder,
  CommissionPayout,
  InventoryMovement,
  Material,
  Member,
  OrderStatus,
  PricingRules,
  Recommendation,
  Tier,
} from '../types'
import type { PricingSuggestionInput } from './pricing'
import { addDays } from './reporting'

export type { PricingSuggestionInput } from './pricing'

export interface MaterialRequirement {
  materialId: string
  qty: number
}

export interface InventoryUpdate {
  materials: Material[]
  movements: InventoryMovement[]
}

export interface MaterialYieldEstimate {
  yieldPerUnit: number
  wastePercent: number
}

export interface ProfitBreakdown {
  productionCost: number
  grossProfit: number
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite number greater than or equal to zero.`)
  }
}

export function isLowStock(material: Pick<Material, 'stock' | 'reorderPoint'>): boolean {
  return material.stock <= material.reorderPoint
}

export function deductInventory(
  materials: readonly Material[],
  requirements: readonly MaterialRequirement[],
  existingMovements: readonly InventoryMovement[],
  orderId: string,
  at: string,
  movementIdPrefix: string,
): InventoryUpdate {
  if (!orderId.trim() || !at.trim() || !movementIdPrefix.trim()) {
    throw new Error('Order ID, timestamp, and movement ID prefix are required.')
  }

  const requiredByMaterial = new Map<string, number>()
  for (const requirement of requirements) {
    if (!requirement.materialId.trim()) {
      throw new Error('Every material requirement must include a material ID.')
    }
    if (!Number.isFinite(requirement.qty) || requirement.qty <= 0) {
      throw new RangeError('Required material quantities must be finite and greater than zero.')
    }
    requiredByMaterial.set(
      requirement.materialId,
      (requiredByMaterial.get(requirement.materialId) ?? 0) + requirement.qty,
    )
  }

  const materialById = new Map(materials.map(material => [material.id, material]))
  for (const [materialId, qty] of requiredByMaterial) {
    const material = materialById.get(materialId)
    if (!material) {
      throw new Error(`Material "${materialId}" was not found.`)
    }
    if (material.stock < qty) {
      throw new RangeError(`Insufficient stock for "${material.name}".`)
    }
  }

  const deductions = [...requiredByMaterial.entries()]
  const updatedMaterials = materials.map(material => {
    const qty = requiredByMaterial.get(material.id)
    return qty === undefined ? material : { ...material, stock: material.stock - qty }
  })
  const newMovements = deductions.map(([materialId, qty], index): InventoryMovement => ({
    id: `${movementIdPrefix}-${index + 1}`,
    materialId,
    type: 'Out',
    qty,
    reason: 'Released for production',
    orderId,
    at,
  }))

  return {
    materials: updatedMaterials,
    movements: [...existingMovements, ...newMovements],
  }
}

export function addInventory(
  materials: readonly Material[],
  existingMovements: readonly InventoryMovement[],
  materialId: string,
  qty: number,
  reason: string,
  at: string,
  movementId: string,
  reference?: string,
): InventoryUpdate {
  return adjustInventory(materials, existingMovements, materialId, 'In', qty, reason, at, movementId, reference)
}

/** Records a manual stock-out (damage, spoilage, count correction) with its reason. */
export function removeInventory(
  materials: readonly Material[],
  existingMovements: readonly InventoryMovement[],
  materialId: string,
  qty: number,
  reason: string,
  at: string,
  movementId: string,
  reference?: string,
): InventoryUpdate {
  return adjustInventory(materials, existingMovements, materialId, 'Out', qty, reason, at, movementId, reference)
}

function adjustInventory(
  materials: readonly Material[],
  existingMovements: readonly InventoryMovement[],
  materialId: string,
  type: 'In' | 'Out',
  qty: number,
  reason: string,
  at: string,
  movementId: string,
  reference?: string,
): InventoryUpdate {
  assertFiniteNonNegative(qty, 'Quantity')
  if (qty === 0) {
    throw new RangeError('Quantity must be greater than zero.')
  }
  if (!reason.trim() || !at.trim() || !movementId.trim()) {
    throw new Error('Reason, timestamp, and movement ID are required.')
  }
  const material = materials.find(item => item.id === materialId)
  if (!material) {
    throw new Error(`Material "${materialId}" was not found.`)
  }
  if (type === 'Out' && material.stock < qty) {
    throw new RangeError(`Insufficient stock for "${material.name}".`)
  }
  const trimmedReference = reference?.trim()
  const movement: InventoryMovement = {
    id: movementId,
    materialId,
    type,
    qty,
    reason: reason.trim(),
    at,
    ...(trimmedReference ? { reference: trimmedReference } : {}),
  }

  return {
    materials: materials.map(item =>
      item.id === materialId ? { ...item, stock: item.stock + (type === 'In' ? qty : -qty) } : item,
    ),
    movements: [...existingMovements, movement],
  }
}

export function estimateMaterialYield(
  consumption: {
    materialPerUnit: number
    usableMaterialPerUnit: number
    consumptionPerPiece: number
  },
): MaterialYieldEstimate {
  const { materialPerUnit, usableMaterialPerUnit, consumptionPerPiece } = consumption
  if (
    !Number.isFinite(materialPerUnit) ||
    !Number.isFinite(usableMaterialPerUnit) ||
    !Number.isFinite(consumptionPerPiece) ||
    materialPerUnit <= 0 ||
    usableMaterialPerUnit < 0 ||
    usableMaterialPerUnit > materialPerUnit ||
    consumptionPerPiece <= 0
  ) {
    throw new RangeError('Material yield inputs must be finite and within valid positive ranges.')
  }

  return {
    yieldPerUnit: usableMaterialPerUnit / consumptionPerPiece,
    wastePercent: ((materialPerUnit - usableMaterialPerUnit) / materialPerUnit) * 100,
  }
}

export interface ReorderSuggestion {
  qty: number
  basis: string
}

/**
 * Reorder quantity from typical usage: enough to cover the configured number of weeks of
 * average stock-out above the reorder point. Falls back to the target stock with no usage history.
 */
export function suggestReorderQuantity(
  material: Material,
  movements: readonly InventoryMovement[],
  targetStock: Readonly<Record<string, number>>,
  today = DEMO_TODAY,
  rule = reorderRule,
): ReorderSuggestion {
  const since = addDays(today, -rule.usageLookbackDays)
  const usage = movements
    .filter(movement => {
      const date = movement.at.slice(0, 10)
      return movement.materialId === material.id && movement.type === 'Out' && date > since && date <= today
    })
    .reduce((total, movement) => total + movement.qty, 0)
  const lowStatus = `Current stock ${material.stock} is at or below reorder point ${material.reorderPoint}`
  if (usage > 0) {
    const weeklyUsage = usage / (rule.usageLookbackDays / 7)
    const qty = Math.max(1, Math.ceil(weeklyUsage * rule.coverWeeks) + material.reorderPoint - material.stock)
    return {
      qty,
      basis: `${lowStatus}; typical usage is ${Number(weeklyUsage.toFixed(2))} ${material.unit} per week over the last ${rule.usageLookbackDays} days, reordered to cover ${rule.coverWeeks} weeks above the reorder point.`,
    }
  }
  const target = targetStock[material.id]
  if (!Number.isFinite(target) || target < material.stock) {
    throw new RangeError(`A valid reorder target is required for "${material.id}".`)
  }
  return {
    qty: Math.max(1, target - material.stock),
    basis: `${lowStatus}; no recent usage is recorded, so the quantity restores target stock ${target}.`,
  }
}

export interface RecommendationInput {
  materials: readonly Material[]
  movements: readonly InventoryMovement[]
  targetStock: Readonly<Record<string, number>>
  pricingSuggestions: readonly PricingSuggestionInput[]
  idPrefix?: string
  today?: string
}

/**
 * Reorder alerts for low-stock materials, plus pricing
 * suggestions in every case (Figure 8, step 5).
 */
export function generateRecommendations(input: RecommendationInput): Recommendation[] {
  const { materials, movements, targetStock, pricingSuggestions, idPrefix = 'recommendation', today = DEMO_TODAY } = input
  const reorders: Recommendation[] = materials
    .filter(isLowStock)
    .map(material => {
      const { qty, basis } = suggestReorderQuantity(material, movements, targetStock, today)
      return {
        id: '',
        kind: 'Reorder',
        subject: material.name,
        suggestion: `Reorder ${qty} ${material.unit}.`,
        basis,
        status: 'Pending',
        materialId: material.id,
        reorderQty: qty,
      }
    })
  const pricing: Recommendation[] = pricingSuggestions.map(suggestion => ({
    id: '',
    kind: 'Pricing',
    subject: suggestion.product,
    suggestion: `Change markup from ${suggestion.currentMarkupPercent}% to ${suggestion.suggestedMarkupPercent}% (price ${formatCurrency(suggestion.currentPrice)} → ${formatCurrency(suggestion.suggestedPrice)}).`,
    basis: suggestion.basis,
    status: 'Pending',
    pricingUpdate: { product: suggestion.product, markupPercent: suggestion.suggestedMarkupPercent },
  }))
  return [...reorders, ...pricing].map((recommendation, index) => ({
    ...recommendation,
    id: `${idPrefix}-${index + 1}`,
  }))
}

export function isFullyPaid(order: Pick<AdminOrder, 'amountPaid' | 'salePrice'>): boolean {
  return order.amountPaid >= order.salePrice
}

export function orderStatus(order: Pick<AdminOrder, 'claimed' | 'readyAt' | 'stage' | 'claimMethod'>): OrderStatus {
  if (order.claimed) return 'Claimed'
  if (order.readyAt) return order.claimMethod === 'Delivery' ? 'Ready for Delivery' : 'Ready for Pickup'
  if (order.stage) return 'In Production'
  return 'Awaiting Release'
}

const TIER_ORDER: readonly Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum']

/** The highest tier whose points threshold the balance has reached (REQ-4.8-06). */
export function tierForPoints(points: number, thresholds = tierPointThresholds): Tier {
  assertFiniteNonNegative(points, 'Points')
  return [...TIER_ORDER].reverse().find(tier => points >= thresholds[tier]) ?? 'Bronze'
}

/** The next tier and how many more points it needs, or null at the top tier. */
export function nextTierProgress(
  member: Pick<Member, 'tier' | 'points'>,
  thresholds = tierPointThresholds,
): { tier: Tier; pointsNeeded: number } | null {
  const next = TIER_ORDER[TIER_ORDER.indexOf(member.tier) + 1]
  return next ? { tier: next, pointsNeeded: Math.max(0, thresholds[next] - member.points) } : null
}

/**
 * Upgrades a member whose points reached a higher tier's threshold. Tiers never drop
 * automatically; an administrator can still correct a tier manually.
 */
export function upgradeTierForPoints(member: Member, thresholds = tierPointThresholds): Tier | null {
  const earned = tierForPoints(member.points, thresholds)
  return TIER_ORDER.indexOf(earned) > TIER_ORDER.indexOf(member.tier) ? earned : null
}

/** Whole points earned when an order's paid amount rises (1 point per full ₱1,000 paid). */
export function pointsEarnedFromPayment(previousPaid: number, newPaid: number): number {
  return calculateMembershipPoints(newPaid) - calculateMembershipPoints(previousPaid)
}

export function createCommissionPayout(
  order: AdminOrder,
  at = new Date().toISOString(),
): CommissionPayout | null {
  assertFiniteNonNegative(order.amountPaid, 'Amount paid')
  if (!order.claimed || order.amountPaid < order.salePrice) {
    return null
  }
  if (!Number.isInteger(order.pieces) || order.pieces <= 0) {
    throw new RangeError('Order pieces must be a positive integer.')
  }

  return {
    id: `${order.id}-commission`,
    salesPersonId: order.salesPersonId,
    orderId: order.id,
    pieces: order.pieces,
    amount: order.pieces * commissionPerPiece,
    status: 'Unpaid',
    postedAt: at,
  }
}

/** Production cost = material + labor; gross profit = sale − production cost (SRS REQ-4.17-03, 04). */
export function calculateCostAndProfit(
  order: Pick<AdminOrder, 'salePrice' | 'materialCost' | 'laborCost'>,
): ProfitBreakdown {
  assertFiniteNonNegative(order.salePrice, 'Sale price')
  assertFiniteNonNegative(order.materialCost, 'Material cost')
  assertFiniteNonNegative(order.laborCost, 'Labor cost')

  const productionCost = order.materialCost + order.laborCost
  const grossProfit = order.salePrice - productionCost
  return { productionCost, grossProfit }
}

export function calculateMembershipPoints(paid: number): number {
  assertFiniteNonNegative(paid, 'Paid amount')
  return Math.floor(paid / pointsPer1000Paid)
}

export function validatePricingRules(rules: PricingRules): string[] {
  const errors: string[] = []
  for (const [product, cost] of Object.entries(rules.productCosts)) {
    const amounts = [cost.materialCost, cost.laborCost, cost.overheadCost]
    if (amounts.some(amount => !Number.isFinite(amount) || amount < 0)) {
      errors.push(`Costs for "${product}" must be finite numbers greater than or equal to zero.`)
    }
    if (!Number.isFinite(cost.markupPercent) || cost.markupPercent < 0) {
      errors.push(`Markup for "${product}" must be greater than or equal to zero.`)
    }
    if (amounts.every(amount => Number.isFinite(amount)) && amounts.every(amount => amount === 0)) {
      errors.push(`Enter at least one cost for "${product}"; a ₱0.00 selling price is not allowed.`)
    }
  }
  const screenPrint = [rules.screenPrint.setupFeePerColor, rules.screenPrint.perColorPerPiece, rules.screenPrint.perSquareInchPerPiece]
  if (screenPrint.some(amount => !Number.isFinite(amount) || amount < 0)) {
    errors.push('Screen-print charges must be finite numbers greater than or equal to zero.')
  }
  if (!Number.isInteger(rules.storageFee.graceDays) || rules.storageFee.graceDays < 0) {
    errors.push('Storage grace period must be a whole number of days greater than or equal to zero.')
  }
  if (!isValidPercent(rules.storageFee.percentPerWeek)) {
    errors.push('Storage fee per week must be between 0 and 100.')
  }
  if (!isValidPercent(rules.latePaymentPenalty.percentPer30Days)) {
    errors.push('Late-payment penalty must be between 0 and 100.')
  }
  for (const [tier, percent] of Object.entries(rules.membershipDiscount)) {
    if (!isValidPercent(percent)) {
      errors.push(`Membership discount for ${tier} must be between 0 and 100.`)
    }
  }
  rules.volumeDiscounts.forEach((discount, index) => {
    if (!Number.isFinite(discount.minPieces) || discount.minPieces < 0) {
      errors.push(`Volume discount ${index + 1} minimum pieces must be greater than or equal to zero.`)
    }
    if (!isValidPercent(discount.percent)) {
      errors.push(`Volume discount ${index + 1} percent must be between 0 and 100.`)
    }
  })
  if (!isValidPercent(rules.rushPercent)) {
    errors.push('Rush percent must be between 0 and 100.')
  }
  for (const term of [15, 30] as const) {
    if (!isValidPercent(rules.creditCharge[term])) {
      errors.push(`Credit charge for ${term} days must be between 0 and 100.`)
    }
  }
  return errors
}

function isValidPercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError('Currency amount must be a finite number.')
  }
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
