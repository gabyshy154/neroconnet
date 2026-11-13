import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { DEMO_TODAY, reorderTargetStock } from '../config'
import { seedData } from '../data/seed'
import {
  calculateMembershipPoints,
  createCommissionPayout,
  createEmployee as buildEmployee,
  deductInventory,
  generateRecommendations,
  validatePricingRules,
  validateEmployeeInput,
  type EmployeeInput,
  type MaterialRequirement,
  type PricingSuggestionInput,
} from '../lib/admin'
import type {
  AdminOrder,
  CommissionPayout,
  DesignSubmission,
  Employee,
  InventoryMovement,
  Material,
  Member,
  MembershipTierCorrection,
  PricingRules,
  Recommendation,
  Tier,
  ViewAs,
  OrderAssignmentEvent,
} from '../types'

const STORAGE_KEY = 'neroconnect-admin-store'

export interface AdminStoreData {
  materials: Material[]
  inventoryMovements: InventoryMovement[]
  employees: Employee[]
  orders: AdminOrder[]
  designSubmissions: DesignSubmission[]
  members: Member[]
  commissionPayouts: CommissionPayout[]
  pricingRules: PricingRules
  recommendations: Recommendation[]
  membershipTierCorrections: MembershipTierCorrection[]
  confirmedOrderIds: string[]
  viewAs: ViewAs
  readNotificationIds: string[]
  assignmentEvents: OrderAssignmentEvent[]
}

export interface AdminStore extends AdminStoreData {
  confirmOrder: (orderId: string, requirements: MaterialRequirement[], at?: string) => void
  approveRecommendation: (recommendationId: string, at?: string) => void
  rejectRecommendation: (recommendationId: string) => void
  regenerateRecommendations: () => void
  approveDesign: (submissionId: string) => void
  requestDesignRevision: (submissionId: string, note: string) => void
  markCommissionPaid: (payoutId: string, at?: string) => void
  correctMemberTier: (npcNumber: string, tier: Tier, at?: string) => void
  createEmployee: (input: EmployeeInput) => void
  activateEmployee: (employeeId: string) => void
  assignOrderTeamAndSchedule: (orderId: string, teamId: string, scheduleStart: string) => void
  updatePricingRules: (rules: PricingRules) => void
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

function nextMovementId(movements: readonly InventoryMovement[], prefix: string): string {
  const existing = new Set(movements.map(movement => movement.id))
  let index = 1
  while (existing.has(`${prefix}-${index}`)) {
    index += 1
  }
  return `${prefix}-${index}`
}

export function createAdminStore(storage?: StateStorage) {
  const initialData = cloneSeedData()
  const persistOptions = {
    name: STORAGE_KEY,
    partialize: (state: AdminStore): AdminStoreData => ({
      materials: state.materials,
      inventoryMovements: state.inventoryMovements,
      employees: state.employees,
      orders: state.orders,
      designSubmissions: state.designSubmissions,
      members: state.members,
      commissionPayouts: state.commissionPayouts,
      pricingRules: state.pricingRules,
      recommendations: state.recommendations,
      membershipTierCorrections: state.membershipTierCorrections,
      confirmedOrderIds: state.confirmedOrderIds,
      viewAs: state.viewAs,
      readNotificationIds: state.readNotificationIds,
      assignmentEvents: state.assignmentEvents,
    }),
    storage: createJSONStorage(() => storage ?? localStorage),
  }

  return create<AdminStore>()(persist((set, get) => ({
    ...initialData,

    confirmOrder: (orderId, requirements, at = new Date().toISOString()) => {
      const state = get()
      requireById(state.orders, orderId, 'Order')
      if (state.confirmedOrderIds.includes(orderId)) {
        throw new Error(`Order "${orderId}" has already been confirmed.`)
      }
      if (requirements.length === 0) {
        throw new Error('At least one material requirement is needed to confirm an order.')
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
        confirmedOrderIds: [...state.confirmedOrderIds, orderId],
      })
    },

    approveRecommendation: (recommendationId, at = new Date().toISOString()) => {
      const state = get()
      const recommendation = requireById(state.recommendations, recommendationId, 'Recommendation')
      if (recommendation.status !== 'Pending') {
        throw new Error(`Recommendation "${recommendationId}" has already been reviewed.`)
      }

      let pricingRules = state.pricingRules
      let inventoryMovements = state.inventoryMovements
      if (recommendation.kind === 'Pricing') {
        if (!recommendation.pricingUpdate) {
          throw new Error(`Pricing recommendation "${recommendationId}" has no pricing update.`)
        }
        pricingRules = {
          ...state.pricingRules,
          productPrices: {
            ...state.pricingRules.productPrices,
            [recommendation.pricingUpdate.product]: recommendation.pricingUpdate.price,
          },
        }
        const validationErrors = validatePricingRules(pricingRules)
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(' '))
        }
      } else {
        if (!recommendation.materialId || !Number.isFinite(recommendation.reorderQty) || recommendation.reorderQty! <= 0) {
          throw new Error(`Reorder recommendation "${recommendationId}" has invalid reorder details.`)
        }
        if (!at.trim()) {
          throw new Error('A timestamp is required to approve a reorder.')
        }
        const material = requireById(state.materials, recommendation.materialId, 'Material')
        inventoryMovements = [
          ...state.inventoryMovements,
          {
            id: nextMovementId(state.inventoryMovements, `MOV-${recommendationId}`),
            materialId: material.id,
            type: 'In',
            qty: recommendation.reorderQty!,
            reason: `Pending purchase (mock) — ${recommendation.subject}`,
            at,
          },
        ]
      }

      set({
        pricingRules,
        inventoryMovements,
        recommendations: state.recommendations.map(item =>
          item.id === recommendationId ? { ...item, status: 'Approved' } : item,
        ),
      })
    },

    rejectRecommendation: recommendationId => {
      const state = get()
      const recommendation = requireById(state.recommendations, recommendationId, 'Recommendation')
      if (recommendation.status !== 'Pending') {
        throw new Error(`Recommendation "${recommendationId}" has already been reviewed.`)
      }
      set({
        recommendations: state.recommendations.map(item =>
          item.id === recommendationId ? { ...item, status: 'Rejected' } : item,
        ),
      })
    },

    regenerateRecommendations: () => {
      const state = get()
      const pricingSuggestions: PricingSuggestionInput[] = state.recommendations
        .filter(item => item.kind === 'Pricing' && item.pricingUpdate)
        .map(item => {
          const update = item.pricingUpdate!
          return {
            product: update.product,
            currentPrice: state.pricingRules.productPrices[update.product] ?? update.price,
            suggestedPrice: update.price,
            basis: item.basis,
          }
        })
      const nextId = state.recommendations.length + 1
      const generated = generateRecommendations(
        state.materials,
        reorderTargetStock,
        pricingSuggestions.length > 0
          ? pricingSuggestions
          : Object.entries(state.pricingRules.productPrices).map(([product, price]) => ({
              product,
              currentPrice: price,
              suggestedPrice: price,
              basis: 'No pricing update is configured; review the current sample price.',
            })),
        `REC-GEN-${nextId}`,
        state.inventoryMovements,
      )
      set({ recommendations: [...state.recommendations, ...generated] })
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
      if (!at.trim()) {
        throw new Error('A payment timestamp is required.')
      }
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
      if (!at.trim()) {
        throw new Error('A timestamp is required for a tier correction.')
      }
      const correction: MembershipTierCorrection = {
        id: `TIER-${state.membershipTierCorrections.length + 1}`,
        npcNumber,
        fromTier: member.tier,
        toTier: tier,
        at,
      }
      set({
        members: state.members.map(item =>
          item.npcNumber === npcNumber ? { ...item, tier } : item,
        ),
        membershipTierCorrections: [...state.membershipTierCorrections, correction],
      })
    },

    createEmployee: input => {
      const state = get()
      const errors = validateEmployeeInput(input, state.employees)
      if (errors.length > 0) {
        throw new Error(errors.join(' '))
      }
      let nextId = state.employees.length + 1
      let id = `EMP-${String(nextId).padStart(3, '0')}`
      const existingIds = new Set(state.employees.map(employee => employee.id))
      while (existingIds.has(id)) {
        nextId += 1
        id = `EMP-${String(nextId).padStart(3, '0')}`
      }
      const employee = buildEmployee(id, input, state.employees)
      set({ employees: [...state.employees, employee] })
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

    assignOrderTeamAndSchedule: (orderId, teamId, scheduleStart, at = `${DEMO_TODAY}T00:00:00.000Z`) => {
      const state = get()
      const order = requireById(state.orders, orderId, 'Order')
      if (!teamId.trim() || !scheduleStart.trim()) {
        throw new Error('A production team and schedule start are required.')
      }
      if (!order.stage) {
        throw new Error('Only active production orders can be assigned.')
      }
      const normalizedTeam = teamId.trim()
      const normalizedSchedule = scheduleStart.trim()
      const assignmentChanged = order.teamId !== normalizedTeam || order.scheduleStart !== normalizedSchedule
      set({
        orders: state.orders.map(item =>
          item.id === orderId
            ? { ...item, teamId: normalizedTeam, scheduleStart: normalizedSchedule }
            : item,
        ),
        assignmentEvents: assignmentChanged
          ? [...state.assignmentEvents, {
              id: `ASSIGN-${orderId}-${state.assignmentEvents.length + 1}`,
              orderId,
              teamId: normalizedTeam,
              scheduleStart: normalizedSchedule,
              at,
            }]
          : state.assignmentEvents,
      })
    },

    updatePricingRules: rules => {
      const validationErrors = validatePricingRules(rules)
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(' '))
      }
      set({ pricingRules: structuredClone(rules) })
    },

    setViewAs: viewAs => {
      if (viewAs !== 'Admin' && viewAs !== 'Manager') {
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
      const claimedOrder = { ...order, claimed: true }
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
      if (!at.trim()) {
        throw new Error('A payment timestamp is required.')
      }
      const paidOrder = { ...order, amountPaid: order.amountPaid + amount }
      const updatedOrders = state.orders.map(item => item.id === orderId ? paidOrder : item)
      const payout = createCommissionPayout(paidOrder, at)
      const alreadyHasPayout = state.commissionPayouts.some(item => item.orderId === orderId)
      set({
        orders: updatedOrders,
        commissionPayouts: payout && !alreadyHasPayout
          ? [...state.commissionPayouts, payout]
          : state.commissionPayouts,
        members: state.members.map(member =>
          member.name === order.customer
            ? {
                ...member,
                points: calculateMembershipPoints(
                  updatedOrders
                    .filter(item => item.customer === member.name)
                    .reduce((total, item) => total + item.amountPaid, 0),
                ),
              }
            : member,
        ),
      })
    },

    resetDemoData: () => set(cloneSeedData()),
  }), persistOptions))
}

export const useAdminStore = createAdminStore()
