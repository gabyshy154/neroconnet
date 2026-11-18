import { describe, expect, it } from 'vitest'
import { commissionPerPiece, pointsPer1000Paid, pricingPlaceholders } from '../config'
import type { AdminOrder, Employee, Material } from '../types'
import { getDefaultRolePermissions } from './permissions'
import { seedData } from '../data/seed'
import {
  addInventory,
  calculateCostAndProfit,
  calculateMembershipPoints,
  createCommissionPayout,
  createEmployee,
  deductInventory,
  estimateMaterialYield,
  exportToCsv,
  formatCurrency,
  generateRecommendations,
  hasPermission,
  getCostProfitSummary,
  getCostProfitChartData,
  getCompletedSaleCompletionDate,
  includePendingPurchases,
  isLowStock,
  validateEmployeeInput,
  validatePricingRules,
} from './admin'

const materials: Material[] = [
  { id: 'paper', name: 'Paper', unit: 'sheets', stock: 5, reorderPoint: 5, unitCost: 10 },
  { id: 'ink', name: 'Ink', unit: 'bottles', stock: 20, reorderPoint: 4, unitCost: 50 },
]

const order: AdminOrder = {
  id: 'ORD-1',
  customer: 'Sample Customer',
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
        reason: 'Order confirmed',
        orderId: 'ORD-1',
        at: '2026-11-06T00:00:00.000Z',
      },
      {
        id: 'MOV-ORD-1-2',
        materialId: 'ink',
        type: 'Out',
        qty: 3,
        reason: 'Order confirmed',
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
  it('generates only reorder recommendations when any material is low', () => {
    const recommendations = generateRecommendations(
      materials,
      { paper: 25 },
      [{ product: 'Mug', currentPrice: 250, suggestedPrice: 275, basis: 'Cost change' }],
    )
    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]).toMatchObject({
      kind: 'Reorder',
      subject: 'Paper',
      suggestion: 'Reorder 20 sheets.',
      status: 'Pending',
    })
  })

  it('generates pricing recommendations when stock is not low', () => {
    const recommendations = generateRecommendations(
      [materials[1]],
      {},
      [{ product: 'Mug', currentPrice: 250, suggestedPrice: 275, basis: 'Cost change' }],
    )
    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]).toMatchObject({
      kind: 'Pricing',
      subject: 'Mug',
      status: 'Pending',
    })
    expect(recommendations[0].suggestion).toContain('₱250.00')
    expect(recommendations[0].suggestion).toContain('₱275.00')
  })

  it('counts approved pending reorder quantities toward stock for the next recommendation generation', () => {
    const pendingPurchase = {
      id: 'MOV-REC-001-1',
      materialId: 'paper',
      type: 'In' as const,
      qty: 20,
      reason: 'Pending purchase (mock) — Paper',
      at: '2026-11-06T00:00:00.000Z',
    }
    expect(includePendingPurchases(materials, [pendingPurchase])[0].stock).toBe(25)
    const recommendations = generateRecommendations(
      materials,
      { paper: 25 },
      [{ product: 'Mug', currentPrice: 250, suggestedPrice: 275, basis: 'Cost change' }],
      'next-generation',
      [pendingPurchase],
    )
    expect(recommendations.map(item => item.kind)).toEqual(['Pricing'])
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

  it('calculates production, gross, and net profit', () => {
    expect(calculateCostAndProfit(order, 240)).toEqual({
      productionCost: 1800,
      grossProfit: 3200,
      netProfit: 2960,
    })
    expect(calculateCostAndProfit(order, 240).netProfit).toBe(2960)
  })
})

describe('membership points', () => {
  it('awards one point per full ₱1,000 paid', () => {
    expect(pointsPer1000Paid).toBe(1000)
    expect(calculateMembershipPoints(1999)).toBe(1)
    expect(calculateMembershipPoints(2000)).toBe(2)
  })
})

describe('pricing rule validation', () => {
  it('accepts exact sample pricing values', () => {
    expect(pricingPlaceholders.productPrices).toEqual({
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
      productPrices: { Product: -1 },
      membershipDiscount: { ...pricingPlaceholders.membershipDiscount, Gold: 101 },
      rushPercent: 101,
    }
    expect(validatePricingRules(invalidRules)).toHaveLength(3)
  })
})

describe('role permissions', () => {
  it('checks permissions using the supplied role map', () => {
    const defaults = getDefaultRolePermissions()
    expect(hasPermission('Sales Person', 'screen.inventory', defaults)).toBe(false)
    expect(hasPermission('Sales Person', 'screen.inventory', {
      ...defaults,
      'Sales Person': ['screen.inventory'],
    })).toBe(true)
  })

  it('keeps the default behavior for Admin and Manager', () => {
    const defaults = getDefaultRolePermissions()
    expect(hasPermission('Admin', 'screen.inventory', defaults)).toBe(true)
    expect(hasPermission('Manager', 'screen.inventory', defaults)).toBe(true)
    expect(hasPermission('Sales Person', 'screen.inventory', defaults)).toBe(false)
    expect(hasPermission('Production Staff', 'screen.inventory', defaults)).toBe(false)
  })
})

describe('employee creation', () => {
  const input = {
    name: '  Alex Example ',
    role: 'Production Staff' as const,
    team: 'Team A',
    schedule: ['Monday', 'Wednesday'],
  }
  const existing: Employee[] = []

  it('validates required fields, unique names, and valid schedules', () => {
    expect(validateEmployeeInput(input, existing)).toEqual([])
    expect(validateEmployeeInput({ ...input, name: ' Alex Example ' }, [{
      id: 'EMP-1',
      name: 'Alex Example',
      role: 'Manager',
      team: 'Team B',
      schedule: ['Friday'],
      status: 'Active',
    }])).toContain('Employee name must be unique.')
    expect(validateEmployeeInput({ ...input, schedule: ['Funday'] }, existing)).toContain(
      'Schedule must contain unique, valid days of the week.',
    )
  })

  it('creates valid employees in Pending status', () => {
    expect(createEmployee('EMP-2', input, existing)).toMatchObject({
      id: 'EMP-2',
      name: 'Alex Example',
      status: 'Pending',
    })
  })
})

describe('cost and profit summaries', () => {
  it('uses payout postedAt as completion date and falls back to createdAt', () => {
    const order = seedData.orders.find(item => item.id === 'NPS-20261106-008')!
    expect(getCompletedSaleCompletionDate(order, seedData.commissionPayouts)).toBe('2026-11-06T09:35:00.000Z')
    expect(getCompletedSaleCompletionDate(order, [])).toBe(order.createdAt)
  })

  it('includes only claimed and fully paid orders', () => {
    const summary = getCostProfitSummary(seedData.orders, seedData.commissionPayouts)
    expect(summary.rows.map(row => row.order.id)).toEqual([
      'NPS-20261106-008',
      'NPS-20261106-009',
      'NPS-20261106-010',
      'NPS-20261106-011',
    ])
  })

  it('totals equal the sum of per-order rows and chart data', () => {
    const summary = getCostProfitSummary(seedData.orders, seedData.commissionPayouts)
    expect(summary.totals.sales).toBe(summary.rows.reduce((sum, row) => sum + row.sales, 0))
    expect(summary.totals.productionCost).toBe(summary.rows.reduce((sum, row) => sum + row.productionCost, 0))
    expect(summary.totals.grossProfit).toBe(summary.rows.reduce((sum, row) => sum + row.grossProfit, 0))
    expect(summary.totals.commission).toBe(summary.rows.reduce((sum, row) => sum + row.commission, 0))
    expect(summary.totals.netProfit).toBe(summary.rows.reduce((sum, row) => sum + row.netProfit, 0))

    const chart = getCostProfitChartData(summary.rows)
    expect(chart.reduce((sum, point) => sum + point.sales, 0)).toBe(summary.totals.sales)
    expect(chart.reduce((sum, point) => sum + point.productionCost, 0)).toBe(summary.totals.productionCost)
    expect(chart.reduce((sum, point) => sum + point.netProfit, 0)).toBe(summary.totals.netProfit)
  })

  it('includes negative net profit for loss cases', () => {
    const result = calculateCostAndProfit(
      { salePrice: 100, materialCost: 200, laborCost: 100 },
      50,
    )
    expect(result.productionCost).toBe(300)
    expect(result.grossProfit).toBe(-200)
    expect(result.netProfit).toBe(-250)
  })
})

describe('CSV and currency formatting', () => {
  it('exports escaped CSV rows with headers', () => {
    expect(exportToCsv([{ name: 'Doe, Jane', note: 'said "hello"' }])).toBe(
      'name,note\r\n"Doe, Jane","said ""hello"""',
    )
  })

  it('formats currency with a peso sign, grouping, and exactly two decimals', () => {
    expect(formatCurrency(1250)).toBe('₱1,250.00')
    expect(formatCurrency(12.5)).toBe('₱12.50')
  })
})
