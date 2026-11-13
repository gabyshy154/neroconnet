import type { Order, Stage } from "../types"

export const PRODUCTION_STATION_STORAGE_KEY = "neroconnect-production-station"

export type ProductionBlockReason =
  | "already-claimed"
  | "already-ready"
  | "downpayment-required"
  | "not-in-production"
  | "unknown-order"
  | "wrong-station"

export function getCurrentProductionStage(order: Order): Stage | undefined {
  if (order.status !== "In Production") return order.stage
  return order.stage ?? "Cutting"
}

export function getProductionBlockReason(
  order: Order | undefined,
  station: Stage,
): ProductionBlockReason | undefined {
  if (!order) return "unknown-order"
  if (order.status === "Claimed") return "already-claimed"
  if (order.status === "Ready for Claim") return "already-ready"
  if (order.status === "Pending Downpayment") return "downpayment-required"
  if (order.status !== "In Production") return "not-in-production"
  if (getCurrentProductionStage(order) !== station) return "wrong-station"
  return undefined
}

export function getProductionBlockMessage(
  reason: ProductionBlockReason,
  currentStage?: Stage,
): string {
  switch (reason) {
    case "already-claimed":
    case "already-ready":
      return "This order has finished production."
    case "downpayment-required":
      return "Record the downpayment before starting production."
    case "not-in-production":
      return "This order is not in production and cannot be advanced."
    case "unknown-order":
      return "Order not found. Check the QR code or enter the Order ID."
    case "wrong-station":
      return `This order is at ${currentStage ?? "an unknown stage"}. Switch to the ${currentStage ?? "correct"} station to update it.`
  }
}

export function getScanVia(hash: string): "Phone scan" | "Manual entry" {
  const query = hash.split("?")[1] ?? ""
  return new URLSearchParams(query).get("via") === "manual"
    ? "Manual entry"
    : "Phone scan"
}

export function navigateToProductionScan(
  orderId: string,
  via: "Phone scan" | "Manual entry",
): void {
  const source = via === "Manual entry" ? "?via=manual" : ""
  window.location.hash = `/scan/${encodeURIComponent(orderId)}${source}`
}
