import {
  calculatePricing,
  getPaymentStatus,
  getTotalPieces,
  parseScanLink,
} from "../lib/billing"
import type { BillingData } from "../store/billingStore"
import type { Order, OrderLine } from "../types"

export const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]
export const STAGES = [
  "Cutting",
  "Printing/Sewing",
  "Heat Press",
  "Quality Control",
] as const
export const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
  Cutting: "Cutting",
  "Printing/Sewing": "Printing / Sewing",
  "Heat Press": "Heat Press",
  "Quality Control": "Quality Control",
}

export function money(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function customerFor(data: BillingData, customerId: string) {
  return data.customers.find((customer) => customer.id === customerId)
}

export function staffFor(data: BillingData, staffId: string) {
  return data.staff.find((staff) => staff.id === staffId)
}

export function productsFor(data: BillingData, lines: OrderLine[]) {
  return lines
    .map((line) => {
      const product = data.productTypes.find(
        (item) => item.id === line.productTypeId,
      )
      return {
        line,
        name: product?.name ?? line.productTypeId,
        pieces: Object.values(line.sizes).reduce((total, count) => total + count, 0),
      }
    })
}

export function orderPieces(order: Order): number {
  return getTotalPieces(order.lines)
}

export function orderTotal(data: BillingData, order: Order): number {
  const customer = customerFor(data, order.customerId)
  const member = data.npcMembers.find(
    (item) => item.npcNumber === customer?.npcNumber,
  )
  return calculatePricing({
    lines: order.lines,
    tier: member?.tier,
    rush: order.rush,
    creditTermDays: order.creditTermDays,
  }).grandTotal
}

export function orderPaymentStatus(data: BillingData, order: Order) {
  return getPaymentStatus(order, orderTotal(data, order))
}

export function orderItemSummary(data: BillingData, order: Order): string {
  return productsFor(data, order.lines)
    .map(({ name, pieces }) => `${name} · ${pieces} pcs`)
    .join(", ")
}

export function localToday(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getOrderForCode(data: BillingData, code: string) {
  const orderId = parseScanLink(code)
  if (!orderId) return undefined
  const normalized = orderId.toLowerCase()
  return data.orders.find((order) => order.id.toLowerCase() === normalized)
}
