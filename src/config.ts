import type { PricingRules, Tier } from './types'

export const DEMO_TODAY = '2026-11-06'
export const commissionPerPiece = 20
export const pointsPer1000Paid = 1000

export const reorderTargetStock: Record<string, number> = {
  'jersey-fabric-white': 80,
  'polo-blanks': 80,
  'shorts-fabric': 30,
  'sublimation-paper': 200,
  'sublimation-ink-cyan': 12,
  'sublimation-ink-magenta': 12,
  'tote-blanks': 60,
  'heat-tape-roll': 12,
}

export interface MaterialConsumption {
  materialPerUnit: number
  usableMaterialPerUnit: number
  consumptionPerPiece: number
}

export const sampleMaterialConsumption: Record<string, MaterialConsumption> = {
  'jersey-fabric-white': {
    materialPerUnit: 1,
    usableMaterialPerUnit: 0.94,
    consumptionPerPiece: 0.94,
  },
  'polo-blanks': {
    materialPerUnit: 1,
    usableMaterialPerUnit: 0.98,
    consumptionPerPiece: 1,
  },
  'shorts-fabric': {
    materialPerUnit: 1,
    usableMaterialPerUnit: 0.93,
    consumptionPerPiece: 0.65,
  },
  'sublimation-paper': {
    materialPerUnit: 100,
    usableMaterialPerUnit: 96,
    consumptionPerPiece: 2,
  },
  'sublimation-ink-cyan': { materialPerUnit: 1, usableMaterialPerUnit: 0.95, consumptionPerPiece: 0.015 },
  'sublimation-ink-magenta': { materialPerUnit: 1, usableMaterialPerUnit: 0.95, consumptionPerPiece: 0.015 },
  'tote-blanks': { materialPerUnit: 1, usableMaterialPerUnit: 0.98, consumptionPerPiece: 1 },
  'heat-tape-roll': { materialPerUnit: 50, usableMaterialPerUnit: 48, consumptionPerPiece: 0.25 },
}

// NPC tiers are reached by accumulated points (REQ-4.8-06). Sample thresholds, to confirm with
// the owner; Gold at 50 matches the Customer Portal wireframe ("Progress to Gold 42 / 50 pts").
export const tierPointThresholds: Record<Tier, number> = {
  Bronze: 0,
  Silver: 20,
  Gold: 50,
  Platinum: 100,
}

// NPC numbers issued offline by each system must not collide (SRS REQ-4.8-03).
export const npcPrefixes = {
  customerPortal: 'NPC-P',
  billingSystem: 'NPC-B',
} as const

// Price changes take effect no sooner than this, which is longer than the 5-minute API Bridge
// sync, so the Billing System and Customer Portal switch prices at the same moment.
export const pricingChangeLeadMinutes = 10

// Sample reorder rule: cover this many weeks of typical usage above the reorder point.
export const reorderRule = {
  usageLookbackDays: 28,
  coverWeeks: 2,
}

// Sample pricing-suggestion rule based on pieces sold (input-based, not forecasting).
export const pricingDemandRule = {
  lookbackDays: 30,
  highDemandPieces: 20,
  lowDemandPieces: 5,
  markupStepPercent: 5,
}

export const pricingPlaceholders: PricingRules = {
  // Sample Formula 2 inputs in Philippine pesos per piece. The resulting selling
  // prices are ₱420, ₱520, ₱280, ₱580, ₱350, and ₱180.
  productCosts: {
    'Sublimation Jersey': { materialCost: 180, laborCost: 100, overheadCost: 20, markupPercent: 40 },
    'Sublimation Polo': { materialCost: 250, laborCost: 120, overheadCost: 30, markupPercent: 30 },
    'Training Shorts': { materialCost: 110, laborCost: 70, overheadCost: 20, markupPercent: 40 },
    'Jersey + Shorts Set': { materialCost: 260, laborCost: 110, overheadCost: 30, markupPercent: 45 },
    'Custom T-Shirt': { materialCost: 150, laborCost: 80, overheadCost: 20, markupPercent: 40 },
    'Printed Tote Bag': { materialCost: 80, laborCost: 30, overheadCost: 10, markupPercent: 50 },
  },
  membershipDiscount: {
    Bronze: 3,
    Silver: 5,
    Gold: 8,
    Platinum: 10,
  },
  // Sample volume discount thresholds and percentages.
  volumeDiscounts: [
    { minPieces: 25, percent: 5 },
    { minPieces: 50, percent: 10 },
  ],
  // Sample rush percentage.
  rushPercent: 15,
  creditCharge: {
    15: 20,
    30: 30,
  },
  // Sample screen-print charges: one screen per color, plus per-piece color and area charges.
  screenPrint: {
    setupFeePerColor: 150,
    perColorPerPiece: 10,
    perSquareInchPerPiece: 0.5,
  },
  // From the Customer Portal Terms & Conditions: 5% per week after 7 days unclaimed.
  storageFee: {
    graceDays: 7,
    percentPerWeek: 5,
  },
  // From the Customer Portal Terms & Conditions: 2.5% for every 30 days of delay.
  latePaymentPenalty: {
    percentPer30Days: 2.5,
  },
}
