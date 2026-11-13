import {
  BILLING_CONFIG,
  SCAN_BASE_URL,
  type BillingConfig,
} from "../config"

import type {
  CommissionEntry,
  Order,
  OrderLine,
  PaymentStatus,
  Stage,
  Tier,
} from "../types"

export interface PricingInput {
  lines: OrderLine[]

  tier?: Tier

  rush?: boolean

  creditTermDays?: 15 | 30
}

export interface PricingBreakdown {
  totalPieces: number

  subtotal: number

  discounts: { label: string; amount: number }[]

  totalDiscount: number

  rushSurcharge: number

  creditCharge: number

  grandTotal: number
}

export type AdvanceStageResult = { ok: true; order: Order } | {
  ok: false

  reason: "downpayment-required" | "already-ready" | "already-claimed" | "invalid-status"
}

export type ClaimReleaseResult = { allowed: true; remainingBalance: number } | {
  allowed: false

  reason: "not-ready" | "balance-unsettled"

  remainingBalance: number
}

const STAGES: readonly Stage[] = [
  "Cutting",

  "Printing/Sewing",

  "Heat Press",

  "Quality Control",
]
const ORDER_ID_PATTERN = /^NPS-\d{8}-\d{3}$/i

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function validateNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number.`)
  }
}

export function getTotalPieces(lines: OrderLine[]): number {
  return lines.reduce(
    (total, line) =>
      total +
      Object.values(line.sizes).reduce((lineTotal, quantity) => {
        validateNonNegativeFinite(quantity, "Quantity")

        if (!Number.isInteger(quantity)) {
          throw new RangeError("Quantity must be a whole number.")
        }

        return lineTotal + quantity
      }, 0),

    0,
  )
}

export function calculatePricing(
  input: PricingInput,

  config: BillingConfig = BILLING_CONFIG,
): PricingBreakdown {
  const totalPieces = getTotalPieces(input.lines)

  const subtotal = roundMoney(
    input.lines.reduce((total, line) => {
      validateNonNegativeFinite(line.pricePerPiece, "Price per piece")

      const pieces = Object.values(line.sizes).reduce(
        (sum, quantity) => sum + quantity,

        0,
      )

      return total + line.pricePerPiece * pieces
    }, 0),
  )

  const discounts: PricingBreakdown["discounts"] = []

  if (input.tier) {
    const membershipDiscount = roundMoney(
      subtotal * config.tierDiscountRates[input.tier],
    )

    if (membershipDiscount > 0) {
      discounts.push({
        label: `${input.tier} membership discount`,

        amount: membershipDiscount,
      })
    }
  }

  const volumeTier = [...config.volumeDiscountTiers]

    .sort((a, b) => b.minimumPieces - a.minimumPieces)

    .find((tier) => totalPieces >= tier.minimumPieces)

  if (volumeTier) {
    const volumeDiscount = roundMoney(subtotal * volumeTier.rate)

    if (volumeDiscount > 0) {
      discounts.push({ label: "Volume discount", amount: volumeDiscount })
    }
  }

  const totalDiscount = roundMoney(
    discounts.reduce((total, discount) => total + discount.amount, 0),
  )

  const rushSurcharge = input.rush
    ? roundMoney(subtotal * config.rushSurchargeRate)
    : 0

  const preCreditTotal = Math.max(0, subtotal - totalDiscount + rushSurcharge)

  const creditCharge = input.creditTermDays
    ? roundMoney(preCreditTotal * config.creditTermRates[input.creditTermDays])
    : 0

  return {
    totalPieces,

    subtotal,

    discounts,

    totalDiscount,

    rushSurcharge,

    creditCharge,

    grandTotal: roundMoney(preCreditTotal + creditCharge),
  }
}

export function getPaidTotal(order: Order): number {
  return roundMoney(
    order.payments.reduce((total, payment) => {
      validateNonNegativeFinite(payment.amount, "Payment amount")

      return total + payment.amount
    }, 0),
  )
}

export function getRemainingBalance(order: Order, grandTotal: number): number {
  validateNonNegativeFinite(grandTotal, "Grand total")

  return roundMoney(Math.max(0, grandTotal - getPaidTotal(order)))
}

export function getPaymentStatus(
  order: Order,

  grandTotal: number,
): PaymentStatus {
  if (order.payments.length === 0) return "Unpaid"

  if (getRemainingBalance(order, grandTotal) === 0) return "Paid in Full"

  return "Partially Paid"
}

export function validatePaymentAmount(
  order: Order,

  grandTotal: number,

  amount: number,
): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new RangeError("Payment amount must be greater than zero.")
  }

  const remainingBalance = getRemainingBalance(order, grandTotal)

  if (amount > remainingBalance) {
    throw new RangeError("Payment amount cannot exceed the remaining balance.")
  }

  return remainingBalance
}

function hasRecordedDownpayment(order: Order): boolean {
  return getPaidTotal(order) > 0 && order.status !== "Pending Downpayment"
}

export function advanceStage(order: Order): AdvanceStageResult {
  if (order.status === "Claimed") {
    return { ok: false, reason: "already-claimed" }
  }

  if (order.status === "Ready for Claim") {
    return { ok: false, reason: "already-ready" }
  }

  if (
    order.status === "Pending Downpayment" ||
    !hasRecordedDownpayment(order)
  ) {
    return { ok: false, reason: "downpayment-required" }
  }

  if (order.status !== "In Production") {
    return { ok: false, reason: "invalid-status" }
  }

  if (!order.stage) {
    return { ok: true, order: { ...order, stage: "Cutting" } }
  }

  const stageIndex = STAGES.indexOf(order.stage)

  if (stageIndex === -1) return { ok: false, reason: "invalid-status" }

  if (order.stage === "Quality Control") {
    return {
      ok: true,

      order: { ...order, status: "Ready for Claim" },
    }
  }

  return {
    ok: true,

    order: { ...order, stage: STAGES[stageIndex + 1] },
  }
}

export function validateClaimRelease(
  order: Order,

  grandTotal: number,
): ClaimReleaseResult {
  const remainingBalance = getRemainingBalance(order, grandTotal)

  if (order.status !== "Ready for Claim") {
    return { allowed: false, reason: "not-ready", remainingBalance }
  }

  if (remainingBalance > 0 && order.creditTermDays === undefined) {
    return { allowed: false, reason: "balance-unsettled", remainingBalance }
  }

  return { allowed: true, remainingBalance }
}

export function createCommissionEntry(
  order: Order,

  grandTotal: number,

  postedAt: string,
): CommissionEntry | undefined {
  if (
    order.status !== "Claimed" ||
    getPaymentStatus(order, grandTotal) !== "Paid in Full"
  ) {
    return undefined
  }

  const pieces = getTotalPieces(order.lines)

  return {
    orderId: order.id,

    salesPersonId: order.salesPersonId,

    pieces,

    amount: roundMoney(pieces * BILLING_CONFIG.commissionPerPiece),

    postedAt,
  }
}

export function calculateNpcPoints(paidTotal: number): number {
  validateNonNegativeFinite(paidTotal, "Paid total")

  return Math.floor(paidTotal / BILLING_CONFIG.npcPointsPerPeso)
}

export function generateOrderId(date: Date | string, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999) {
    throw new RangeError("Order sequence must be an integer from 1 to 999.")
  }

  const dateString =
    date instanceof Date ? date.toISOString().slice(0, 10) : date

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new RangeError("Date must be a valid YYYY-MM-DD date.")
  }

  const parsedDate = new Date(`${dateString}T00:00:00.000Z`)

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dateString
  ) {
    throw new RangeError("Date must be a valid YYYY-MM-DD date.")
  }

  return `NPS-${dateString.replace(/-/g, "")}-${String(sequence).padStart(3, "0")}`
}

export function generateNpcNumber(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999_999) {
    throw new RangeError("NPC sequence must be an integer from 1 to 999999.")
  }

  return `NPC-${String(sequence).padStart(6, "0")}`
}

export function buildScanLink(orderId: string): string {
  if (!ORDER_ID_PATTERN.test(orderId)) {
    throw new RangeError("Order ID must use the NPS-YYYYMMDD-NNN format.")
  }
  return `${SCAN_BASE_URL}#/scan/${encodeURIComponent(orderId)}`
}

export function parseScanLink(text: string): string | undefined {
  const value = text.trim()
  if (ORDER_ID_PATTERN.test(value)) return value.toUpperCase()

  let url: URL
  try {
    url = new URL(value, SCAN_BASE_URL || "http://localhost")
  } catch {
    return undefined
  }

  const route = (
    url.hash.startsWith("#/") ? url.hash.slice(1) : url.pathname
  ).split("?")[0]
  const match = route.match(/^\/scan\/([^/?#]+)\/?$/i)
  if (!match) return undefined

  let orderId: string
  try {
    orderId = decodeURIComponent(match[1])
  } catch {
    return undefined
  }

  return ORDER_ID_PATTERN.test(orderId) ? orderId.toUpperCase() : undefined
}

export function isOrderOverdue(order: Order, today: string): boolean {
  return order.deadline < today && order.status !== "Claimed"
}

export function isValidPhPhone(phone: string): boolean {
  const normalized = phone.replace(/[\s-]/g, "")

  return /^(?:09\d{9}|\+639\d{9})$/.test(normalized)
}
