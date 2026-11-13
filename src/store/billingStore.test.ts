import { describe, expect, it } from "vitest"

import type { StateStorage } from "zustand/middleware"

import { createBillingStore } from "./billingStore"

import {
  seedCustomers,
  seedCommissions,
  seedNpcMembers,
  seedOrders,
  seedPayments,
  seedProductTypes,
  seedStaff,
} from "../data/seed"

import {
  calculatePricing,
  getPaymentStatus,
  getRemainingBalance,
  isOrderOverdue,
} from "../lib/billing"

import type { Order } from "../types"

const fixedNow = () => new Date("2026-11-06T10:00:00.000Z")

function createMemoryStorage(): StateStorage {
  const values = new Map<string, string>()

  return {
    getItem: (name) => values.get(name) ?? null,

    setItem: (name, value) => {
      values.set(name, value)
    },

    removeItem: (name) => {
      values.delete(name)
    },
  }
}

function getTotal(order: Order): number {
  const customer = seedCustomers.find((item) => item.id === order.customerId)

  const member = seedNpcMembers.find(
    (item) => item.npcNumber === customer?.npcNumber,
  )

  return calculatePricing({
    lines: order.lines,

    tier: member?.tier,

    rush: order.rush,

    creditTermDays: order.creditTermDays,
  }).grandTotal
}

function getSeedCommissionOrderIds(period: "today" | "week"): string[] {
  const now = new Date(2026, 10, 6)
  const dateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  const today = dateKey(now)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const start = dateKey(weekStart)

  return seedCommissions
    .filter((entry) => {
      const postedDate = dateKey(new Date(entry.postedAt))
      return period === "today"
        ? postedDate === today
        : postedDate >= start && postedDate <= today
    })
    .map((entry) => entry.orderId)
}

describe("demo seed data", () => {
  it("contains the required counts and valid order/payment relationships", () => {
    expect(seedStaff).toHaveLength(5)

    expect(seedStaff.filter((item) => item.isSalesPerson)).toHaveLength(4)

    expect(seedCustomers).toHaveLength(8)

    expect(seedNpcMembers).toHaveLength(4)

    expect(new Set(seedNpcMembers.map((item) => item.tier)).size).toBe(4)

    expect(seedProductTypes).toHaveLength(6)

    expect(seedOrders).toHaveLength(11)

    for (const member of seedNpcMembers) {
      expect(member.npcNumber).toMatch(/^NPC-\d{6}$/)
    }

    for (const order of seedOrders) {
      expect(order.id).toMatch(/^NPS-\d{8}-\d{3}$/)

      expect(order.payments).toEqual(
        seedPayments.filter((payment) => payment.orderId === order.id),
      )

      expect(
        order.payments.reduce((sum, payment) => sum + payment.amount, 0),
      ).toBeLessThanOrEqual(getTotal(order))
    }

    expect(
      new Set(seedOrders.map((order) => order.status)),
    ).toEqual(
      new Set([
        "Pending Downpayment",

        "In Production",

        "Ready for Claim",

        "Claimed",
      ]),
    )

    expect(
      seedOrders.some((order) => order.status === "Pending Downpayment"),
    ).toBe(
      true,
    )

    expect(seedOrders.some((order) => order.stage === "Cutting")).toBe(true)

    expect(seedOrders.some((order) => order.stage === "Printing/Sewing")).toBe(
      true,
    )

    expect(seedOrders.some((order) => order.stage === "Heat Press")).toBe(true)

    expect(
      seedOrders.some((order) => order.stage === "Quality Control"),
    ).toBe(true)

    expect(
      seedOrders.some((order) => isOrderOverdue(order, "2026-11-06")),
    ).toBe(
      true,
    )

    expect(
      seedOrders.some((order) => order.claim?.method === "Delivery"),
    ).toBe(true)

    expect(
      seedOrders

        .filter((order) => order.status === "Claimed")

        .every(
          (order) =>
            order.creditTermDays !== undefined ||
            getPaymentStatus(order, getTotal(order)) === "Paid in Full",
        ),
    ).toBe(true)

    for (const commission of seedCommissions) {
      const order = seedOrders.find((item) => item.id === commission.orderId)
      expect(order).toBeDefined()
      expect(order?.status).toBe("Claimed")
      expect(order?.claim?.claimedAt).toBe(commission.postedAt)
      expect(getPaymentStatus(order!, getTotal(order!))).toBe("Paid in Full")
      expect(commission.amount).toBe(commission.pieces * 20)
    }
  })

  it("returns different Today and This Week commission results", () => {
    expect(getSeedCommissionOrderIds("today")).toEqual([
      "NPS-20261106-008",
      "NPS-20261106-011",
    ])
    expect(getSeedCommissionOrderIds("week")).toEqual([
      "NPS-20261106-008",
      "NPS-20261106-009",
      "NPS-20261106-011",
    ])
  })
})

describe("billing store actions", () => {
  it("creates an order with a daily sequential ID and pending downpayment status", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })

    const order = store.getState().createOrder({
      customerId: "customer-005",

      salesPersonId: "staff-001",

      lines: [
        {
          productTypeId: "product-001",

          printingType: "Full Sublimation",

          printLocation: "Front",

          sizes: { M: 2 },

          pricePerPiece: 420,
        },
      ],

      deadline: "2026-11-12",

      rush: true,

      creditTermDays: 15,
    })

    expect(order.id).toBe("NPS-20261106-012")

    expect(order.status).toBe("Pending Downpayment")

    expect(order.stage).toBeUndefined()

    expect(order.payments).toEqual([])

    expect(order.rush).toBe(true)

    expect(order.creditTermDays).toBe(15)
  })

  it("uses the catalog price instead of a caller-supplied price", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })
    const order = store.getState().createOrder({
      customerId: "customer-005",
      salesPersonId: "staff-001",
      lines: [
        {
          productTypeId: "product-001",
          printingType: "Full Sublimation",
          printLocation: "Front",
          sizes: { M: 1 },
          pricePerPiece: 1,
        },
      ],
      deadline: "2026-11-12",
    })
    expect(order.lines[0].pricePerPiece).toBe(420)
  })

  it("validates and adds a customer, and checks the mock staff PIN format", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })
    expect(() =>
      store.getState().addCustomer({ name: "Bad Phone", phone: "123" }),
    ).toThrow("valid Philippine mobile")
    const customer = store.getState().addCustomer({
      name: "New Customer",
      phone: "0917 111 2233",
    })
    expect(customer.name).toBe("New Customer")
    expect(() =>
      store.getState().addCustomer({
        name: "Duplicate",
        phone: "0917-111-2233",
      }),
    ).toThrow("already belongs")

    expect(() => store.getState().signIn("staff-001", "123")).toThrow(
      "4–6 digit",
    )
    store.getState().signIn("staff-001", "1234")
    expect(store.getState().signedInStaffId).toBe("staff-001")
    store.getState().signOut()
    expect(store.getState().signedInStaffId).toBeNull()
  })

  it("validates payments, updates balances/status, and awards member points on full payment", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })

    const state = store.getState()

    const originalOrder = state.orders.find(
      (item) => item.id === "NPS-20261106-002",
    )!

    const total = getTotal(originalOrder)

    expect(() =>
      state.recordPayment(originalOrder.id, {
        method: "Cash",

        amount: 0,

        recordedBy: "staff-001",

        receiptIssued: false,
      }),
    ).toThrow("greater than zero")

    expect(() =>
      state.recordPayment(originalOrder.id, {
        method: "Cash",

        amount: -1,

        recordedBy: "staff-001",

        receiptIssued: false,
      }),
    ).toThrow("greater than zero")

    expect(() =>
      state.recordPayment(originalOrder.id, {
        method: "Cash",

        amount: total,

        recordedBy: "staff-001",

        receiptIssued: false,
      }),
    ).toThrow("remaining balance")

    const remaining = getRemainingBalance(originalOrder, total)

    state.recordPayment(originalOrder.id, {
      method: "Bank Transfer",

      amount: remaining,

      recordedBy: "staff-001",

      receiptIssued: true,
    })

    const updated = store.getState()

    const paidOrder = updated.orders.find(
      (item) => item.id === originalOrder.id,
    )!

    expect(paidOrder.payments).toHaveLength(2)

    expect(updated.payments).toHaveLength(seedPayments.length + 1)

    expect(getPaymentStatus(paidOrder, total)).toBe("Paid in Full")

    expect(
      updated.npcMembers.find((item) => item.npcNumber === "NPC-000101")
        ?.points,
    ).toBe(17)
  })

  it("advances production one step at a time and rejects unpaid orders", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })

    const state = store.getState()

    expect(() =>
      state.advanceOrderStage(
        "NPS-20261106-001",
        "Cutting",
        "staff-001",
        "Manual entry",
      ),
    ).toThrow("Record the downpayment before starting production.")

    const firstAdvance = state.advanceOrderStage(
      "NPS-20261106-002",
      "Cutting",
      "staff-001",
      "Manual entry",
    )
    expect(firstAdvance.stage).toBe("Printing/Sewing")
    expect(
      firstAdvance.stageLog[firstAdvance.stageLog.length - 1],
    ).toEqual({
      orderId: "NPS-20261106-002",
      stage: "Cutting",
      staffId: "staff-001",
      at: fixedNow().toISOString(),
      via: "Manual entry",
    })
    expect(
      state.advanceOrderStage(
        "NPS-20261106-002",
        "Printing/Sewing",
        "staff-001",
        "Manual entry",
      ).stage,
    ).toBe("Heat Press")
    expect(
      state.advanceOrderStage(
        "NPS-20261106-002",
        "Heat Press",
        "staff-001",
        "Manual entry",
      ).stage,
    ).toBe("Quality Control")
    expect(
      state.advanceOrderStage(
        "NPS-20261106-002",
        "Quality Control",
        "staff-001",
        "Manual entry",
      ).status,
    ).toBe("Ready for Claim")
  })

  it("blocks an unsettled claim and posts commission only after a fully paid claim", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })
    const state = store.getState()
    expect(() =>
      state.claimOrder({
        orderId: "NPS-20261106-007",
        method: "Delivery",
        deliveryAddress: "1 Main Street",
      }),
    ).not.toThrow()

    const commission = store
      .getState()

      .commissions.find((item) => item.orderId === "NPS-20261106-007")

    expect(commission).toMatchObject({
      salesPersonId: "staff-002",

      pieces: 5,

      amount: 100,
    })
  })

  it("blocks a ready order with an outstanding balance and no approved credit term", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })
    const orderId = "NPS-20261106-007"
    const orderPayments = store
      .getState()
      .payments.filter((payment) => payment.orderId === orderId)
    store.setState((state) => ({
      orders: state.orders.map((order) =>
        order.id === orderId ? { ...order, payments: [] } : order,
      ),
      payments: state.payments.filter((payment) => payment.orderId !== orderId),
    }))

    expect(orderPayments).not.toHaveLength(0)
    expect(() =>
      store.getState().claimOrder({
        orderId,
        method: "Pick-up",
      }),
    ).toThrow("Remaining balance must be settled before release.")
    expect(
      store.getState().orders.find((order) => order.id === orderId)?.status,
    ).toBe("Ready for Claim")
  })

  it("requires a delivery address before claiming an order", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })

    expect(() =>
      store.getState().claimOrder({
        orderId: "NPS-20261106-007",
        method: "Delivery",
      }),
    ).toThrow("A delivery address is required.")
  })

  it("allows an approved credit-term claim and posts commission when its balance is later paid", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })

    const state = store.getState()

    const order = state.orders.find(
      (item) => item.id === "NPS-20261106-006",
    )!

    const total = getTotal(order)

    const balance = getRemainingBalance(order, total)

    state.advanceOrderStage(
      order.id,
      "Printing/Sewing",
      "staff-001",
      "Manual entry",
    )

    state.advanceOrderStage(order.id, "Heat Press", "staff-001", "Manual entry")

    state.advanceOrderStage(
      order.id,
      "Quality Control",
      "staff-001",
      "Manual entry",
    )

    state.claimOrder({
      orderId: order.id,

      method: "Delivery",

      deliveryAddress: "12 Banilad Road",
    })

    expect(
      store.getState().orders.find((item) => item.id === order.id)?.status,
    ).toBe("Claimed")

    expect(
      store.getState().commissions.some((item) => item.orderId === order.id),
    ).toBe(false)

    store.getState().recordPayment(order.id, {
      method: "Cash",

      amount: balance,

      recordedBy: "staff-001",

      receiptIssued: false,
    })

    expect(
      store.getState().commissions.find((item) => item.orderId === order.id),
    ).toMatchObject({ pieces: 20, amount: 400 })
  })

  it("enrolls eligible customers as Bronze with a generated NPC number", () => {
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
    })

    const member = store

      .getState()

      .enrollNpcMember("customer-005", "2026-11-06T10:00:00.000Z")

    expect(member).toMatchObject({
      npcNumber: "NPC-000105",

      customerId: "customer-005",

      tier: "Bronze",

      points: 0,
    })

    expect(
      store.getState().customers.find((item) => item.id === "customer-005")
        ?.npcNumber,
    ).toBe("NPC-000105")

    expect(() => store.getState().enrollNpcMember("customer-001")).toThrow(
      "already an NPC member",
    )
  })

  it("queues offline writes with timestamps and replays them in order", async () => {
    const replayed: string[] = []
    const store = createBillingStore({
      now: fixedNow,
      storage: createMemoryStorage(),
      syncQueuedAction: async (action) => {
        replayed.push(action.type)
      },
    })

    store.getState().setOnline(false)

    const order = store.getState().createOrder({
      customerId: "customer-005",

      salesPersonId: "staff-001",

      lines: [
        {
          productTypeId: "product-006",

          printingType: "Digital Print",

          printLocation: "Front",

          sizes: { QTY: 2 },

          pricePerPiece: 180,
        },
      ],

      deadline: "2026-11-12",
    })

    store.getState().recordPayment(order.id, {
      method: "Cash",
      amount: 100,
      recordedBy: "staff-001",
      receiptIssued: false,
    })
    store.getState().advanceOrderStage(
      order.id,
      "Cutting",
      "staff-001",
      "Manual entry",
    )
    store.getState().enrollNpcMember("customer-005")
    store.getState().claimOrder({
      orderId: "NPS-20261106-007",
      method: "Pick-up",
    })

    expect(store.getState().orders).toHaveLength(12)
    expect(store.getState().queuedActions.map((action) => action.type)).toEqual([
      "createOrder",
      "recordPayment",
      "advanceStage",
      "enrollNpcMember",
      "claimOrder",
    ])
    expect(store.getState().queuedActions[2].payload).toMatchObject({
      orderId: order.id,
      order: {
        stage: "Printing/Sewing",
        stageLog: [
          expect.objectContaining({
            orderId: order.id,
            stage: "Cutting",
            staffId: "staff-001",
            at: "2026-11-06T10:00:00.000Z",
            via: "Manual entry",
          }),
        ],
      },
    })
    expect(
      store.getState().queuedActions.every(
        (action) => action.queuedAt === "2026-11-06T10:00:00.000Z",
      ),
    ).toBe(true)
    expect(store.getState().queuedActions.map((action) => action.id)).toEqual([
      "QUEUE-000001",
      "QUEUE-000002",
      "QUEUE-000003",
      "QUEUE-000004",
      "QUEUE-000005",
    ])

    await store.getState().setOnline(true)

    expect(replayed).toEqual([
      "createOrder",
      "recordPayment",
      "advanceStage",
      "enrollNpcMember",
      "claimOrder",
    ])
    expect(store.getState().queuedActions).toEqual([])
    expect(store.getState().isOnline).toBe(true)
    expect(store.getState().isSyncing).toBe(false)
    expect(store.getState().syncMessage).toBe("All transactions synced")
  })

  it("persists data and resets back to demo seed data", () => {
    const storage = createMemoryStorage()

    const firstStore = createBillingStore({ now: fixedNow, storage })

    firstStore.getState().setOnline(false)
    firstStore.getState().createOrder({
      customerId: "customer-005",
      salesPersonId: "staff-001",
      lines: [
        {
          productTypeId: "product-006",
          printingType: "Digital Print",
          printLocation: "Front",
          sizes: { QTY: 1 },
          pricePerPiece: 180,
        },
      ],
      deadline: "2026-11-12",
    })
    firstStore.getState().enrollNpcMember("customer-005")

    const restoredStore = createBillingStore({ now: fixedNow, storage })

    expect(restoredStore.getState().customers).toHaveLength(8)

    expect(
      restoredStore

        .getState()

        .customers.find((item) => item.id === "customer-005")?.npcNumber,
    ).toBe("NPC-000105")
    expect(restoredStore.getState().queuedActions).toHaveLength(2)
    expect(restoredStore.getState().isOnline).toBe(false)

    restoredStore.getState().resetDemoData()

    expect(restoredStore.getState().npcMembers).toHaveLength(4)

    expect(restoredStore.getState().customers[4].npcNumber).toBeUndefined()

    expect(restoredStore.getState().queuedActions).toEqual([])

    const resetStore = createBillingStore({ now: fixedNow, storage })
    expect(resetStore.getState().orders).toHaveLength(11)
    expect(resetStore.getState().commissions).toHaveLength(4)
  })
})
