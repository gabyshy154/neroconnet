import type { Tier } from "./types"

export const SCAN_BASE_URL =
  typeof window === "undefined" ? "" : window.location.origin

export interface BillingConfig {
  tierDiscountRates: Record<Tier, number>

  volumeDiscountTiers: readonly { minimumPieces: number; rate: number }[]

  rushSurchargeRate: number

  creditTermRates: Record<15 | 30, number>

  commissionPerPiece: number

  npcPointsPerPeso: number
}

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
}
