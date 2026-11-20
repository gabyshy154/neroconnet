import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { DEMO_TODAY, reorderTargetStock } from '../config'
import { seedData } from '../data/seed'
import {
  addInventory,
  createCommissionPayout,
  deductInventory,
  generateRecommendations,
  isFullyPaid,
  pointsEarnedFromPayment,
  upgradeTierForPoints,
  removeInventory,
  validatePricingRules,
  type MaterialRequirement,
} from '../lib/admin'
import { buildPricingSuggestions, describePricingChanges, validateEffectiveAt } from '../lib/pricing'
import { buildUserRecord, isActiveAdmin, validateUserInput, type UserInput } from '../lib/userAccess'
import type {
  AdminOrder,
  CommissionPayout,
  Customer,
  DesignSubmission,
  Employee,
  InventoryMovement,
  Material,
  Member,
  MembershipPointsAdjustment,
  MembershipTierCorrection,
  OrderAssignmentEvent,
  PricingHistoryEntry,
  PricingRules,
  Recommendation,
  ScheduledPricingChange,
  Tier,
  ViewAs,
} from '../types'

const STORAGE_KEY = 'neroconnect-admin-store'
// Bump when the stored data shape changes; older saved data is replaced by fresh seed data.
const STORAGE_VERSION = 9

export interface AdminStoreData {
  materials: Material[]
  inventoryMovements: InventoryMovement[]
  employees: Employee[]
  customers: Customer[]
  orders: AdminOrder[]
  designSubmissions: DesignSubmission[]
  members: Member[]
  commissionPayouts: CommissionPayout[]
  pricingRules: PricingRules
  scheduledPricing: ScheduledPricingChange | null
  pricingHistory: PricingHistoryEntry[]
  recommendations: Recommendation[]
  membershipTierCorrections: MembershipTierCorrection[]
  membershipPointsAdjustments: MembershipPointsAdjustment[]
  releasedOrderIds: string[]
  viewAs: ViewAs
  readNotificationIds: string[]
  assignmentEvents: OrderAssignmentEvent[]
}

export interface StockMovementInput {
  materialId: string
  type: 'In' | 'Out'
  qty: number
  reason: string
  /** QR Code / Number, such as a supplier delivery receipt number. */
  reference?: string
}

export interface AdminStore extends AdminStoreData {
  releaseOrderForProduction: (orderId: string, requirements: MaterialRequirement[], at?: string) => void
  markOrderReady: (orderId: string, at?: string) => void
  /** Recommendations are alerts only; this records that the admin has seen one. */
  markRecommendationReviewed: (recommendationId: string, at?: string) => void
  regenerateRecommendations: () => void
  recordStockMovement: (input: StockMovementInput, at?: string) => void
  approveDesign: (submissionId: string) => void
  requestDesignRevision: (submissionId: string, note: string) => void
  markCommissionPaid: (payoutId: string, at?: string) => void
  correctMemberTier: (npcNumber: string, tier: Tier, at?: string) => void
  adjustMemberPoints: (npcNumber: string, points: number, reason: string, at?: string) => void
  activateEmployee: (employeeId: string) => void
  createUser: (input: UserInput, at?: string) => string
  updateUser: (employeeId: string, input: UserInput, at?: string) => void
  deactivateUser: (employeeId: string, at?: string) => void
  reactivateUser: (employeeId: string, at?: string) => void
  /** Deactivates a portal customer's login, e.g. on a data-privacy request. Records stay for retention. */
  deactivateCustomer: (customerId: string, reason: string, at?: string) => void
  reactivateCustomer: (customerId: string, reason: string, at?: string) => void
  /** Blocks a walk-in customer's record on a data-privacy request (Data Privacy Act: erasure, blocking, objection). */
  blockCustomer: (customerId: string, reason: string, at?: string) => void
  unblockCustomer: (customerId: string, reason: string, at?: string) => void
  /** Fig 7 step 2: assigns the production team. The order's deadline is its schedule (TASKS.due_date). */
  assignOrderTeam: (orderId: string, teamId: string) => void
  schedulePricingRules: (rules: PricingRules, effectiveAt: string, source?: string, now?: string) => void
  cancelScheduledPricing: () => void
  /** Applies the scheduled price change once its effective time has passed. Returns true if applied. */
  applyDuePricingChange: (now?: string) => boolean
  setViewAs: (viewAs: ViewAs) => void
  markNotificationRead: (notificationId: string) => void
  markAllNotificationsRead: (notificationIds: readonly string[]) => void
  claimOrder: (orderId: string, at?: string) => void
  recordOrderPayment: (orderId: string, amount: number, at?: string) => void
  resetDemoData: () => void
}

function cloneSeedData(): AdminStoreData {
  return {
    ...structuredClone(seedData),
    viewAs: 'Admin',
    readNotificationIds: [],
    assignmentEvents: [],
  }
}

function requireById<T extends { id: string }>(
  rows: readonly T[],
  id: string,
  entity: string,
): T {
  const row = rows.find(item => item.id === id)
  if (!row) {
    throw new Error(`${entity} "${id}" was not found.`)
  }
  return row
}

function nextId(existing: readonly { id: string }[], prefix: string): string {
  const ids = new Set(existing.map(item => item.id))
  let index = 1
  while (ids.has(`${prefix}-${index}`)) {
    index += 1
  }
  return `${prefix}-${index}`
}

function requireTimestamp(at: string, action: string): void {
  if (!at.trim()) {
    throw new Error(`A timestamp is required to ${action}.`)
  }
}

export function createAdminStore(storage?: StateStorage) {
  const initialData = cloneSeedData()
  const persistOptions = {
    name: STORAGE_KEY,
    version: STORAGE_VERSION,
    migrate: (persisted: unknown, version: number): AdminStoreData =>
      version < STORAGE_VERSION ? cloneSeedData() : persisted as AdminStoreData,
    partialize: (state: AdminStore): AdminStoreData => ({
      materials: state.materials,
      inventoryMovements: state.inventoryMovements,
      employees: state.employees,
      customers: state.customers,
      orders: state.orders,
      designSubmissions: state.designSubmissions,
      members: state.members,
      commissionPayouts: state.commissionPayouts,
      pricingRules: state.pricingRules,
      scheduledPricing: state.scheduledPricing,
      pricingHistory: state.pricingHistory,
      recommendations: state.recommendations,
            membershipTierCorrections: state.membershipTierCorrections,
      membershipPointsAdjustments: state.membershipPointsAdjustments,
      releasedOrderIds: state.releasedOrderIds,
      viewAs: state.viewAs,
      readNotificationIds: state.readNotificationIds,
      assignmentEvents: state.assignmentEvents,
    }),
    storage: createJSONStorage(() => storage ?? localStorage),
  }

  return create<AdminStore>()(persist((set, get) => ({
    ...initialData,

    // BR-07: stock is deducted only when an order is approved and released for production,
    // which needs an approved design (BR-03) and a recorded downpayment.
    releaseOrderForProduction: (orderId, requirements, at = new Date().toISOString()) => {
      const state = get()
      const order = requireById(state.orders, orderId, 'Order')
      if (state.releasedOrderIds.includes(orderId)) {
        throw new Error(`Order "${orderId}" has already been released for production.`)
      }
      const designs = state.designSubmissions.filter(design => design.orderRef === orderId)
      if (designs.some(design => design.status !== 'Approved')) {
        throw new Error(`The design for "${orderId}" must be approved before the order is released for production.`)
      }
      if (order.amountPaid <= 0) {
        throw new Error(`Record the downpayment for "${orderId}" before releasing it for production.`)
      }
      if (requirements.length === 0) {
        throw new Error('At least one material requirement is needed to release an order.')
      }
      const update = deductInventory(
        state.materials,
        requirements,
        state.inventoryMovements,
        orderId,
        at,
        `MOV-${orderId}`,
      )
      set({
        materials: update.materials,
        inventoryMovements: update.movements,
        releasedOrderIds: [...state.releasedOrderIds, orderId],
        orders: state.orders.map(item =>
          item.id === orderId && !item.stage ? { ...item, stage: 'Cutting' } : item,
        ),
      })
    },

    // REQ-4.11-06: after Quality Control the order is Ready for Pickup or Ready for Delivery.
    markOrderReady: (orderId, at = new Date().toISOString()) => {
      const state = get()
      const order = requireById(state.orders, orderId, 'Order')
      if (order.stage !== 'Quality Control') {
        throw new Error('Only orders in Quality Control can be marked ready.')
      }
      if (order.readyAt) {
        throw new Error(`Order "${orderId}" is already ready for claim.`)
      }
      requireTimestamp(at, 'mark an order ready')
      set({
        orders: state.orders.map(item => item.id === orderId ? { ...item, readyAt: at } : item),
      })
    },

    // Recommendations are alerts (BR-11): they never change stock or prices. The admin reads them,
    // acts if they agree (records the delivery in Inventory, or edits Pricing Rules), and marks
    // the alert as reviewed.
    markRecommendationReviewed: (recommendationId, at = new Date().toISOString()) => {
      const state = get()
      const recommendation = requireById(state.recommendations, recommendationId, 'Recommendation')
      if (recommendation.status !== 'Pending') {
        throw new Error(`Recommendation "${recommendationId}" has already been reviewed.`)
      }
      requireTimestamp(at, 'review a recommendation')
      set({
        recommendations: state.recommendations.map(item =>
          item.id === recommendationId ? { ...item, status: 'Reviewed', reviewedAt: at } : item,
        ),
      })
    },

    regenerateRecommendations: () => {
      const state = get()
      const pending = state.recommendations.filter(item => item.status === 'Pending')
      const generated = generateRecommendations({
        materials: state.materials,
        movements: state.inventoryMovements,
                targetStock: reorderTargetStock,
        pricingSuggestions: buildPricingSuggestions(state.pricingRules, state.orders),
        idPrefix: `REC-GEN-${state.recommendations.length + 1}`,
      }).filter(item => !pending.some(existing =>
        existing.kind === item.kind && existing.subject === item.subject,
      ))
      set({ recommendations: [...state.recommendations, ...generated] })
    },

    recordStockMovement: (input, at = new Date().toISOString()) => {
      const state = get()
      const id = nextId(state.inventoryMovements, 'MOV-MANUAL')
      const update = input.type === 'In'
        ? addInventory(state.materials, state.inventoryMovements, input.materialId, input.qty, input.reason, at, id, input.reference)
        : removeInventory(state.materials, state.inventoryMovements, input.materialId, input.qty, input.reason, at, id, input.reference)
      set({ materials: update.materials, inventoryMovements: update.movements })
    },

    approveDesign: submissionId => {
      const state = get()
      const submission = requireById(state.designSubmissions, submissionId, 'Design submission')
      if (submission.status !== 'Under Review') {
        throw new Error('Only designs under review can be approved.')
      }
      set({
        designSubmissions: state.designSubmissions.map(item =>
          item.id === submissionId ? { ...item, status: 'Approved' } : item,
        ),
      })
    },

    requestDesignRevision: (submissionId, note) => {
      const state = get()
      const submission = requireById(state.designSubmissions, submissionId, 'Design submission')
      if (submission.status !== 'Under Review') {
        throw new Error('A revision can only be requested for a design under review.')
      }
      if (!note.trim()) {
        throw new Error('A revision note is required.')
      }
      set({
        designSubmissions: state.designSubmissions.map(item =>
          item.id === submissionId
            ? { ...item, status: 'Revision Required', note: note.trim() }
            : item,
        ),
      })
    },

    markCommissionPaid: (payoutId, at = new Date().toISOString()) => {
      const state = get()
      const payout = requireById(state.commissionPayouts, payoutId, 'Commission payout')
      if (payout.status === 'Paid') {
        throw new Error(`Commission payout "${payoutId}" is already paid.`)
      }
      requireTimestamp(at, 'mark a commission paid')
      set({
        commissionPayouts: state.commissionPayouts.map(item =>
          item.id === payoutId ? { ...item, status: 'Paid', paidAt: at } : item,
        ),
      })
    },

    correctMemberTier: (npcNumber, tier, at = new Date().toISOString()) => {
      const state = get()
      const member = state.members.find(item => item.npcNumber === npcNumber)
      if (!member) {
        throw new Error(`Member "${npcNumber}" was not found.`)
      }
      if (member.tier === tier) {
        throw new Error('The member already has that tier.')
      }
      requireTimestamp(at, 'correct a tier')
      const correction: MembershipTierCorrection = {
        id: `TIER-${state.membershipTierCorrections.length + 1}`,
        npcNumber,
        fromTier: member.tier,
        toTier: tier,
        reason: 'Manual correction',
        at,
      }
      set({
        members: state.members.map(item =>
          item.npcNumber === npcNumber ? { ...item, tier } : item,
        ),
        membershipTierCorrections: [...state.membershipTierCorrections, correction],
      })
    },

    // REQ-4.8-08: administrators manage reward points, with every change logged.
    adjustMemberPoints: (npcNumber, points, reason, at = new Date().toISOString()) => {
      const state = get()
      const member = state.members.find(item => item.npcNumber === npcNumber)
      if (!member) {
        throw new Error(`Member "${npcNumber}" was not found.`)
      }
      if (!Number.isInteger(points) || points < 0) {
        throw new RangeError('Points must be a whole number greater than or equal to zero.')
      }
      if (points === member.points) {
        throw new Error('The member already has that points balance.')
      }
      if (!reason.trim()) {
        throw new Error('A reason is required for a points adjustment.')
      }
      requireTimestamp(at, 'adjust points')
      set({
        ...withPoints(state, member, points, at),
        membershipPointsAdjustments: [...state.membershipPointsAdjustments, {
          id: `POINTS-${state.membershipPointsAdjustments.length + 1}`,
          npcNumber,
          fromPoints: member.points,
          toPoints: points,
          reason: reason.trim(),
          at,
        }],
      })
    },

    activateEmployee: employeeId => {
      const state = get()
      const employee = requireById(state.employees, employeeId, 'Employee')
      if (employee.status !== 'Pending') {
        throw new Error('Only pending employees can be activated.')
      }
      set({
        employees: state.employees.map(item =>
          item.id === employeeId ? { ...item, status: 'Active' } : item,
        ),
      })
    },

    createUser: (input, at = new Date().toISOString()) => {
      const state = get()
      const errors = validateUserInput(input, state.employees)
      if (errors.length > 0) {
        throw new Error(errors.join(' '))
      }
      const id = nextEmployeeId(state.employees)
      set({ employees: [...state.employees, buildUserRecord(id, input, at)] })
      return id
    },

    updateUser: (employeeId, input, at = new Date().toISOString()) => {
      const state = get()
      const previous = requireById(state.employees, employeeId, 'User')
      const errors = validateUserInput(input, state.employees, employeeId)
      if (errors.length > 0) {
        throw new Error(errors.join(' '))
      }
      if (isActiveAdmin(previous) && input.accountRole !== 'Admin'
        && state.employees.filter(isActiveAdmin).length === 1) {
        throw new Error('This is the only active Admin. Assign another Admin before changing this role.')
      }
      const updated = buildUserRecord(employeeId, input, at, previous)
      set({ employees: state.employees.map(item => item.id === employeeId ? updated : item) })
    },

    deactivateUser: (employeeId, at = new Date().toISOString()) => {
      const state = get()
      const user = requireById(state.employees, employeeId, 'User')
      if (user.status === 'Inactive') {
        throw new Error(`${user.name} is already inactive.`)
      }
      if (isActiveAdmin(user) && state.employees.filter(isActiveAdmin).length === 1) {
        throw new Error('The only active Admin cannot be deactivated.')
      }
      set({
        employees: state.employees.map(item => item.id === employeeId
          ? { ...item, status: 'Inactive', account: item.account && { ...item.account, updatedAt: at } }
          : item),
      })
    },

    reactivateUser: (employeeId, at = new Date().toISOString()) => {
      const state = get()
      const user = requireById(state.employees, employeeId, 'User')
      if (user.status !== 'Inactive') {
        throw new Error(`${user.name} is not inactive.`)
      }
      set({
        employees: state.employees.map(item => item.id === employeeId
          ? { ...item, status: 'Active', account: item.account && { ...item.account, updatedAt: at } }
          : item),
      })
    },

    deactivateCustomer: (customerId, reason, at = new Date().toISOString()) => {
      const state = get()
      const customer = requireById(state.customers, customerId, 'Customer')
      if (customer.type !== 'Portal account') {
        throw new Error('Walk-in customers have no portal login to deactivate.')
      }
      if (customer.status === 'Deactivated') {
        throw new Error(`${customer.name}'s account is already deactivated.`)
      }
      if (!reason.trim()) {
        throw new Error('A reason is required to deactivate a customer account.')
      }
      requireTimestamp(at, 'deactivate a customer account')
      set({
        customers: state.customers.map(item => item.id === customerId
          ? { ...item, status: 'Deactivated', accountLog: [...item.accountLog, { action: 'Deactivated', reason: reason.trim(), at }] }
          : item),
      })
    },

    reactivateCustomer: (customerId, reason, at = new Date().toISOString()) => {
      const state = get()
      const customer = requireById(state.customers, customerId, 'Customer')
      if (customer.status !== 'Deactivated') {
        throw new Error(`${customer.name}'s account is not deactivated.`)
      }
      if (!reason.trim()) {
        throw new Error('A reason is required to reactivate a customer account.')
      }
      requireTimestamp(at, 'reactivate a customer account')
      set({
        customers: state.customers.map(item => item.id === customerId
          ? { ...item, status: 'Active', accountLog: [...item.accountLog, { action: 'Reactivated', reason: reason.trim(), at }] }
          : item),
      })
    },

    // Walk-in customers have no login to deactivate, so a data-privacy request blocks the record
    // itself: it is kept for the retention period but not used for new orders or NPC lookups.
    blockCustomer: (customerId, reason, at = new Date().toISOString()) => {
      const state = get()
      const customer = requireById(state.customers, customerId, 'Customer')
      if (customer.type !== 'Walk-in') {
        throw new Error('Portal accounts are deactivated, not blocked.')
      }
      if (customer.status === 'Blocked') {
        throw new Error(`${customer.name} is already blocked.`)
      }
      if (!reason.trim()) {
        throw new Error('A reason is required to block a customer.')
      }
      requireTimestamp(at, 'block a customer')
      set({
        customers: state.customers.map(item => item.id === customerId
          ? { ...item, status: 'Blocked', accountLog: [...item.accountLog, { action: 'Blocked', reason: reason.trim(), at }] }
          : item),
      })
    },

    unblockCustomer: (customerId, reason, at = new Date().toISOString()) => {
      const state = get()
      const customer = requireById(state.customers, customerId, 'Customer')
      if (customer.status !== 'Blocked') {
        throw new Error(`${customer.name} is not blocked.`)
      }
      if (!reason.trim()) {
        throw new Error('A reason is required to unblock a customer.')
      }
      requireTimestamp(at, 'unblock a customer')
      set({
        customers: state.customers.map(item => item.id === customerId
          ? { ...item, status: 'Active', accountLog: [...item.accountLog, { action: 'Unblocked', reason: reason.trim(), at }] }
          : item),
      })
    },

    assignOrderTeam: (orderId, teamId, at = `${DEMO_TODAY}T00:00:00.000Z`) => {
      const state = get()
      const order = requireById(state.orders, orderId, 'Order')
      if (!teamId.trim()) {
        throw new Error('Select a production team.')
      }
      if (!order.stage) {
        throw new Error('Only active production orders can be assigned.')
      }
      const normalizedTeam = teamId.trim()
      if (order.teamId === normalizedTeam) {
        throw new Error(`${orderId} is already assigned to ${normalizedTeam}.`)
      }
      set({
        orders: state.orders.map(item =>
          item.id === orderId ? { ...item, teamId: normalizedTeam } : item,
        ),
        assignmentEvents: [...state.assignmentEvents, {
          id: `ASSIGN-${orderId}-${state.assignmentEvents.length + 1}`,
          orderId,
          teamId: normalizedTeam,
          at,
        }],
      })
    },

    // Price changes never apply immediately: they take effect at a scheduled time, so
    // quotations and orders already in progress keep the price they were created with,
    // and both systems have synced the new rules before they apply.
    schedulePricingRules: (rules, effectiveAt, source = 'Pricing Rules', now = new Date().toISOString()) => {
      const validationErrors = validatePricingRules(rules)
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(' '))
      }
      validateEffectiveAt(effectiveAt, now)
      const state = get()
      if (describePricingChanges(state.pricingRules, rules).length === 0) {
        throw new Error('These pricing rules are the same as the ones in effect. Change a value first.')
      }
      set({
        scheduledPricing: {
          id: state.scheduledPricing?.id ?? nextId(state.pricingHistory, 'PRICE'),
          rules: structuredClone(rules),
          effectiveAt: new Date(effectiveAt).toISOString(),
          scheduledAt: now,
          source,
        },
      })
    },

    cancelScheduledPricing: () => {
      if (!get().scheduledPricing) {
        throw new Error('There is no scheduled price change to cancel.')
      }
      set({ scheduledPricing: null })
    },

    applyDuePricingChange: (now = new Date().toISOString()) => {
      const state = get()
      const scheduled = state.scheduledPricing
      if (!scheduled || Date.parse(scheduled.effectiveAt) > Date.parse(now)) {
        return false
      }
      set({
        pricingRules: scheduled.rules,
        scheduledPricing: null,
        pricingHistory: [...state.pricingHistory, {
          id: scheduled.id,
          effectiveAt: scheduled.effectiveAt,
          scheduledAt: scheduled.scheduledAt,
          source: scheduled.source,
          changes: describePricingChanges(state.pricingRules, scheduled.rules),
        }],
      })
      return true
    },

    setViewAs: viewAs => {
      if (viewAs !== 'Admin') {
        const employeeId = viewAs.slice('employee:'.length)
        requireById(get().employees, employeeId, 'Employee')
      }
      set({ viewAs })
    },

    markNotificationRead: notificationId => {
      if (!notificationId.trim()) {
        throw new Error('A notification ID is required.')
      }
      const readNotificationIds = get().readNotificationIds
      if (!readNotificationIds.includes(notificationId)) {
        set({ readNotificationIds: [...readNotificationIds, notificationId] })
      }
    },

    markAllNotificationsRead: notificationIds => {
      const readNotificationIds = new Set(get().readNotificationIds)
      for (const notificationId of notificationIds) {
        if (notificationId.trim()) {
          readNotificationIds.add(notificationId)
        }
      }
      set({ readNotificationIds: [...readNotificationIds] })
    },

    claimOrder: (orderId, at = new Date().toISOString()) => {
      const state = get()
      const order = requireById(state.orders, orderId, 'Order')
      if (order.claimed) {
        throw new Error(`Order "${orderId}" is already claimed.`)
      }
      if (!order.readyAt) {
        throw new Error(`Order "${orderId}" is not ready for pickup or delivery yet.`)
      }
      const claimedOrder: AdminOrder = {
        ...order,
        claimed: true,
        ...(isFullyPaid(order) ? { completedAt: at } : {}),
      }
      const payout = createCommissionPayout(claimedOrder, at)
      set({
        orders: state.orders.map(item => item.id === orderId ? claimedOrder : item),
        commissionPayouts: payout
          ? [...state.commissionPayouts, payout]
          : state.commissionPayouts,
      })
    },

    recordOrderPayment: (orderId, amount, at = new Date().toISOString()) => {
      const state = get()
      const order = requireById(state.orders, orderId, 'Order')
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new RangeError('Payment amount must be a finite number greater than zero.')
      }
      requireTimestamp(at, 'record a payment')
      const amountPaid = order.amountPaid + amount
      const paidOrder: AdminOrder = {
        ...order,
        amountPaid,
        ...(order.claimed && !order.completedAt && amountPaid >= order.salePrice ? { completedAt: at } : {}),
      }
      const payout = createCommissionPayout(paidOrder, at)
      const alreadyHasPayout = state.commissionPayouts.some(item => item.orderId === orderId)
      // Points follow the order's NPC number, never the customer's name.
      const earned = order.npcNumber ? pointsEarnedFromPayment(order.amountPaid, amountPaid) : 0
      const member = earned > 0 ? state.members.find(item => item.npcNumber === order.npcNumber) : undefined
      set({
        orders: state.orders.map(item => item.id === orderId ? paidOrder : item),
        commissionPayouts: payout && !alreadyHasPayout
          ? [...state.commissionPayouts, payout]
          : state.commissionPayouts,
        ...(member ? withPoints(state, member, member.points + earned, at) : {}),
      })
    },

    resetDemoData: () => set(cloneSeedData()),
  }), persistOptions))
}

/**
 * Sets a member's points and, when they reach a higher tier's threshold, upgrades the tier
 * and logs it (REQ-4.8-06). Tiers never drop automatically.
 */
function withPoints(
  state: Pick<AdminStoreData, 'members' | 'membershipTierCorrections'>,
  member: Member,
  points: number,
  at: string,
): Pick<AdminStoreData, 'members' | 'membershipTierCorrections'> {
  const updated = { ...member, points }
  const upgradeTo = upgradeTierForPoints(updated)
  return {
    members: state.members.map(item =>
      item.npcNumber === member.npcNumber ? { ...updated, tier: upgradeTo ?? member.tier } : item,
    ),
    membershipTierCorrections: upgradeTo
      ? [...state.membershipTierCorrections, {
          id: `TIER-${state.membershipTierCorrections.length + 1}`,
          npcNumber: member.npcNumber,
          fromTier: member.tier,
          toTier: upgradeTo,
          reason: 'Points threshold reached',
          at,
        }]
      : state.membershipTierCorrections,
  }
}

function nextEmployeeId(employees: readonly Employee[]): string {
  const existingIds = new Set(employees.map(employee => employee.id))
  let index = employees.length + 1
  let id = `EMP-${String(index).padStart(3, '0')}`
  while (existingIds.has(id)) {
    index += 1
    id = `EMP-${String(index).padStart(3, '0')}`
  }
  return id
}

export const useAdminStore = createAdminStore()
