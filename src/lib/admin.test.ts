import { describe, expect, it } from 'vitest'
import { commissionPerPiece, pointsPer1000Paid, pricingPlaceholders } from '../config'
import type { AdminOrder, Material } from '../types'
import {
  addInventory,
  calculateCostAndProfit,
  calculateMembershipPoints,
  createCommissionPayout,
  deductInventory,
  estimateMaterialYield,
  formatCurrency,
  generateRecommendations,
  isLowStock,
  nextTierProgress,
  orderStatus,
  pointsEarnedFromPayment,
  removeInventory,
  suggestReorderQuantity,
  tierForPoints,
  upgradeTierForPoints,
  validatePricingRules,
} from './admin'
import { productPriceList } from './pricing'

const materials: Material[] = [
  { id: 'paper', name: 'Paper', unit: 'sheets', stock: 5, reorderPoint: 5, unitCost: 10 },
  { id: 'ink', name: 'Ink', unit: 'bottles', stock: 20, reorderPoint: 4, unitCost: 50 },
]

const order: AdminOrder = {
  id: 'ORD-1',
  customerId: 'CUS-1',
  customer: 'Sample Customer',
  product: 'Custom T-Shirt',
  pieces: 12,
  salesPersonId: 'EMP-1',
  createdAt: '2026-11-06T12:00:00.000Z',
  deadline: '2026-11-10',
  salePrice: 5000,
  amountPaid: 5000,
  materialCost: 1200,
  laborCost: 600,
  claimed: true,
}

describe('inventory', () => {
  it('treats stock equal to the reorder point as low', () => {
    expect(isLowStock(materials[0])).toBe(true)
    expect(isLowStock(materials[1])).toBe(false)
  })

  it('deducts stock and appends an Out movement for each required material', () => {
    const result = deductInventory(
      materials,
      [{ materialId: 'paper', qty: 2 }, { materialId: 'ink', qty: 3 }],
      [],
      'ORD-1',
      '2026-11-06T00:00:00.000Z',
      'MOV-ORD-1',
    )
    expect(result.materials.map(material => material.stock)).toEqual([3, 17])
    expect(result.movements).toEqual([
      {
        id: 'MOV-ORD-1-1',
        materialId: 'paper',
        type: 'Out',
        qty: 2,
        reason: 'Released for production',
        orderId: 'ORD-1',
        at: '2026-11-06T00:00:00.000Z',
      },
      {
        id: 'MOV-ORD-1-2',
        materialId: 'ink',
        type: 'Out',
        qty: 3,
        reason: 'Released for production',
        orderId: 'ORD-1',
        at: '2026-11-06T00:00:00.000Z',
      },
    ])
    expect(materials[0].stock).toBe(5)
  })

  it('does not partially deduct if any required stock is insufficient', () => {
    expect(() =>
      deductInventory(materials, [{ materialId: 'paper', qty: 6 }], [], 'ORD-1', 'now', 'MOV'),
    ).toThrow(/Insufficient stock/)
  })

  it('adds stock and records an In movement', () => {
    const result = addInventory(materials, [], 'paper', 4, 'Received stock', 'now', 'MOV-1')
    expect(result.materials[0].stock).toBe(9)
    expect(result.movements[0]).toMatchObject({
      materialId: 'paper',
      type: 'In',
      qty: 4,
      reason: 'Received stock',
    })
  })

  it('records a manual stock-out with its QR Code / Number and refuses to go below zero', () => {
    const result = removeInventory(materials, [], 'ink', 3, 'Damaged bottle', 'now', 'MOV-2', 'QR-7781')
    expect(result.materials[1].stock).toBe(17)
    expect(result.movements[0]).toMatchObject({ type: 'Out', qty: 3, reason: 'Damaged bottle', reference: 'QR-7781' })
    expect(() => removeInventory(materials, [], 'paper', 6, 'Count correction', 'now', 'MOV-3')).toThrow(/Insufficient stock/)
    expect(() => removeInventory(materials, [], 'paper', 1, '  ', 'now', 'MOV-4')).toThrow(/Reason/)
  })
})

describe('material yield', () => {
  it('calculates yield and waste percentage', () => {
    expect(estimateMaterialYield({
      materialPerUnit: 100,
      usableMaterialPerUnit: 90,
      consumptionPerPiece: 3,
    })).toEqual({ yieldPerUnit: 30, wastePercent: 10 })
  })
})

describe('recommendations', () => {
  const mugSuggestion = {
    product: 'Mug',
    currentMarkupPercent: 40,
    suggestedMarkupPercent: 45,
    currentPrice: 250,
    suggestedPrice: 275,
    basis: 'High demand',
  }
  const base = { movements: [], targetStock: { paper: 25 }, pricingSuggestions: [mugSuggestion] }

  it('generates reorder suggestions for low stock and pricing suggestions in every case (Figure 8)', () => {
    const recommendations = generateRecommendations({ ...base, materials })
    expect(recommendations.map(item => item.kind)).toEqual(['Reorder', 'Pricing'])
    expect(recommendations[0]).toMatchObject({
      kind: 'Reorder',
      subject: 'Paper',
      suggestion: 'Reorder 20 sheets.',
      status: 'Pending',
      reorderQty: 20,
    })
    expect(recommendations[1]).toMatchObject({
      kind: 'Pricing',
      subject: 'Mug',
      pricingUpdate: { product: 'Mug', markupPercent: 45 },
    })
    expect(recommendations[1].suggestion).toContain('₱250.00')
    expect(recommendations[1].suggestion).toContain('₱275.00')
  })

  it('still generates pricing suggestions when no stock is low', () => {
    expect(generateRecommendations({ ...base, materials: [materials[1]] }).map(item => item.kind)).toEqual(['Pricing'])
  })

  it('sizes a reorder from typical usage, falling back to target stock without usage history', () => {
    const usage = [
      { id: 'M1', materialId: 'paper', type: 'Out' as const, qty: 10, reason: 'Production use', at: '2026-10-20T08:00:00.000Z' },
      { id: 'M2', materialId: 'paper', type: 'Out' as const, qty: 4, reason: 'Production use', at: '2026-11-05T08:00:00.000Z' },
      { id: 'M3', materialId: 'paper', type: 'Out' as const, qty: 99, reason: 'Too old', at: '2026-09-01T08:00:00.000Z' },
    ]
    const suggestion = suggestReorderQuantity(materials[0], usage, { paper: 25 }, '2026-11-06')
    // 14 sheets over 28 days = 3.5 per week; 2 weeks of cover (7) + reorder point 5 − stock 5.
    expect(suggestion.qty).toBe(7)
    expect(suggestion.basis).toContain('3.5 sheets per week')
    expect(suggestReorderQuantity(materials[0], [], { paper: 25 }, '2026-11-06').qty).toBe(20)
  })
})

describe('order lifecycle', () => {
  it('reports Ready for Pickup / Ready for Delivery after Quality Control', () => {
    expect(orderStatus({ claimed: false })).toBe('Awaiting Release')
    expect(orderStatus({ claimed: false, stage: 'Cutting' })).toBe('In Production')
    expect(orderStatus({ claimed: false, stage: 'Quality Control', readyAt: 'now', claimMethod: 'Pick-up' })).toBe('Ready for Pickup')
    expect(orderStatus({ claimed: false, stage: 'Quality Control', readyAt: 'now', claimMethod: 'Delivery' })).toBe('Ready for Delivery')
    expect(orderStatus({ claimed: true, stage: 'Quality Control', readyAt: 'now' })).toBe('Claimed')
  })
})

describe('commission and profitability', () => {
  it('uses the configured per-piece commission rate', () => {
    expect(commissionPerPiece).toBe(20)
    expect(createCommissionPayout(order, '2026-11-06T00:00:00.000Z')).toEqual({
      id: 'ORD-1-commission',
      salesPersonId: 'EMP-1',
      orderId: 'ORD-1',
      pieces: 12,
      amount: 240,
      status: 'Unpaid',
      postedAt: '2026-11-06T00:00:00.000Z',
    })
  })

  it('creates commission only when an order is claimed and fully paid', () => {
    expect(createCommissionPayout({ ...order, claimed: false })).toBeNull()
    expect(createCommissionPayout({ ...order, amountPaid: order.salePrice - 1 })).toBeNull()
  })

  it('calculates production cost and gross profit', () => {
    expect(calculateCostAndProfit(order)).toEqual({
      productionCost: 1800,
      grossProfit: 3200,
    })
  })
})

describe('membership points', () => {
  it('awards one point per full ₱1,000 paid', () => {
    expect(pointsPer1000Paid).toBe(1000)
    expect(calculateMembershipPoints(1999)).toBe(1)
    expect(calculateMembershipPoints(2000)).toBe(2)
  })

  it('picks the tier from points and upgrades but never downgrades automatically', () => {
    expect(tierForPoints(0)).toBe('Bronze')
    expect(tierForPoints(19)).toBe('Bronze')
    expect(tierForPoints(20)).toBe('Silver')
    expect(tierForPoints(50)).toBe('Gold')
    expect(tierForPoints(100)).toBe('Platinum')
    const member = { npcNumber: 'NPC-P-1', name: 'M', tier: 'Silver' as const, points: 42, openingPoints: 0, joinedAt: '2026-01-01' }
    expect(nextTierProgress(member)).toEqual({ tier: 'Gold', pointsNeeded: 8 })
    expect(nextTierProgress({ ...member, tier: 'Platinum' })).toBeNull()
    expect(upgradeTierForPoints({ ...member, points: 55 })).toBe('Gold')
    expect(upgradeTierForPoints({ ...member, points: 5 })).toBeNull()
  })

  it('awards only the whole points newly crossed by a payment', () => {
    expect(pointsEarnedFromPayment(1050, 2100)).toBe(1)
    expect(pointsEarnedFromPayment(0, 999)).toBe(0)
    expect(pointsEarnedFromPayment(900, 3100)).toBe(3)
  })
})

describe('pricing rule validation', () => {
  it('accepts exact sample pricing values', () => {
    expect(productPriceList(pricingPlaceholders)).toEqual({
      'Sublimation Jersey': 420,
      'Sublimation Polo': 520,
      'Training Shorts': 280,
      'Jersey + Shorts Set': 580,
      'Custom T-Shirt': 350,
      'Printed Tote Bag': 180,
    })
    expect(pricingPlaceholders.membershipDiscount).toEqual({
      Bronze: 3,
      Silver: 5,
      Gold: 8,
      Platinum: 10,
    })
    expect(pricingPlaceholders.volumeDiscounts).toEqual([
      { minPieces: 25, percent: 5 },
      { minPieces: 50, percent: 10 },
    ])
    expect(pricingPlaceholders.rushPercent).toBe(15)
    expect(pricingPlaceholders.creditCharge).toEqual({ 15: 20, 30: 30 })
    expect(validatePricingRules(pricingPlaceholders)).toEqual([])
  })

  it('rejects negative values and percentages above 100', () => {
    const invalidRules = {
      ...pricingPlaceholders,
      productCosts: { Product: { materialCost: -1, laborCost: 0, overheadCost: 0, markupPercent: 10 } },
      membershipDiscount: { ...pricingPlaceholders.membershipDiscount, Gold: 101 },
      rushPercent: 101,
    }
    expect(validatePricingRules(invalidRules)).toHaveLength(3)
  })

  it('validates screen-print charges, storage fees, and late-payment penalties', () => {
    expect(pricingPlaceholders.storageFee).toEqual({ graceDays: 7, percentPerWeek: 5 })
    expect(pricingPlaceholders.latePaymentPenalty).toEqual({ percentPer30Days: 2.5 })
    expect(validatePricingRules({
      ...pricingPlaceholders,
      screenPrint: { ...pricingPlaceholders.screenPrint, perColorPerPiece: -1 },
      storageFee: { graceDays: 1.5, percentPerWeek: 120 },
      latePaymentPenalty: { percentPer30Days: -2 },
    })).toHaveLength(4)
  })
})

describe('currency formatting', () => {
  it('formats currency with a peso sign, grouping, and exactly two decimals', () => {
    expect(formatCurrency(1250)).toBe('₱1,250.00')
    expect(formatCurrency(12.5)).toBe('₱12.50')
  })
})
