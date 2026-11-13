import type { PricingRules } from './types'

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

// Sample other-expense estimate in Philippine pesos per order.
export const otherExpensesPerOrder = 50

export const pricingPlaceholders: PricingRules = {
  // Sample product prices in Philippine pesos per piece.
  productPrices: {
    'Sublimation Jersey': 420,
    'Sublimation Polo': 520,
    'Training Shorts': 280,
    'Jersey + Shorts Set': 580,
    'Custom T-Shirt': 350,
    'Printed Tote Bag': 180,
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
}
