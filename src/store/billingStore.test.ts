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

// Orders are billed from the breakdown saved when they were confirmed.
function getTotal(order: Order): number {
  return order.pricing.grandTotal
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

    expect(seedOrders).toHaveLength(13)

    // Portal and counter members use separate prefixes (REQ-4.8-03).
    for (const member of seedNpcMembers) {
      expect(member.npcNumber).toMatch(/^NPC-[PB]-\d{6}$/)
    }
    expect(new Set(seedNpcMembers.map((item) => item.npcNumber.slice(0, 5)))).toEqual(
      new Set(["NPC-P", "NPC-B"]),
    )

    // Seed tiers match the point thresholds.
    expect(seedNpcMembers.map((item) => [item.tier, item.points])).toEqual([
      ["Bronze", 12],
      ["Silver", 46],
      ["Gold", 72],
      ["Platinum", 305],
    ])

    // Only released orders have approved designs or production stages.
    for (const order of seedOrders) {
      if (order.status === "Awaiting Release") {
        expect(order.stage).toBeUndefined()
      } else {
        expect(order.designStatus).toBe("Approved")
      }
    }
    expect(
      seedOrders.some(
        (order) => order.status === "Awaiting Release" && order.payments.length > 0,
      ),
    ).toBe(true)

    // GCash and bank transfers carry a reference code.
    for (const payment of seedPayments) {
      if (payment.method !== "Cash") expect(payment.referenceCode).toBeTruthy()
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
        "Awaiting Release",

        "In Production",

        "Ready for Pickup",

        "Ready for Delivery",

        "Claimed",
      ]),
    )

    expect(
      seedOrders.some((order) => order.status === "Awaiting Release"),
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
      seedOrders
        .filter((order) => isOrderOverdue(order, "2026-11-06"))
        .map((order) => order.id),
    ).toEqual(["NPS-20261106-004"])

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
  it("creates an order with a daily sequential ID, awaiting release, with its price locked", () => {
    const store = createBillingStore({
      now: () => new Date("2026-11-19T10:00:00.000Z"),
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

      claimMethod: "Delivery",

      deliveryAddress: "Tipolo, Mandaue City",
    })

    expect(order.id).toBe("NPS-20261106-014")
    expect(order.createdAt).toBe("2026-11-06T10:00:00.000Z")

    expect(order.status).toBe("Awaiting Release")

    expect(order.designStatus).toBe("Under Review")

    expect(order.claim).toEqual({ method: "Delivery", deliveryAddress: "Tipolo, Mandaue City" })

    expect(order.pricing.grandTotal).toBeGreaterThan(0)

    expect(() =>
      store.getState().createOrder({
        customerId: "customer-005",
        salesPersonId: "staff-001",
        lines: order.lines,
        deadline: "2026-11-12",
        claimMethod: "Delivery",
      }),
    ).toThrow("delivery address is required")

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
      claimMethod: "Pick-up",
    })
    expect(order.lines[0].pricePerPiece).toBe(420)
  })

  it("validates and adds a customer, and signs staff in by email or name with a password", () => {
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

    expect(() => store.getState().signIn("nobody@neroconnect.local", "password123")).toThrow(
      "No staff account",
    )
    expect(() => store.getState().signIn("rina.flores@neroconnect.local", "short")).toThrow(
      "at least 8 characters",
    )
    store.getState().signIn("  Rina.Flores@NeroConnect.local ", "password123")
    expect(store.getState().signedInStaffId).toBe("staff-001")
    store.getState().signOut()
    store.getState().signIn("mark bautista", "password123")
    expect(store.getState().signedInStaffId).toBe("staff-002")
    store.getState().signOut()
    expect(store.getState().signedInStaffId).toBeNull()
  })

  it("validates payments, updates balances/status, and awards member points on full payment", () => {
    const store = createBillingStore({
      now: () => new Date("2026-11-19T10:00:00.000Z"),
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

    expect(() =>
      state.recordPayment(originalOrder.id, {
        method: "Bank Transfer",
        amount: remaining,
        recordedBy: "staff-001",
        receiptIssued: true,
      }),
    ).toThrow("reference code")

    const payment = state.recordPayment(originalOrder.id, {
      method: "Bank Transfer",

      amount: remaining,

      recordedBy: "staff-001",

      referenceCode: "  BDO-778812 ",

      receiptIssued: true,
    })
    expect(payment.referenceCode).toBe("BDO-778812")
    expect(payment.id).toBe("PAY-20261106-001")
    expect(payment.recordedAt).toBe("2026-11-06T10:00:00.000Z")

    const updated = store.getState()

    const paidOrder = updated.orders.find(
      (item) => item.id === originalOrder.id,
    )!

    expect(paidOrder.payments).toHaveLength(2)

    expect(updated.payments).toHaveLength(seedPayments.length + 1)

    expect(getPaymentStatus(paidOrder, total)).toBe("Paid in Full")

    expect(
      updated.npcMembers.find((item) => item.npcNumber === "NPC-P-000101")
        ?.points,
    ).toBe(17)
  })

  it("keeps the order's locked total when the customer's tier changes later", () => {
    const store = createBillingStore({ now: fixedNow, storage: createMemoryStorage() })
    const before = store.getState().orders.find((item) => item.id === "NPS-20261106-001")!
    store.getState().enrollNpcMember("customer-005")
    const after = store.getState().orders.find((item) => item.id === "NPS-20261106-001")!
    expect(after.pricing.grandTotal).toBe(before.pricing.grandTotal)
    expect(after.pricing.tier).toBeUndefined()
  })

  it("upgrades the NPC tier when credited points reach the next threshold", () => {
    const store = createBillingStore({ now: fixedNow, storage: createMemoryStorage() })
    store.setState((state) => ({
      npcMembers: state.npcMembers.map((member) =>
        member.npcNumber === "NPC-P-000101" ? { ...member, points: 18 } : member,
      ),
    }))
    const order = store.getState().orders.find((item) => item.id === "NPS-20261106-002")!
    store.getState().recordPayment(order.id, {
      method: "Cash",
      amount: getRemainingBalance(order, getTotal(order)),
      recordedBy: "staff-001",
      receiptIssued: false,
    })
    expect(
      store.getState().npcMembers.find((item) => item.npcNumber === "NPC-P-000101"),
    ).toMatchObject({ points: 23, tier: "Silver" })
  })

  it("releases an order only when the design is approved and a downpayment is recorded", () => {
    const store = createBillingStore({ now: fixedNow, storage: createMemoryStorage() })
    // Downpayment recorded, design still needs revision.
    expect(() =>
      store.getState().advanceOrderStage("NPS-20261106-012", "Cutting", "staff-001", "Manual entry"),
    ).toThrow("Design Review")
    const released = store.getState().simulateDesignApproval("NPS-20261106-012")
    expect(released).toMatchObject({ designStatus: "Approved", status: "In Production" })
    // Approved design but no downpayment yet.
    const unpaid = store.getState().simulateDesignApproval("NPS-20261106-001")
    expect(unpaid.status).toBe("Awaiting Release")
    expect(() => store.getState().simulateDesignApproval("NPS-20261106-001")).toThrow("already approved")
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
    ).toThrow("Design Review")

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
    ).toBe("Ready for Pickup")
  })

  it("blocks an unsettled claim and posts commission only after a fully paid claim", () => {
    const store = createBillingStore({
      now: () => new Date("2026-11-19T10:00:00.000Z"),
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

      postedAt: "2026-11-06T10:00:00.000Z",
    })
    expect(
      store.getState().orders.find((order) => order.id === "NPS-20261106-007")
        ?.claim?.claimedAt,
    ).toBe("2026-11-06T10:00:00.000Z")
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
    ).toBe("Ready for Pickup")
  })

  it("switches a ready order between pick-up and delivery before release", () => {
    const store = createBillingStore({ now: fixedNow, storage: createMemoryStorage() })
    expect(() =>
      store.getState().changeClaimMethod("NPS-20261106-007", "Delivery", " "),
    ).toThrow("delivery address is required")
    const delivery = store
      .getState()
      .changeClaimMethod("NPS-20261106-007", "Delivery", " Basak, Mandaue City ")
    expect(delivery).toMatchObject({
      status: "Ready for Delivery",
      claim: { method: "Delivery", deliveryAddress: "Basak, Mandaue City" },
    })
    const pickup = store.getState().changeClaimMethod("NPS-20261106-007", "Pick-up")
    expect(pickup).toMatchObject({ status: "Ready for Pickup", claim: { method: "Pick-up" } })
    expect(pickup.claim.deliveryAddress).toBeUndefined()
    // In production: only the method changes.
    expect(
      store.getState().changeClaimMethod("NPS-20261106-002", "Delivery", "Looc, Mandaue City").status,
    ).toBe("In Production")
    expect(() =>
      store.getState().changeClaimMethod("NPS-20261106-008", "Pick-up"),
    ).toThrow("already been claimed")
  })

  it("releases a fully paid delivery order and posts its commission", () => {
    const store = createBillingStore({ now: fixedNow, storage: createMemoryStorage() })
    const claimed = store.getState().claimOrder({
      orderId: "NPS-20261106-013",
      method: "Delivery",
      deliveryAddress: "Unit 3B, Alang-Alang, Mandaue City, Cebu",
    })
    expect(claimed).toMatchObject({ status: "Claimed", claim: { method: "Delivery" } })
    expect(
      store.getState().commissions.find((item) => item.orderId === "NPS-20261106-013"),
    ).toMatchObject({ salesPersonId: "staff-003", pieces: 6, amount: 120 })
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
      now: () => new Date("2026-11-19T10:00:00.000Z"),
      storage: createMemoryStorage(),
    })

    const member = store
      .getState()
      .enrollNpcMember("customer-005")

    expect(member).toMatchObject({
      npcNumber: "NPC-B-000105",

      customerId: "customer-005",

      tier: "Bronze",

      points: 0,

      joinedAt: "2026-11-06T10:00:00.000Z",
    })

    expect(
      store.getState().customers.find((item) => item.id === "customer-005")
        ?.npcNumber,
    ).toBe("NPC-B-000105")

    expect(() => store.getState().enrollNpcMember("customer-001")).toThrow(
      "already an NPC member",
    )
  })

  it("queues offline writes with timestamps and replays them in order", async () => {
    const replayed: string[] = []
    const store = createBillingStore({
      now: () => new Date("2026-11-19T10:00:00.000Z"),
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

      claimMethod: "Pick-up",
    })

    store.getState().simulateDesignApproval(order.id)

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

    expect(store.getState().orders).toHaveLength(14)
    expect(store.getState().queuedActions.map((action) => action.type)).toEqual([
      "createOrder",
      "designApproved",
      "recordPayment",
      "advanceStage",
      "enrollNpcMember",
      "claimOrder",
    ])
    expect(store.getState().queuedActions[3].payload).toMatchObject({
      orderId: order.id,
      order: {
        stage: "Printing/Sewing",
        stageLog: [
          expect.objectContaining({
            orderId: order.id,
            stage: "Cutting",
            staffId: "staff-001",
            at: "2026-11-19T10:00:00.000Z",
            via: "Manual entry",
          }),
        ],
      },
    })
    expect(
      store.getState().queuedActions.every(
        (action) => action.queuedAt === "2026-11-19T10:00:00.000Z",
      ),
    ).toBe(true)
    expect(store.getState().queuedActions.map((action) => action.id)).toEqual([
      "QUEUE-000001",
      "QUEUE-000002",
      "QUEUE-000003",
      "QUEUE-000004",
      "QUEUE-000005",
      "QUEUE-000006",
    ])

    await store.getState().setOnline(true)

    expect(replayed).toEqual([
      "createOrder",
      "designApproved",
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
      claimMethod: "Pick-up",
    })
    firstStore.getState().enrollNpcMember("customer-005")

    const restoredStore = createBillingStore({ now: fixedNow, storage })

    expect(restoredStore.getState().customers).toHaveLength(8)

    expect(
      restoredStore

        .getState()

        .customers.find((item) => item.id === "customer-005")?.npcNumber,
    ).toBe("NPC-B-000105")
    expect(restoredStore.getState().queuedActions).toHaveLength(2)
    expect(restoredStore.getState().isOnline).toBe(false)

    restoredStore.getState().resetDemoData()

    expect(restoredStore.getState().npcMembers).toHaveLength(4)

    expect(restoredStore.getState().customers[4].npcNumber).toBeUndefined()

    expect(restoredStore.getState().queuedActions).toEqual([])

    const resetStore = createBillingStore({ now: fixedNow, storage })
    expect(resetStore.getState().orders).toHaveLength(13)
    expect(resetStore.getState().commissions).toHaveLength(4)
  })
})
