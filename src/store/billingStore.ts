import { createStore, type StateCreator } from "zustand/vanilla"

import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware"

import { useStore } from "zustand"

import {
  advanceStage,
  calculateNpcPoints,
  calculatePricing,
  createCommissionEntry,
  generateNpcNumber,
  generateOrderId,
  getPaidTotal,
  getPaymentStatus,
  isValidPhPhone,
  validateClaimRelease,
  validatePaymentAmount,
} from "../lib/billing"
import {
  getCurrentProductionStage,
  getProductionBlockMessage,
  getProductionBlockReason,
} from "../lib/production"

import {
  seedCommissions,
  seedCustomers,
  seedNpcMembers,
  seedOrders,
  seedPayments,
  seedProductTypes,
  seedStaff,
} from "../data/seed"

import type {
  CommissionEntry,
  Customer,
  NpcMember,
  Order,
  OrderLine,
  Payment,
  PaymentMethod,
  ProductType,
  QueuedAction,
  Stage,
  StageLogEntry,
  Staff,
  Tier,
} from "../types"

const STORAGE_KEY = "neroconnect-billing-store"

export interface BillingData {
  staff: Staff[]

  customers: Customer[]

  npcMembers: NpcMember[]

  productTypes: ProductType[]

  orders: Order[]

  payments: Payment[]

  commissions: CommissionEntry[]

  queuedActions: QueuedAction[]

  isOnline: boolean

  isSyncing: boolean

  syncMessage: string

  signedInStaffId: string | null
}

export interface CreateOrderInput {
  customerId: string

  salesPersonId: string

  lines: OrderLine[]

  deadline: string

  rush?: boolean

  creditTermDays?: 15 | 30
}

export interface RecordPaymentInput {
  method: PaymentMethod

  amount: number

  recordedBy: string

  receiptIssued: boolean

  recordedAt?: string
}

export interface ClaimOrderInput {
  orderId: string

  method: "Pick-up" | "Delivery"

  deliveryAddress?: string

  claimedAt?: string
}

export interface BillingStore extends BillingData {
  createOrder(input: CreateOrderInput): Order
  addCustomer(input: Omit<Customer, "id" | "npcNumber">): Customer
  signIn(staffId: string, pin: string): void
  signOut(): void
  recordPayment(orderId: string, input: RecordPaymentInput): Payment

  advanceOrderStage(
    orderId: string,
    station: Stage,
    staffId: string,
    via: StageLogEntry["via"],
  ): Order

  claimOrder(input: ClaimOrderInput): Order

  enrollNpcMember(customerId: string, joinedAt?: string): NpcMember

  setOnline(isOnline: boolean): Promise<void>

  resetDemoData(): void
}

export interface BillingStoreOptions {
  storage?: StateStorage

  now?: () => Date

  initialData?: BillingData

  syncQueuedAction?: (action: QueuedAction) => Promise<void>
}

const memoryStorageData = new Map<string, string>()

const memoryStorage: StateStorage = {
  getItem: (name) => memoryStorageData.get(name) ?? null,

  setItem: (name, value) => {
    memoryStorageData.set(name, value)
  },

  removeItem: (name) => {
    memoryStorageData.delete(name)
  },
}

function cloneSeedData(): BillingData {
  return {
    staff: seedStaff.map((staff) => ({ ...staff })),

    customers: seedCustomers.map((customer) => ({ ...customer })),

    npcMembers: seedNpcMembers.map((member) => ({ ...member })),

    productTypes: seedProductTypes.map((product) => ({ ...product })),

    orders: seedOrders.map((order) => ({
      ...order,

      lines: order.lines.map((line) => ({
        ...line,

        sizes: { ...line.sizes },
      })),

      payments: order.payments.map((payment) => ({ ...payment })),

      stageLog: order.stageLog.map((entry) => ({ ...entry })),

      claim: order.claim ? { ...order.claim } : undefined,
    })),

    payments: seedPayments.map((payment) => ({ ...payment })),

    commissions: seedCommissions.map((commission) => ({ ...commission })),

    queuedActions: [],

    isOnline: true,

    isSyncing: false,

    syncMessage: "",

    signedInStaffId: null,
  }
}

function getCustomerTier(
  data: BillingData,
  customerId: string,
): Tier | undefined {
  const customer = data.customers.find((item) => item.id === customerId)

  return data.npcMembers.find(
    (member) => member.npcNumber === customer?.npcNumber,
  )?.tier
}

function getOrderTotal(order: Order, data: BillingData): number {
  return calculatePricing({
    lines: order.lines,

    tier: getCustomerTier(data, order.customerId),

    rush: order.rush,

    creditTermDays: order.creditTermDays,
  }).grandTotal
}

function findOrder(data: BillingData, orderId: string): Order {
  const order = data.orders.find((item) => item.id === orderId)

  if (!order) throw new Error(`Order ${orderId} was not found.`)

  return order
}

function createQueuedAction(
  queuedActions: QueuedAction[],

  type: string,

  payload: unknown,

  timestamp: string,
): QueuedAction {
  const nextSequence =
    queuedActions.reduce((highest, action) => {
      const match = /^QUEUE-(\d+)$/.exec(action.id)
      return match ? Math.max(highest, Number(match[1])) : highest
    }, 0) + 1

  return {
    id: `QUEUE-${String(nextSequence).padStart(6, "0")}`,

    type,

    payload,

    queuedAt: timestamp,
  }
}

function createPaymentId(payments: Payment[], date: string): string {
  const datePart = date.replace(/-/g, "")

  const prefix = `PAY-${datePart}-`

  const nextSequence =
    payments.reduce((highest, payment) => {
      if (!payment.id.startsWith(prefix)) return highest

      const sequence = Number(payment.id.slice(prefix.length))

      return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest
    }, 0) + 1

  if (nextSequence > 999) {
    throw new RangeError("Daily payment sequence exceeds 999.")
  }

  return `${prefix}${String(nextSequence).padStart(3, "0")}`
}

function addCommissionIfEligible(
  order: Order,

  grandTotal: number,

  commissions: CommissionEntry[],

  postedAt: string,
): CommissionEntry[] {
  if (commissions.some((entry) => entry.orderId === order.id)) {
    return commissions
  }

  const commission = createCommissionEntry(order, grandTotal, postedAt)

  return commission ? [...commissions, commission] : commissions
}

function createBillingStoreState(
  options: BillingStoreOptions,
): StateCreator<BillingStore, [], [["zustand/persist", BillingStore]], BillingStore> {
  const now = options.now ?? (() => new Date())
  const syncQueuedAction =
    options.syncQueuedAction ?? (async (_action: QueuedAction) => {})

  const initialData = options.initialData ?? cloneSeedData()

  const storage =
    options.storage ??
    (typeof window !== "undefined" ? window.localStorage : memoryStorage)

  return persist<BillingStore, [], [], BillingStore>(
    (set, get) => ({
      ...initialData,

      createOrder: (input) => {
        const state = get()

        if (!state.customers.some((item) => item.id === input.customerId)) {
          throw new Error(`Customer ${input.customerId} was not found.`)
        }

        if (
          !state.staff.some(
            (item) => item.id === input.salesPersonId && item.isSalesPerson,
          )
        ) {
          throw new Error("Select a valid sales person for the order.")
        }

        if (!input.lines.length) {
          throw new Error("An order must contain at least one line.")
        }

        const createdAt = now().toISOString()

        const date = createdAt.slice(0, 10)

        const prefix = `NPS-${date.replace(/-/g, "")}-`

        const sequence =
          state.orders.reduce((highest, order) => {
            if (!order.id.startsWith(prefix)) return highest

            const value = Number(order.id.slice(prefix.length))

            return Number.isInteger(value) ? Math.max(highest, value) : highest
          }, 0) + 1

        const id = generateOrderId(date, sequence)

        const lines = input.lines.map((line) => ({
          ...line,
          pricePerPiece:
            state.productTypes.find((product) => product.id === line.productTypeId)
              ?.pricePerPiece ?? NaN,
          sizes: { ...line.sizes },
        }))
        if (lines.some((line) => !Number.isFinite(line.pricePerPiece))) {
          throw new Error("Every order line must use a catalog product type.")
        }

        calculatePricing({
          lines,

          tier: getCustomerTier(state, input.customerId),

          rush: input.rush,

          creditTermDays: input.creditTermDays,
        })

        const order: Order = {
          id,

          customerId: input.customerId,

          salesPersonId: input.salesPersonId,

          lines,

          deadline: input.deadline,

          rush: input.rush ?? false,

          creditTermDays: input.creditTermDays,

          status: "Pending Downpayment",

          payments: [],

          stageLog: [],

          createdAt,
        }

        const queuedActions =
          !state.isOnline || state.isSyncing
            ? [
              ...state.queuedActions,

              createQueuedAction(
                state.queuedActions,
                "createOrder",
                order,
                createdAt,
              ),
              ]
            : state.queuedActions

        set({ orders: [order, ...state.orders], queuedActions })

        return order
      },
      addCustomer: (input) => {
        const state = get()
        const timestamp = now()
        const customer: Customer = {
          id: `CUSTOMER-${timestamp.getTime()}-${state.customers.length + 1}`,
          name: input.name.trim(),
          phone: input.phone.trim(),
        }
        if (!customer.name || !customer.phone) {
          throw new Error("Customer name and phone number are required.")
        }
        if (!isValidPhPhone(customer.phone)) {
          throw new Error("Enter a valid Philippine mobile number.")
        }
        const normalizedPhone = customer.phone.replace(/[\s-]/g, "")
        const duplicate = state.customers.find(
          (item) => item.phone.replace(/[\s-]/g, "") === normalizedPhone,
        )
        if (duplicate) {
          throw new Error(
            `This phone number already belongs to ${duplicate.name}.`,
          )
        }
        const queuedAt = timestamp.toISOString()
        const queuedActions =
          !state.isOnline || state.isSyncing
            ? [
              ...state.queuedActions,
              createQueuedAction(
                state.queuedActions,
                "addCustomer",
                customer,
                queuedAt,
              ),
              ]
            : state.queuedActions
        set({
          customers: [...state.customers, customer],
          queuedActions,
        })
        return customer
      },
      signIn: (staffId, pin) => {
        const state = get()
        if (!state.staff.some((item) => item.id === staffId)) {
          throw new Error("Select a valid staff name.")
        }
        if (!/^\d{4,6}$/.test(pin)) {
          throw new Error("Enter a 4–6 digit demo PIN.")
        }
        set({ signedInStaffId: staffId })
      },
      signOut: () => set({ signedInStaffId: null }),

      recordPayment: (orderId, input) => {
        const state = get()

        const order = findOrder(state, orderId)

        const total = getOrderTotal(order, state)

        validatePaymentAmount(order, total, input.amount)

        if (!state.staff.some((item) => item.id === input.recordedBy)) {
          throw new Error(`Staff member ${input.recordedBy} was not found.`)
        }

        const recordedAt = input.recordedAt ?? now().toISOString()

        const payment: Payment = {
          id: createPaymentId(state.payments, recordedAt.slice(0, 10)),

          orderId,

          method: input.method,

          amount: input.amount,

          recordedBy: input.recordedBy,

          recordedAt,

          receiptIssued: input.receiptIssued,
        }

        const nextOrder: Order = {
          ...order,

          status:
            order.status === "Pending Downpayment"
              ? "In Production"
              : order.status,

          payments: [...order.payments, payment],
        }

        const previousPaymentStatus = getPaymentStatus(order, total)

        const nextPaymentStatus = getPaymentStatus(nextOrder, total)

        let npcMembers = state.npcMembers

        if (
          previousPaymentStatus !== "Paid in Full" &&
          nextPaymentStatus === "Paid in Full"
        ) {
          const customer = state.customers.find(
            (item) => item.id === order.customerId,
          )

          const memberIndex = npcMembers.findIndex(
            (member) => member.npcNumber === customer?.npcNumber,
          )

          if (memberIndex >= 0) {
            const earnedPoints = calculateNpcPoints(getPaidTotal(nextOrder))

            npcMembers = npcMembers.map((member, index) =>
              index === memberIndex
                ? { ...member, points: member.points + earnedPoints }
                : member,
            )
          }
        }

        const commissions = addCommissionIfEligible(
          nextOrder,

          total,

          state.commissions,

          recordedAt,
        )

        const queuedActions =
          !state.isOnline || state.isSyncing
            ? [
              ...state.queuedActions,

              createQueuedAction(
                state.queuedActions,

                "recordPayment",

                payment,

                recordedAt,
              ),
              ]
            : state.queuedActions

        set({
          orders: state.orders.map((item) =>
            item.id === orderId ? nextOrder : item,
          ),

          payments: [...state.payments, payment],

          npcMembers,

          commissions,

          queuedActions,
        })

        return payment
      },

      advanceOrderStage: (orderId, station, staffId, via) => {
        const state = get()

        const order = findOrder(state, orderId)

        const staff = state.staff.find((item) => item.id === staffId)
        if (!staff) throw new Error(`Staff member ${staffId} was not found.`)

        const currentStage = getCurrentProductionStage(order)
        const blockReason = getProductionBlockReason(order, station)
        if (blockReason) {
          throw new Error(getProductionBlockMessage(blockReason, currentStage))
        }

        if (!currentStage) {
          throw new Error("This order does not have a production stage.")
        }

        const result = advanceStage({ ...order, stage: currentStage })

        if (!result.ok) {
          const messages = {
            "downpayment-required":
              "Record the downpayment before starting production.",

            "already-ready": "This order is already ready for claim.",

            "already-claimed": "This order has already been claimed.",

            "invalid-status":
              "This order cannot advance from its current state.",
          } satisfies Record<typeof result.reason, string>

          throw new Error(messages[result.reason])
        }

        const timestamp = now().toISOString()
        const completedOrder: Order = {
          ...result.order,
          stageLog: [
            ...(order.stageLog ?? []),
            {
              orderId,
              stage: currentStage,
              staffId,
              at: timestamp,
              via,
            },
          ],
        }

        const queuedActions =
          !state.isOnline || state.isSyncing
            ? [
              ...state.queuedActions,

              createQueuedAction(
                state.queuedActions,

                "advanceStage",

                { orderId, order: completedOrder },

                timestamp,
              ),
              ]
            : state.queuedActions

        set({
          orders: state.orders.map((item) =>
            item.id === orderId ? completedOrder : item,
          ),

          queuedActions,
        })

        return completedOrder
      },

      claimOrder: (input) => {
        const state = get()

        const order = findOrder(state, input.orderId)

        if (input.method === "Delivery" && !input.deliveryAddress?.trim()) {
          throw new Error("A delivery address is required.")
        }

        const total = getOrderTotal(order, state)

        const release = validateClaimRelease(order, total)

        if (!release.allowed) {
          throw new Error(
            release.reason === "not-ready"
              ? "Only orders ready for claim can be released."
              : "Remaining balance must be settled before release.",
          )
        }

        const claimedAt = input.claimedAt ?? now().toISOString()

        const claimedOrder: Order = {
          ...order,

          status: "Claimed",

          claim: {
            method: input.method,

            deliveryAddress:
              input.method === "Delivery"
                ? input.deliveryAddress?.trim()
                : undefined,

            claimedAt,
          },
        }

        const commissions = addCommissionIfEligible(
          claimedOrder,

          total,

          state.commissions,

          claimedAt,
        )

        const queuedActions =
          !state.isOnline || state.isSyncing
            ? [
              ...state.queuedActions,

              createQueuedAction(
                state.queuedActions,

                "claimOrder",

                claimedOrder,

                claimedAt,
              ),
              ]
            : state.queuedActions

        set({
          orders: state.orders.map((item) =>
            item.id === input.orderId ? claimedOrder : item,
          ),

          commissions,

          queuedActions,
        })

        return claimedOrder
      },

      enrollNpcMember: (customerId, joinedAt = now().toISOString()) => {
        const state = get()

        const customer = state.customers.find((item) => item.id === customerId)

        if (!customer) throw new Error(`Customer ${customerId} was not found.`)

        if (customer.npcNumber) {
          throw new Error("This customer is already an NPC member.")
        }

        const nextSequence =
          state.npcMembers.reduce((highest, member) => {
            const match = /^NPC-(\d{6})$/.exec(member.npcNumber)

            return match ? Math.max(highest, Number(match[1])) : highest
          }, 0) + 1

        const npcNumber = generateNpcNumber(nextSequence)

        const member: NpcMember = {
          npcNumber,

          customerId,

          tier: "Bronze",

          points: 0,

          joinedAt,
        }

        const timestamp = now().toISOString()

        const queuedActions =
          !state.isOnline || state.isSyncing
            ? [
              ...state.queuedActions,

              createQueuedAction(
                state.queuedActions,

                "enrollNpcMember",

                member,

                timestamp,
              ),
              ]
            : state.queuedActions

        set({
          customers: state.customers.map((item) =>
            item.id === customerId ? { ...item, npcNumber } : item,
          ),

          npcMembers: [...state.npcMembers, member],

          queuedActions,
        })

        return member
      },

      setOnline: async (isOnline) => {
        const state = get()
        if (!isOnline) {
          set({
            isOnline: false,
            isSyncing: false,
            syncMessage: "",
          })
          return
        }

        if (state.isOnline && !state.isSyncing) return

        const queuedActions = [...state.queuedActions]
        if (!queuedActions.length) {
          set({
            isOnline: true,
            isSyncing: false,
            syncMessage: "",
          })
          return
        }

        set({
          isOnline: true,
          isSyncing: true,
          syncMessage: "Syncing...",
        })
        try {
          while (get().queuedActions.length) {
            const action = get().queuedActions[0]
            await syncQueuedAction(action)
            set((current) => ({
              queuedActions: current.queuedActions.filter(
                (queued) => queued.id !== action.id,
              ),
            }))
          }

          set({
            isSyncing: false,
            syncMessage: "All transactions synced",
          })
        } catch (reason) {
          set({
            isOnline: false,
            isSyncing: false,
            syncMessage:
              reason instanceof Error
                ? `Sync failed: ${reason.message}`
                : "Sync failed. Queued transactions were kept.",
          })
        }
      },

      resetDemoData: () => {
        set(cloneSeedData())
      },
    }),

    {
      name: STORAGE_KEY,

      storage: createJSONStorage(() => storage),

      version: 1,
    },
  )
}

export function createBillingStore(options: BillingStoreOptions = {}) {
  return createStore<BillingStore>()(createBillingStoreState(options))
}

export const billingStore = createBillingStore()

export function useBillingStore<T>(selector: (state: BillingStore) => T): T {
  return useStore(billingStore, selector)
}
