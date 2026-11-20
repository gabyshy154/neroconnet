import type { Tier } from "./types"

export const DEMO_TODAY = "2026-11-06" // pinned demo date, same as the Admin Portal

export function getToday(): string {
  return DEMO_TODAY
}

export function getTodayTimestamp(now: Date = new Date()): string {
  return `${getToday()}T${now.toISOString().slice(11)}`
}

export const SCAN_BASE_URL =
  typeof window === "undefined" ? "" : window.location.origin

export interface BillingConfig {
  tierDiscountRates: Record<Tier, number>

  volumeDiscountTiers: readonly { minimumPieces: number; rate: number }[]

  rushSurchargeRate: number

  creditTermRates: Record<15 | 30, number>

  commissionPerPiece: number

  npcPointsPerPeso: number

  // Points needed for each tier (REQ-4.8-06). Same sample thresholds as the Admin Portal.
  tierPointThresholds: Record<Tier, number>
}

// NPC numbers issued at the counter use their own prefix so they never collide with
// Customer Portal numbers (NPC-P) issued during an outage (REQ-4.8-03).
export const NPC_PREFIX_BILLING = "NPC-B"

export const BILLING_CONFIG: BillingConfig = {
  tierDiscountRates: {
    Bronze: 0.03,

    Silver: 0.05,

    Gold: 0.08,

    Platinum: 0.1,
  },

  // Placeholder thresholds and rates; confirm against the shop's SRS pricing rules.

  volumeDiscountTiers: [
    { minimumPieces: 25, rate: 0.05 },

    { minimumPieces: 50, rate: 0.1 },
  ],

  // Placeholder rate; confirm with the shop before production use.

  rushSurchargeRate: 0.15,

  creditTermRates: {
    15: 0.2,

    30: 0.3,
  },

  commissionPerPiece: 20,

  npcPointsPerPeso: 1000,

  tierPointThresholds: {
    Bronze: 0,

    Silver: 20,

    Gold: 50,

    Platinum: 100,
  },
}
