import { beforeEach, describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import { isLowStock, tierForPoints } from '../lib/admin'
import { seedData } from '../data/seed'
import { pricingPlaceholders, reorderTargetStock, sampleMaterialConsumption } from '../config'
import { createAdminStore } from './adminStore'
import { defaultPermissions, emptyUserInput, isSalesPerson, resolveAccount, userInputFromEmployee } from '../lib/userAccess'
import { productPriceList } from '../lib/pricing'

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
    expect(seedData.orders).toHaveLength(12)
    expect(seedData.designSubmissions).toHaveLength(6)
    expect(new Set(seedData.designSubmissions.map(design => design.status))).toEqual(
      new Set(['Under Review', 'Revision Required', 'Approved']),
    )
    expect(seedData.members).toHaveLength(10)
    expect(seedData.commissionPayouts.length).toBeGreaterThan(0)
    expect(new Set(seedData.orders.flatMap(order => order.stage ? [order.stage] : [])).size).toBe(4)
    expect(new Set(seedData.members.map(member => member.tier))).toEqual(
      new Set(['Bronze', 'Silver', 'Gold', 'Platinum']),
    )
    expect(seedData.pricingRules).toEqual(pricingPlaceholders)
    expect(productPriceList(seedData.pricingRules)).toEqual({
      'Sublimation Jersey': 420,
      'Sublimation Polo': 520,
      'Training Shorts': 280,
      'Jersey + Shorts Set': 580,
      'Custom T-Shirt': 350,
      'Printed Tote Bag': 180,
    })
    expect(seedData.employees.filter(isSalesPerson)).toMatchObject([
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
      { id: 'NPS-20261106-001', customer: 'Kevin Ong', pieces: 5 },
      { id: 'NPS-20261106-002', customer: 'Liza Mercado', pieces: 10 },
      { id: 'NPS-20261106-003', customer: 'Arnel Dizon', pieces: 20 },
      { id: 'NPS-20261101-001', customer: 'Ana Cruz', pieces: 12 },
      { id: 'NPS-20261103-001', customer: 'Bea Navarro', pieces: 8 },
      { id: 'NPS-20261105-001', customer: 'Miguel Garcia', pieces: 20 },
      { id: 'NPS-20261104-002', customer: 'Carlos Dela Rosa', pieces: 5 },
      { id: 'NPS-20261102-001', customer: 'Ana Cruz', pieces: 10 },
      { id: 'NPS-20261104-001', customer: 'Kevin Ong', pieces: 2 },
      { id: 'NPS-20261028-001', customer: 'Bea Navarro', pieces: 3 },
      { id: 'NPS-20261106-004', customer: 'Sofia Villanueva', pieces: 4 },
      { id: 'NPS-20261106-005', customer: 'Grace Tan', pieces: 15 },
    ])
    expect(seedData.orders.find(order => order.id === 'NPS-20261101-001')).toMatchObject({
      deadline: '2026-11-04',
      stage: 'Heat Press',
    })
    expect(seedData.members.slice(0, 4)).toMatchObject([
      { npcNumber: 'NPC-P-000101', tier: 'Bronze', points: 12, joinedAt: '2025-03-12' },
      { npcNumber: 'NPC-B-000102', tier: 'Silver', points: 46, joinedAt: '2024-11-03' },
      { npcNumber: 'NPC-P-000103', tier: 'Gold', points: 78, joinedAt: '2023-08-22' },
      { npcNumber: 'NPC-B-000104', tier: 'Platinum', points: 305, joinedAt: '2022-05-17' },
    ])
    expect(seedData.commissionPayouts).toMatchObject([
      { orderId: 'NPS-20261102-001', salesPersonId: 'staff-003', amount: 200, postedAt: '2026-11-06T09:35:00.000Z' },
      { orderId: 'NPS-20261104-001', salesPersonId: 'staff-001', amount: 40, postedAt: '2026-11-04T12:00:00.000Z' },
      { orderId: 'NPS-20261028-001', salesPersonId: 'staff-002', amount: 60, postedAt: '2026-10-29T12:00:00.000Z' },
      { orderId: 'NPS-20261106-004', salesPersonId: 'staff-004', amount: 80, postedAt: '2026-11-06T12:00:00.000Z' },
    ])
  })

  it('keeps the seed data consistent with the business rules', () => {
    const materialIds = new Set(seedData.materials.map(material => material.id))
    expect(Object.keys(reorderTargetStock).every(id => materialIds.has(id))).toBe(true)
    expect(Object.keys(sampleMaterialConsumption).every(id => materialIds.has(id))).toBe(true)
    expect(seedData.inventoryMovements.every(movement => materialIds.has(movement.materialId))).toBe(true)
    const ordersById = new Map(seedData.orders.map(order => [order.id, order]))
    for (const order of seedData.orders) {
      // Order IDs carry the creation date.
      expect(order.id.slice(4, 12)).toBe(order.createdAt.slice(0, 10).replace(/-/g, ''))
      expect(order.deadline >= order.createdAt.slice(0, 10)).toBe(true)
      // BR-03 and BR-07: nothing is in production without an approved design and a downpayment.
      if (order.stage) {
        expect(seedData.releasedOrderIds).toContain(order.id)
        expect(order.amountPaid).toBeGreaterThan(0)
        for (const design of seedData.designSubmissions.filter(item => item.orderRef === order.id)) {
          expect(design.status).toBe('Approved')
        }
      }
      if (order.completedAt) {
        expect(order.claimed && order.amountPaid >= order.salePrice && Boolean(order.readyAt)).toBe(true)
      }
    }
    for (const movement of seedData.inventoryMovements.filter(item => item.orderId)) {
      expect(seedData.releasedOrderIds).toContain(movement.orderId)
      expect(movement.at >= ordersById.get(movement.orderId!)!.createdAt).toBe(true)
    }
    // Customers are never staff members, and points link to members by NPC number.
    const staffNames = new Set(seedData.employees.map(employee => employee.name))
    expect(seedData.orders.some(order => staffNames.has(order.customer))).toBe(false)
    expect(seedData.members.some(member => staffNames.has(member.name))).toBe(false)
    const npcNumbers = new Set(seedData.members.map(member => member.npcNumber))
    expect(seedData.orders.every(order => !order.npcNumber || npcNumbers.has(order.npcNumber))).toBe(true)
    expect(seedData.members.every(member => /^NPC-[PB]-\d{6}$/.test(member.npcNumber))).toBe(true)
  })

  it('releases an order for production only after design approval and a downpayment', () => {
    const initialStock = store.getState().materials.find(item => item.id === 'tote-blanks')!.stock
    const requirement = [{ materialId: 'tote-blanks', qty: 2 }]
    expect(() => store.getState().releaseOrderForProduction('NPS-20261106-005', requirement))
      .toThrow(/design .* must be approved/)
    expect(() => store.getState().releaseOrderForProduction('NPS-20261106-002', requirement))
      .toThrow(/already been released/)

    store.getState().approveDesign('DS-002')
    store.getState().releaseOrderForProduction('NPS-20261106-005', requirement, '2026-11-06T13:00:00.000Z')
    expect(store.getState().materials.find(item => item.id === 'tote-blanks')?.stock).toBe(initialStock - 2)
    expect(store.getState().inventoryMovements[store.getState().inventoryMovements.length - 1]).toMatchObject({
      materialId: 'tote-blanks',
      type: 'Out',
      qty: 2,
      reason: 'Released for production',
      orderId: 'NPS-20261106-005',
    })
    expect(store.getState().orders.find(item => item.id === 'NPS-20261106-005')?.stage).toBe('Cutting')

    store.setState(state => ({
      designSubmissions: state.designSubmissions.map(item => item.id === 'DS-003' ? { ...item, status: 'Approved' } : item),
    }))
    expect(() => store.getState().releaseOrderForProduction('NPS-20261105-001', requirement))
      .toThrow(/downpayment/)
  })

  it('treats every recommendation as an alert that never changes stock or prices', () => {
    const rulesBefore = structuredClone(store.getState().pricingRules)
    const materialsBefore = structuredClone(store.getState().materials)
    store.getState().markRecommendationReviewed('REC-001', '2026-11-06T05:00:00.000Z')
    store.getState().markRecommendationReviewed('REC-003', '2026-11-06T05:01:00.000Z')
    expect(store.getState().recommendations.find(item => item.id === 'REC-001')).toMatchObject({
      status: 'Reviewed',
      reviewedAt: '2026-11-06T05:00:00.000Z',
    })
    // BR-11: neither stock nor prices change.
    expect(store.getState().materials).toEqual(materialsBefore)
    expect(store.getState().pricingRules).toEqual(rulesBefore)
    expect(store.getState().scheduledPricing).toBeNull()
    expect(() => store.getState().markRecommendationReviewed('REC-001')).toThrow(/already been reviewed/)
  })

  it('generates reorder and pricing alerts, skipping any still waiting for review', () => {
    store.getState().regenerateRecommendations()
    const generated = store.getState().recommendations.filter(item => item.id.startsWith('REC-GEN-'))
    // Both low-stock materials and Custom T-Shirt already have alerts waiting (REC-001..003).
    expect(generated.map(item => [item.kind, item.subject])).toEqual([
      ['Pricing', 'Sublimation Polo'],
      ['Pricing', 'Training Shorts'],
      ['Pricing', 'Printed Tote Bag'],
    ])
    store.getState().regenerateRecommendations()
    expect(store.getState().recommendations.filter(item => item.id.startsWith('REC-GEN-'))).toHaveLength(3)
    // Once reviewed, a material that is still low is alerted again.
    store.getState().markRecommendationReviewed('REC-001')
    store.getState().regenerateRecommendations()
    expect(store.getState().recommendations.filter(item => item.kind === 'Reorder' && item.status === 'Pending').map(item => item.subject))
      .toContain('White Polyester Jersey Fabric')
  })

  it('approves designs and requires a note for requested revisions', () => {
    expect(() => store.getState().requestDesignRevision('DS-002', '  ')).toThrow(/note is required/)
    store.getState().requestDesignRevision('DS-002', 'Please adjust the logo position.')
    expect(store.getState().designSubmissions.find(item => item.id === 'DS-002')).toMatchObject({
      status: 'Revision Required',
      note: 'Please adjust the logo position.',
    })
    store.setState(state => ({
      designSubmissions: state.designSubmissions.map(item => item.id === 'DS-002' ? { ...item, status: 'Under Review' } : item),
    }))
    store.getState().approveDesign('DS-002')
    expect(store.getState().designSubmissions.find(item => item.id === 'DS-002')?.status)
      .toBe('Approved')
  })

  it('lets the admin tag the design source until the design is approved', () => {
    store.getState().setDesignSource('DS-001', 'Nero Design')
    expect(store.getState().designSubmissions.find(item => item.id === 'DS-001')?.source).toBe('Nero Design')
    expect(() => store.getState().setDesignSource('DS-004', 'Client Design')).toThrow(/approved design/)
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
    store.getState().correctMemberTier('NPC-P-000101', 'Silver', '2026-11-06T13:00:00.000Z')
    expect(store.getState().members.find(item => item.npcNumber === 'NPC-P-000101')?.tier).toBe('Silver')
    expect(store.getState().membershipTierCorrections).toEqual([{
      id: 'TIER-1',
      npcNumber: 'NPC-P-000101',
      fromTier: 'Bronze',
      toTier: 'Silver',
      reason: 'Manual correction',
      at: '2026-11-06T13:00:00.000Z',
    }])
  })

  it('upgrades a member automatically when points reach the next tier threshold', () => {
    store.setState(state => ({
      members: state.members.map(item => item.npcNumber === 'NPC-B-000102' ? { ...item, points: 49 } : item),
    }))
    // ₱2,600 → ₱5,200 paid on Liza's order crosses three more ₱1,000 marks: 49 → 52 points, Silver → Gold.
    store.getState().recordOrderPayment('NPS-20261106-002', 2600, '2026-11-06T16:00:00.000Z')
    expect(store.getState().members.find(item => item.npcNumber === 'NPC-B-000102')).toMatchObject({ tier: 'Gold', points: 52 })
    expect(store.getState().membershipTierCorrections).toEqual([{
      id: 'TIER-1',
      npcNumber: 'NPC-B-000102',
      fromTier: 'Silver',
      toTier: 'Gold',
      reason: 'Points threshold reached',
      at: '2026-11-06T16:00:00.000Z',
    }])
    // A manual points reduction does not demote the member.
    store.getState().adjustMemberPoints('NPC-B-000102', 10, 'Refund correction')
    expect(store.getState().members.find(item => item.npcNumber === 'NPC-B-000102')?.tier).toBe('Gold')
  })

  it('links every order and membership to a customer record', () => {
    const customersById = new Map(seedData.customers.map(customer => [customer.id, customer]))
    for (const order of seedData.orders) {
      expect(customersById.get(order.customerId)?.name).toBe(order.customer)
    }
    for (const member of seedData.members) {
      const customer = seedData.customers.find(item => item.npcNumber === member.npcNumber)
      expect(customer?.name).toBe(member.name)
      // NPC-P numbers are issued by the Customer Portal, so those members have a portal account.
      if (member.npcNumber.startsWith('NPC-P')) {
        expect(customer?.type).toBe('Portal account')
      }
    }
    expect(seedData.customers.some(customer => !customer.npcNumber)).toBe(true)
    expect(seedData.customers.filter(customer => customer.type === 'Walk-in').every(customer => !customer.email)).toBe(true)
  })

  it('blocks and unblocks walk-in customers with a logged reason', () => {
    expect(() => store.getState().blockCustomer('CUS-001', 'Request')).toThrow(/deactivated, not blocked/)
    expect(() => store.getState().blockCustomer('CUS-002', ' ')).toThrow(/reason is required/)
    store.getState().blockCustomer('CUS-002', 'Customer objected to data processing', '2026-11-06T10:00:00.000Z')
    expect(store.getState().customers.find(item => item.id === 'CUS-002')).toMatchObject({
      status: 'Blocked',
      accountLog: [{ action: 'Blocked', reason: 'Customer objected to data processing', at: '2026-11-06T10:00:00.000Z' }],
    })
    expect(() => store.getState().blockCustomer('CUS-002', 'Again')).toThrow(/already blocked/)
    store.getState().unblockCustomer('CUS-002', 'Objection withdrawn')
    expect(store.getState().customers.find(item => item.id === 'CUS-002')?.status).toBe('Active')
  })

  it('deactivates and reactivates portal customer accounts with a logged reason', () => {
    expect(() => store.getState().deactivateCustomer('CUS-002', 'Customer request')).toThrow(/no portal login/)
    expect(() => store.getState().deactivateCustomer('CUS-001', '  ')).toThrow(/reason is required/)
    store.getState().deactivateCustomer('CUS-001', 'Customer requested account deletion', '2026-11-06T09:00:00.000Z')
    expect(store.getState().customers.find(item => item.id === 'CUS-001')).toMatchObject({
      status: 'Deactivated',
      accountLog: [{ action: 'Deactivated', reason: 'Customer requested account deletion', at: '2026-11-06T09:00:00.000Z' }],
    })
    // Records are kept for the retention period; only the login is disabled.
    expect(store.getState().orders.some(order => order.customerId === 'CUS-001')).toBe(true)
    expect(() => store.getState().deactivateCustomer('CUS-001', 'Again')).toThrow(/already deactivated/)
    store.getState().reactivateCustomer('CUS-001', 'Request withdrawn', '2026-11-07T09:00:00.000Z')
    expect(store.getState().customers.find(item => item.id === 'CUS-001')?.status).toBe('Active')
    expect(store.getState().customers.find(item => item.id === 'CUS-001')?.accountLog).toHaveLength(2)
  })

  it('makes every seeded member points total add up: opening balance + 1 per full ₱1,000 paid per order', () => {
    for (const member of seedData.members) {
      const earned = seedData.orders
        .filter(order => order.npcNumber === member.npcNumber)
        .reduce((total, order) => total + Math.floor(order.amountPaid / 1000), 0)
      expect(member.points).toBe(member.openingPoints + earned)
    }
  })

  it('keeps every seeded member at the tier their points reach', () => {
    for (const member of seedData.members) {
      expect(tierForPoints(member.points)).toBe(member.tier)
    }
  })

  it('logs manual points adjustments and requires a reason', () => {
    expect(() => store.getState().adjustMemberPoints('NPC-P-000101', 20, ' ')).toThrow(/reason is required/)
    expect(() => store.getState().adjustMemberPoints('NPC-P-000101', -1, 'Fix')).toThrow(/whole number/)
    store.getState().adjustMemberPoints('NPC-P-000101', 20, 'Missed walk-in purchase', '2026-11-06T13:30:00.000Z')
    expect(store.getState().members.find(item => item.npcNumber === 'NPC-P-000101')?.points).toBe(20)
    expect(store.getState().membershipPointsAdjustments).toEqual([{
      id: 'POINTS-1',
      npcNumber: 'NPC-P-000101',
      fromPoints: 12,
      toPoints: 20,
      reason: 'Missed walk-in purchase',
      at: '2026-11-06T13:30:00.000Z',
    }])
  })

  it('assigns a production team to an order, with the deadline as its schedule', () => {
    store.getState().assignOrderTeam('NPS-20261106-002', 'Team A')
    expect(store.getState().orders.find(item => item.id === 'NPS-20261106-002')).toMatchObject({ teamId: 'Team A', deadline: '2026-11-12' })
    expect(store.getState().assignmentEvents).toMatchObject([{
      orderId: 'NPS-20261106-002',
      teamId: 'Team A',
      at: '2026-11-06T00:00:00.000Z',
    }])
    expect(() => store.getState().assignOrderTeam('NPS-20261106-002', 'Team A')).toThrow(/already assigned/)
    expect(() => store.getState().assignOrderTeam('NPS-20261106-002', ' ')).toThrow(/Select a production team/)
    expect(() => store.getState().assignOrderTeam('NPS-20261106-001', 'Team A')).toThrow(/active production/)
  })

  it('validates and schedules pricing rule changes with a minimum lead time', () => {
    const now = '2026-11-06T05:00:00.000Z'
    const higherMarkup = {
      ...pricingPlaceholders,
      productCosts: {
        ...pricingPlaceholders.productCosts,
        'Custom T-Shirt': { ...pricingPlaceholders.productCosts['Custom T-Shirt'], markupPercent: 50 },
      },
    }
    expect(() => store.getState().schedulePricingRules({ ...pricingPlaceholders, rushPercent: 101 }, '2026-11-07T00:00:00.000Z', 'Test', now))
      .toThrow(/Rush percent/)
    // Less than 10 minutes ahead would let one system charge new prices before the other has synced.
    expect(() => store.getState().schedulePricingRules(higherMarkup, '2026-11-06T05:05:00.000Z', 'Test', now))
      .toThrow(/at least 10 minutes/)
    expect(() => store.getState().schedulePricingRules(pricingPlaceholders, '2026-11-07T00:00:00.000Z', 'Test', now))
      .toThrow(/same as the ones in effect/)

    store.getState().schedulePricingRules(higherMarkup, '2026-11-06T05:15:00.000Z', 'Test', now)
    expect(productPriceList(store.getState().pricingRules)['Custom T-Shirt']).toBe(350)
    store.getState().cancelScheduledPricing()
    expect(store.getState().scheduledPricing).toBeNull()
    expect(() => store.getState().cancelScheduledPricing()).toThrow(/no scheduled/)

    store.getState().schedulePricingRules(higherMarkup, '2026-11-06T05:15:00.000Z', 'Test', now)
    store.getState().applyDuePricingChange('2026-11-06T05:15:00.000Z')
    expect(productPriceList(store.getState().pricingRules)['Custom T-Shirt']).toBe(375)
  })

  it('marks a Quality Control order ready, then claiming a fully paid order completes it with commission', () => {
    expect(() => store.getState().claimOrder('NPS-20261103-001')).toThrow(/not ready/)
    expect(() => store.getState().markOrderReady('NPS-20261106-002')).toThrow(/Quality Control/)
    store.setState(state => ({
      orders: state.orders.map(order => order.id === 'NPS-20261103-001'
        ? { ...order, amountPaid: order.salePrice }
        : order),
    }))
    store.getState().markOrderReady('NPS-20261103-001', '2026-11-06T13:00:00.000Z')
    const count = store.getState().commissionPayouts.length
    store.getState().claimOrder('NPS-20261103-001', '2026-11-06T14:00:00.000Z')
    expect(store.getState().orders.find(order => order.id === 'NPS-20261103-001')).toMatchObject({
      readyAt: '2026-11-06T13:00:00.000Z',
      claimed: true,
      completedAt: '2026-11-06T14:00:00.000Z',
    })
    expect(store.getState().commissionPayouts).toHaveLength(count + 1)
    expect(store.getState().commissionPayouts[store.getState().commissionPayouts.length - 1]).toMatchObject({
      orderId: 'NPS-20261103-001',
      amount: 160,
      status: 'Unpaid',
      postedAt: '2026-11-06T14:00:00.000Z',
    })
  })

  it('completes a claimed order when it becomes fully paid and adds points by NPC number', () => {
    store.setState(state => ({
      orders: state.orders.map(order => order.id === 'NPS-20261106-001'
        ? { ...order, stage: 'Quality Control', readyAt: '2026-11-06T12:00:00.000Z', claimed: true }
        : order),
    }))
    const count = store.getState().commissionPayouts.length
    store.getState().recordOrderPayment('NPS-20261106-001', 1050, '2026-11-06T15:00:00.000Z')
    expect(store.getState().orders.find(order => order.id === 'NPS-20261106-001')?.completedAt)
      .toBe('2026-11-06T15:00:00.000Z')
    expect(store.getState().commissionPayouts).toHaveLength(count + 1)
    expect(store.getState().commissionPayouts[store.getState().commissionPayouts.length - 1]).toMatchObject({
      orderId: 'NPS-20261106-001',
      amount: 100,
    })
    // ₱1,050 → ₱2,100 paid crosses one more ₱1,000 mark, added to the existing 12 points.
    expect(store.getState().members.find(member => member.npcNumber === 'NPC-P-000101')?.points).toBe(13)
  })

  it('does not credit points to a member who merely shares the customer name', () => {
    store.setState(state => ({
      members: [...state.members, { npcNumber: 'NPC-B-000999', name: 'Bea Navarro', tier: 'Bronze', points: 0, openingPoints: 0, joinedAt: '2026-01-01' }],
    }))
    store.getState().recordOrderPayment('NPS-20261103-001', 1400, '2026-11-06T15:00:00.000Z')
    expect(store.getState().members.find(member => member.npcNumber === 'NPC-B-000999')?.points).toBe(0)
  })

  it('replaces data saved by an older version with fresh seed data', async () => {
    const storage = createMemoryStorage()
    storage.setItem('neroconnect-admin-store', JSON.stringify({ state: { orders: [], viewAs: 'Admin' }, version: 0 }))
    const migratedStore = createAdminStore(storage)
    await migratedStore.persist.rehydrate()
    expect(migratedStore.getState().orders).toHaveLength(seedData.orders.length)
  })

  it('persists actions and resets all demo data', () => {
    const storage = createMemoryStorage()
    const persistentStore = createAdminStore(storage)
    persistentStore.getState().setViewAs('employee:EMP-001')
    persistentStore.getState().markNotificationRead('deadline:EMP-001:ORDER-1:2026-11-06')
    persistentStore.getState().markAllNotificationsRead(['assignment:EMP-001:ASSIGN-1'])
    persistentStore.getState().correctMemberTier('NPC-P-000101', 'Silver', '2026-11-06T16:00:00.000Z')
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

  it('creates, edits, deactivates, and reactivates users with module permissions', () => {
    const id = store.getState().createUser({
      ...emptyUserInput(),
      name: 'Carla Diaz',
      email: 'carla@neroconnect.local',
      contactNumber: '0917 555 0111',
      tags: ['Production'],
      team: 'Team A',
      schedule: ['Monday'],
      permissions: defaultPermissions('Employee', ['Production']),
    }, '2026-11-06T08:00:00.000Z')
    let user = store.getState().employees.find(item => item.id === id)!
    expect(user).toMatchObject({ status: 'Pending' })
    expect(resolveAccount(user).tags).toEqual(['Production'])

    const input = userInputFromEmployee(user)
    store.getState().updateUser(id, {
      ...input,
      tags: ['Sales'],
      permissions: { ...input.permissions, 'reports-analytics': 'view' },
    }, '2026-11-07T08:00:00.000Z')
    user = store.getState().employees.find(item => item.id === id)!
    expect(isSalesPerson(user)).toBe(true)
    expect(resolveAccount(user)).toMatchObject({ updatedAt: '2026-11-07T08:00:00.000Z' })
    expect(resolveAccount(user).permissions['reports-analytics']).toBe('view')

    store.getState().deactivateUser(id)
    expect(store.getState().employees.find(item => item.id === id)?.status).toBe('Inactive')
    expect(() => store.getState().deactivateUser(id)).toThrow('already inactive')
    store.getState().reactivateUser(id)
    expect(store.getState().employees.find(item => item.id === id)?.status).toBe('Active')
  })

  it('protects the last active Admin', () => {
    const admin = store.getState().employees.find(item => resolveAccount(item).accountRole === 'Admin')!
    expect(() => store.getState().deactivateUser(admin.id)).toThrow('only active Admin')
    expect(() => store.getState().updateUser(admin.id, { ...userInputFromEmployee(admin), accountRole: 'Employee' }))
      .toThrow('only active Admin')
  })

  it('seeds every employee with an account and admins with full access', () => {
    for (const employee of store.getState().employees) {
      expect(employee.account?.email).toMatch(/@/)
    }
    const admin = store.getState().employees.find(item => resolveAccount(item).accountRole === 'Admin')!
    expect(Object.values(resolveAccount(admin).permissions)).toEqual(Array(12).fill('edit'))
  })
})
