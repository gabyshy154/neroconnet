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
  createCommissionEntry,
  generateNpcNumber,
  generateOrderId,
  getPaidTotal,
  getPaymentStatus,
  isValidPhPhone,
  lockPricing,
  releaseIfReady,
  upgradedTier,
  validateClaimRelease,
  isReadyForClaim,
  readyStatusFor,
  validatePaymentAmount,
} from "../lib/billing"
import {
  getCurrentProductionStage,
  getProductionBlockMessage,
  getProductionBlockReason,
} from "../lib/production"
import { getToday, getTodayTimestamp, NPC_PREFIX_BILLING } from "../config"

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
  ClaimMethod,
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

  claimMethod: ClaimMethod

  deliveryAddress?: string
}

export interface RecordPaymentInput {
  method: PaymentMethod

  amount: number

  recordedBy: string

  referenceCode?: string

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
  /** Mock sign-in with the staff account's email (or full name) and password. */
  signIn(identifier: string, password: string): void
  signOut(): void
  recordPayment(orderId: string, input: RecordPaymentInput): Payment

  advanceOrderStage(
    orderId: string,
    station: Stage,
    staffId: string,
    via: StageLogEntry["via"],
  ): Order

  claimOrder(input: ClaimOrderInput): Order

  /** The customer switches Pick-up / Delivery before the order is claimed. */
  changeClaimMethod(orderId: string, method: ClaimMethod, deliveryAddress?: string): Order

  /** Demo stand-in for the Admin Portal's Design Review approving the order's design. */
  simulateDesignApproval(orderId: string): Order

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

      claim: { ...order.claim },

      pricing: {
        ...order.pricing,

        discounts: order.pricing.discounts.map((discount) => ({ ...discount })),
      },
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

// Billing always uses the breakdown saved when the order was confirmed.
function getOrderTotal(order: Order): number {
  return order.pricing.grandTotal
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

        if (input.claimMethod === "Delivery" && !input.deliveryAddress?.trim()) {
          throw new Error("A delivery address is required for delivery orders.")
        }

        const createdAt = getTodayTimestamp(now())
        const date = getToday()

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

        const pricing = lockPricing({
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

          // Walk-in designs go to the Admin Portal's Design Review like online ones (BR-07).
          status: "Awaiting Release",

          designStatus: "Under Review",

          claim: {
            method: input.claimMethod,

            deliveryAddress:
              input.claimMethod === "Delivery" ? input.deliveryAddress?.trim() : undefined,
          },

          pricing,

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
                now().toISOString(),
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
      signIn: (identifier, password) => {
        const state = get()
        const key = identifier.trim().toLowerCase()
        const staff = state.staff.find(
          (item) => item.email.toLowerCase() === key || item.name.toLowerCase() === key,
        )
        if (!staff) {
          throw new Error("No staff account matches that email or name.")
        }
        // Mockup: any password that meets the Admin Portal's rule is accepted. The real
        // system checks it against the staff account created in User Management.
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.")
        }
        set({ signedInStaffId: staff.id })
      },
      signOut: () => set({ signedInStaffId: null }),

      recordPayment: (orderId, input) => {
        const state = get()

        const order = findOrder(state, orderId)

        const total = getOrderTotal(order)

        validatePaymentAmount(order, total, input.amount)

        if (!state.staff.some((item) => item.id === input.recordedBy)) {
          throw new Error(`Staff member ${input.recordedBy} was not found.`)
        }

        const referenceCode = input.referenceCode?.trim() || undefined

        if (input.method !== "Cash" && !referenceCode) {
          throw new Error(
            `Enter the ${input.method} reference code from the customer's receipt.`,
          )
        }

        if (referenceCode && referenceCode.length > 40) {
          throw new Error("Reference code must be 40 characters or fewer.")
        }

        const recordedAt = input.recordedAt ?? getTodayTimestamp(now())

        const payment: Payment = {
          id: createPaymentId(state.payments, recordedAt.slice(0, 10)),

          orderId,

          method: input.method,

          amount: input.amount,

          recordedBy: input.recordedBy,

          recordedAt,

          referenceCode,

          receiptIssued: input.receiptIssued,
        }

        // The downpayment releases the order for production only if its design is approved.
        const nextOrder: Order = releaseIfReady({
          ...order,

          payments: [...order.payments, payment],
        })

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

            // Points are credited per order; the tier upgrades when a threshold is reached.
            npcMembers = npcMembers.map((member, index) => {
              if (index !== memberIndex) return member
              const points = member.points + earnedPoints
              return { ...member, points, tier: upgradedTier(member.tier, points) }
            })
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

                now().toISOString(),
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

            "design-pending":
              "The design must be approved in the Admin Portal (Design Review) before production starts.",

            "already-ready": "This order has finished production.",

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

        const total = getOrderTotal(order)

        const release = validateClaimRelease(order, total)

        if (!release.allowed) {
          throw new Error(
            release.reason === "not-ready"
              ? "Only orders that are Ready for Pickup or Ready for Delivery can be released."
              : "Remaining balance must be settled before release.",
          )
        }

        const claimedAt = input.claimedAt ?? getTodayTimestamp(now())

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

                now().toISOString(),
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

      changeClaimMethod: (orderId, method, deliveryAddress) => {
        const state = get()

        const order = findOrder(state, orderId)

        if (order.status === "Claimed") {
          throw new Error("This order has already been claimed.")
        }

        if (method === "Delivery" && !deliveryAddress?.trim()) {
          throw new Error("A delivery address is required.")
        }

        const claim = {
          method,

          deliveryAddress: method === "Delivery" ? deliveryAddress?.trim() : undefined,
        }

        // A finished order moves between Ready for Pickup and Ready for Delivery.
        const updated: Order = {
          ...order,

          claim,

          status: isReadyForClaim(order.status) ? readyStatusFor({ claim }) : order.status,
        }

        const queuedActions =
          !state.isOnline || state.isSyncing
            ? [
              ...state.queuedActions,

              createQueuedAction(
                state.queuedActions,

                "changeClaimMethod",

                { orderId, claim },

                now().toISOString(),
              ),
              ]
            : state.queuedActions

        set({
          orders: state.orders.map((item) => (item.id === orderId ? updated : item)),

          queuedActions,
        })

        return updated
      },

      simulateDesignApproval: (orderId) => {
        const state = get()

        const order = findOrder(state, orderId)

        if (order.designStatus === "Approved") {
          throw new Error("This design is already approved.")
        }

        const approvedOrder = releaseIfReady({ ...order, designStatus: "Approved" })

        const queuedActions =
          !state.isOnline || state.isSyncing
            ? [
              ...state.queuedActions,

              createQueuedAction(
                state.queuedActions,

                "designApproved",

                { orderId },

                now().toISOString(),
              ),
              ]
            : state.queuedActions

        set({
          orders: state.orders.map((item) =>
            item.id === orderId ? approvedOrder : item,
          ),

          queuedActions,
        })

        return approvedOrder
      },

      enrollNpcMember: (customerId, joinedAt = getTodayTimestamp(now())) => {
        const state = get()

        const customer = state.customers.find((item) => item.id === customerId)

        if (!customer) throw new Error(`Customer ${customerId} was not found.`)

        if (customer.npcNumber) {
          throw new Error("This customer is already an NPC member.")
        }

        const nextSequence =
          state.npcMembers.reduce((highest, member) => {
            const match = new RegExp(`^${NPC_PREFIX_BILLING}-(\\d{6})$`).exec(member.npcNumber)

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

      // Versions 2-3 changed the order shape and demo orders (release gate, claim method,
      // locked pricing, delivery example),
      // so older saved demo data is replaced with the new seed.
      version: 3,

      migrate: () => cloneSeedData() as BillingStore,
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
