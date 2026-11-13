import { beforeEach, describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import { isLowStock } from '../lib/admin'
import { seedData } from '../data/seed'
import { otherExpensesPerOrder, pricingPlaceholders, reorderTargetStock, sampleMaterialConsumption } from '../config'
import { createAdminStore } from './adminStore'

function createMemoryStorage(): StateStorage {
  const values = new Map<string, string>()
  return {
    getItem: name => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value)
    },
    removeItem: name => {
      values.delete(name)
    },
  }
}

describe('admin store', () => {
  let store: ReturnType<typeof createAdminStore>

  beforeEach(() => {
    store = createAdminStore(createMemoryStorage())
  })

  it('seeds the specified sample data counts and two low-stock materials', () => {
    expect(seedData.materials).toHaveLength(8)
    expect(seedData.materials.filter(isLowStock)).toHaveLength(2)
    expect(seedData.inventoryMovements).toHaveLength(20)
    expect(seedData.employees).toHaveLength(10)
    expect(seedData.orders).toHaveLength(11)
    expect(seedData.designSubmissions).toHaveLength(6)
    expect(seedData.members).toHaveLength(10)
    expect(seedData.commissionPayouts.length).toBeGreaterThan(0)
    expect(new Set(seedData.orders.flatMap(order => order.stage ? [order.stage] : [])).size).toBe(4)
    expect(new Set(seedData.members.map(member => member.tier))).toEqual(
      new Set(['Bronze', 'Silver', 'Gold', 'Platinum']),
    )
    expect(seedData.pricingRules).toEqual(pricingPlaceholders)
    expect(seedData.pricingRules.productPrices).toEqual({
      'Sublimation Jersey': 420,
      'Sublimation Polo': 520,
      'Training Shorts': 280,
      'Jersey + Shorts Set': 580,
      'Custom T-Shirt': 350,
      'Printed Tote Bag': 180,
    })
    expect(seedData.employees.filter(employee => employee.role === 'Sales Person')).toMatchObject([
      { id: 'staff-001', name: 'Rina Flores' },
      { id: 'staff-002', name: 'Mark Bautista' },
      { id: 'staff-003', name: 'Jenny Tan' },
      { id: 'staff-004', name: 'Roel Santos' },
    ])
    expect(seedData.orders.map(order => ({
      id: order.id,
      customer: order.customer,
      pieces: order.pieces,
    }))).toEqual([
      { id: 'NPS-20261106-001', customer: 'Paolo Lim', pieces: 5 },
      { id: 'NPS-20261106-002', customer: 'Maria Santos', pieces: 10 },
      { id: 'NPS-20261106-003', customer: 'Jose Reyes', pieces: 20 },
      { id: 'NPS-20261106-004', customer: 'Ana Cruz', pieces: 12 },
      { id: 'NPS-20261106-005', customer: 'Bea Navarro', pieces: 8 },
      { id: 'NPS-20261106-006', customer: 'Miguel Garcia', pieces: 20 },
      { id: 'NPS-20261106-007', customer: 'Carlos Dela Rosa', pieces: 5 },
      { id: 'NPS-20261106-008', customer: 'Ana Cruz', pieces: 10 },
      { id: 'NPS-20261106-009', customer: 'Paolo Lim', pieces: 2 },
      { id: 'NPS-20261106-010', customer: 'Bea Navarro', pieces: 3 },
      { id: 'NPS-20261106-011', customer: 'Sofia Villanueva', pieces: 4 },
    ])
    expect(seedData.orders.find(order => order.id === 'NPS-20261106-003')).toMatchObject({
      stage: 'Printing/Sewing',
      salePrice: 6440,
    })
    expect(seedData.orders.find(order => order.id === 'NPS-20261106-004')).toMatchObject({
      deadline: '2026-11-04',
      stage: 'Heat Press',
    })
    expect(seedData.orders.find(order => order.id === 'NPS-20261106-006')).toMatchObject({
      stage: 'Printing/Sewing',
      salePrice: 4320,
    })
    expect(seedData.orders.filter(order => order.id >= 'NPS-20261106-008')).toMatchObject([
      { claimed: true, amountPaid: 5200 },
      { claimed: true, amountPaid: 840 },
      { claimed: true, amountPaid: 840 },
      { claimed: true, amountPaid: 1400 },
    ])
    expect(seedData.members.slice(0, 4)).toMatchObject([
      { npcNumber: 'NPC-000101', tier: 'Bronze', points: 12, joinedAt: '2025-03-12' },
      { npcNumber: 'NPC-000102', tier: 'Silver', points: 46, joinedAt: '2024-11-03' },
      { npcNumber: 'NPC-000103', tier: 'Gold', points: 128, joinedAt: '2023-08-22' },
      { npcNumber: 'NPC-000104', tier: 'Platinum', points: 305, joinedAt: '2022-05-17' },
    ])
    expect(seedData.members.map(member => member.npcNumber)).toEqual(
      Array.from({ length: 10 }, (_, index) => `NPC-${String(index + 101).padStart(6, '0')}`),
    )
    expect(otherExpensesPerOrder).toBe(50)
    const materialIds = new Set(seedData.materials.map(material => material.id))
    expect(Object.keys(reorderTargetStock).every(id => materialIds.has(id))).toBe(true)
    expect(Object.keys(sampleMaterialConsumption).every(id => materialIds.has(id))).toBe(true)
    expect(seedData.inventoryMovements.every(movement => materialIds.has(movement.materialId))).toBe(true)
    expect(seedData.orders.every(order => order.deadline >= order.createdAt.slice(0, 10))).toBe(true)
    expect(seedData.orders.map(({ createdAt, deadline }) => [createdAt, deadline])).toEqual([
      ['2026-11-06T08:10:00.000Z', '2026-11-10'],
      ['2026-11-06T08:20:00.000Z', '2026-11-12'],
      ['2026-11-06T08:25:00.000Z', '2026-11-11'],
      ['2026-11-01T10:00:00.000Z', '2026-11-04'],
      ['2026-11-03T11:00:00.000Z', '2026-11-13'],
      ['2026-11-05T13:15:00.000Z', '2026-11-14'],
      ['2026-11-04T14:00:00.000Z', '2026-11-08'],
      ['2026-11-02T15:00:00.000Z', '2026-11-05'],
      ['2026-11-04T10:00:00.000Z', '2026-11-12'],
      ['2026-10-28T10:00:00.000Z', '2026-11-03'],
      ['2026-11-06T10:00:00.000Z', '2026-11-14'],
    ])
    expect(seedData.commissionPayouts).toMatchObject([
      { orderId: 'NPS-20261106-008', salesPersonId: 'staff-003', amount: 200, postedAt: '2026-11-06T09:35:00.000Z' },
      { orderId: 'NPS-20261106-009', salesPersonId: 'staff-001', amount: 40, postedAt: '2026-11-04T12:00:00.000Z' },
      { orderId: 'NPS-20261106-010', salesPersonId: 'staff-002', amount: 60, postedAt: '2026-10-29T12:00:00.000Z' },
      { orderId: 'NPS-20261106-011', salesPersonId: 'staff-004', amount: 80, postedAt: '2026-11-06T12:00:00.000Z' },
    ])
  })

  it('confirms an order by deducting stock and logging movements once', () => {
    const initialStock = store.getState().materials.find(item => item.id === 'tote-blanks')!.stock
    store.getState().confirmOrder('NPS-20261106-002', [
      { materialId: 'tote-blanks', qty: 2 },
    ], '2026-11-06T10:00:00.000Z')

    expect(store.getState().materials.find(item => item.id === 'tote-blanks')?.stock)
      .toBe(initialStock - 2)
    expect(store.getState().inventoryMovements[store.getState().inventoryMovements.length - 1]).toMatchObject({
      materialId: 'tote-blanks',
      type: 'Out',
      qty: 2,
      orderId: 'NPS-20261106-002',
    })
    expect(() => store.getState().confirmOrder('NPS-20261106-002', [
      { materialId: 'tote-blanks', qty: 1 },
    ])).toThrow(/already been confirmed/)
  })

  it('approves pricing recommendations and updates rules', () => {
    store.getState().approveRecommendation('REC-003')
    expect(store.getState().pricingRules.productPrices['Custom T-Shirt']).toBe(360)
    expect(store.getState().recommendations.find(item => item.id === 'REC-003')?.status)
      .toBe('Approved')
  })

  it('approves reorder recommendations with a pending In movement but no stock increase', () => {
    const stockBefore = store.getState().materials.find(item => item.id === 'jersey-fabric-white')!.stock
    store.getState().approveRecommendation('REC-001', '2026-11-06T11:00:00.000Z')
    expect(store.getState().materials.find(item => item.id === 'jersey-fabric-white')?.stock)
      .toBe(stockBefore)
    expect(store.getState().inventoryMovements[store.getState().inventoryMovements.length - 1]).toMatchObject({
      materialId: 'jersey-fabric-white',
      type: 'In',
      qty: 58,
      reason: expect.stringContaining('Pending purchase'),
      at: '2026-11-06T11:00:00.000Z',
    })
  })

  it('generates Pricing recommendations after approved pending purchases cover low stock', () => {
    store.getState().approveRecommendation('REC-001', '2026-11-06T11:00:00.000Z')
    store.getState().approveRecommendation('REC-002', '2026-11-06T11:01:00.000Z')
    store.getState().regenerateRecommendations()

    const generated = store.getState().recommendations.filter(item => item.id.startsWith('REC-GEN-'))
    expect(generated.length).toBeGreaterThan(0)
    expect(generated.every(item => item.kind === 'Pricing' && item.status === 'Pending')).toBe(true)
  })

  it('rejects a pending recommendation', () => {
    store.getState().rejectRecommendation('REC-003')
    expect(store.getState().recommendations.find(item => item.id === 'REC-003')?.status)
      .toBe('Rejected')
  })

  it('approves designs and requires a note for requested revisions', () => {
    expect(() => store.getState().requestDesignRevision('DS-002', '  ')).toThrow(/note is required/)
    store.getState().requestDesignRevision('DS-002', 'Please adjust the logo position.')
    expect(store.getState().designSubmissions.find(item => item.id === 'DS-002')).toMatchObject({
      status: 'Revision Required',
      note: 'Please adjust the logo position.',
    })
    store.getState().approveDesign('DS-005')
    expect(store.getState().designSubmissions.find(item => item.id === 'DS-005')?.status)
      .toBe('Approved')
  })

  it('marks a commission paid with a timestamp and does not allow reversal', () => {
    store.getState().markCommissionPaid('COM-008', '2026-11-06T12:00:00.000Z')
    expect(store.getState().commissionPayouts.find(item => item.id === 'COM-008')).toMatchObject({
      status: 'Paid',
      paidAt: '2026-11-06T12:00:00.000Z',
    })
    expect(() => store.getState().markCommissionPaid('COM-008')).toThrow(/already paid/)
  })

  it('logs manual member tier corrections', () => {
    store.getState().correctMemberTier('NPC-000101', 'Silver', '2026-11-06T13:00:00.000Z')
    expect(store.getState().members.find(item => item.npcNumber === 'NPC-000101')?.tier).toBe('Silver')
    expect(store.getState().membershipTierCorrections).toEqual([{
      id: 'TIER-1',
      npcNumber: 'NPC-000101',
      fromTier: 'Bronze',
      toTier: 'Silver',
      at: '2026-11-06T13:00:00.000Z',
    }])
  })

  it('completes the merged Create Employee flow from validation through activation', () => {
    store.getState().createEmployee({
      name: 'Taylor Sample',
      role: 'Production Staff',
      team: 'Team A',
      schedule: ['Monday', 'Wednesday'],
    })
    const employee = store.getState().employees.find(item => item.name === 'Taylor Sample')
    expect(employee).toMatchObject({
      role: 'Production Staff',
      team: 'Team A',
      schedule: ['Monday', 'Wednesday'],
      status: 'Pending',
    })
    store.getState().activateEmployee(employee!.id)
    expect(store.getState().employees.find(item => item.id === employee!.id)?.status).toBe('Active')
  })

  it('assigns a production team and schedule to an order', () => {
    store.getState().assignOrderTeamAndSchedule(
      'NPS-20261106-002',
      'Team A',
      '2026-11-09 08:00',
    )
    expect(store.getState().orders.find(item => item.id === 'NPS-20261106-002')).toMatchObject({
      teamId: 'Team A',
      scheduleStart: '2026-11-09 08:00',
    })
    expect(store.getState().assignmentEvents).toMatchObject([{
      orderId: 'NPS-20261106-002',
      teamId: 'Team A',
      scheduleStart: '2026-11-09 08:00',
      at: '2026-11-06T00:00:00.000Z',
    }])
  })

  it('validates pricing rule updates', () => {
    store.getState().updatePricingRules({
      ...pricingPlaceholders,
      productPrices: { ...pricingPlaceholders.productPrices, 'Custom T-Shirt': 375 },
    })
    expect(store.getState().pricingRules.productPrices['Custom T-Shirt']).toBe(375)
    expect(() => store.getState().updatePricingRules({
      ...pricingPlaceholders,
      rushPercent: 101,
    })).toThrow(/Rush percent/)
  })

  it('creates commission when an order is claimed and already fully paid', () => {
    store.setState(state => ({
      orders: state.orders.map(order => order.id === 'NPS-20261106-001'
        ? { ...order, amountPaid: order.salePrice }
        : order),
    }))
    const count = store.getState().commissionPayouts.length
    store.getState().claimOrder('NPS-20261106-001', '2026-11-06T14:00:00.000Z')
    expect(store.getState().commissionPayouts).toHaveLength(count + 1)
    expect(store.getState().commissionPayouts[store.getState().commissionPayouts.length - 1]).toMatchObject({
      orderId: 'NPS-20261106-001',
      amount: 100,
      status: 'Unpaid',
      postedAt: '2026-11-06T14:00:00.000Z',
    })
  })

  it('creates commission when a claimed order becomes fully paid and updates member points', () => {
    store.setState(state => ({
      orders: state.orders.map(order => order.id === 'NPS-20261106-001'
        ? { ...order, claimed: true, amountPaid: 1050 }
        : order),
    }))
    const count = store.getState().commissionPayouts.length
    store.getState().recordOrderPayment('NPS-20261106-001', 1050, '2026-11-06T15:00:00.000Z')
    expect(store.getState().commissionPayouts).toHaveLength(count + 1)
    expect(store.getState().commissionPayouts[store.getState().commissionPayouts.length - 1]).toMatchObject({
      orderId: 'NPS-20261106-001',
      amount: 100,
    })
    expect(store.getState().members.find(member => member.npcNumber === 'NPC-000101')?.points).toBe(2)
  })

  it('persists actions and resets all demo data', () => {
    const storage = createMemoryStorage()
    const persistentStore = createAdminStore(storage)
    persistentStore.getState().setViewAs('employee:EMP-001')
    persistentStore.getState().markNotificationRead('deadline:EMP-001:ORDER-1:2026-11-06')
    persistentStore.getState().markAllNotificationsRead(['assignment:EMP-001:ASSIGN-1'])
    persistentStore.getState().correctMemberTier('NPC-000101', 'Silver', '2026-11-06T16:00:00.000Z')
    const persisted = storage.getItem('neroconnect-admin-store')
    expect(persisted).toContain('"toTier":"Silver"')
    expect(persisted).toContain('"viewAs":"employee:EMP-001"')
    expect(persisted).toContain('"readNotificationIds"')
    persistentStore.getState().resetDemoData()
    expect(persistentStore.getState().members).toEqual(seedData.members)
    expect(persistentStore.getState().membershipTierCorrections).toEqual([])
    expect(persistentStore.getState().viewAs).toBe('Admin')
    expect(persistentStore.getState().readNotificationIds).toEqual([])
  })
})
