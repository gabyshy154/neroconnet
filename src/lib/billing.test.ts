import { describe, expect, it } from "vitest"

import { SCAN_BASE_URL, type BillingConfig } from "../config"

import type { Order, OrderLine } from "../types"

import {
  advanceStage,
  buildScanLink,
  calculateNpcPoints,
  calculatePricing,
  createCommissionEntry,
  generateNpcNumber,
  generateOrderId,
  getPaymentStatus,
  getRemainingBalance,
  getTotalPieces,
  isOrderOverdue,
  isValidPhPhone,
  parseScanLink,
  validateClaimRelease,
} from "./billing"

const line = (
  quantity: number,

  pricePerPiece = 100,

  size = "M",
): OrderLine => ({
  productTypeId: "shirt",

  printingType: "Full Sublimation",

  printLocation: "Front",

  sizes: { [size]: quantity },

  pricePerPiece,
})

const baseOrder = (overrides: Partial<Order> = {}): Order => ({
  id: "NPS-20261106-001",

  customerId: "customer-1",

  salesPersonId: "staff-1",

  lines: [line(10)],

  deadline: "2026-11-07",

  rush: false,

  status: "In Production",

  stageLog: [],

  payments: [
    {
      id: "payment-1",

      orderId: "NPS-20261106-001",

      method: "Cash",

      amount: 100,

      recordedBy: "staff-1",

      recordedAt: "2026-11-06T09:00:00.000Z",

      receiptIssued: false,
    },
  ],

  createdAt: "2026-11-06T08:00:00.000Z",

  ...overrides,
})

describe("pricing breakdown", () => {
  it("calculates pieces and subtotal from all lines", () => {
    const result = calculatePricing({
      lines: [line(2, 125), line(3, 80, "L")],
    })

    expect(result.totalPieces).toBe(5)

    expect(result.subtotal).toBe(490)

    expect(result.grandTotal).toBe(490)
  })

  it("applies membership and the highest applicable volume discount as separate rows", () => {
    const result = calculatePricing({ lines: [line(50)], tier: "Silver" })

    expect(result.discounts).toEqual([
      { label: "Silver membership discount", amount: 250 },

      { label: "Volume discount", amount: 500 },
    ])

    expect(result.totalDiscount).toBe(750)

    expect(result.grandTotal).toBe(4250)
  })

  it("adds rush and credit charges to the pre-tax total", () => {
    const result = calculatePricing({
      lines: [line(2, 1000)],

      rush: true,

      creditTermDays: 15,
    })

    expect(result.rushSurcharge).toBe(300)

    expect(result.creditCharge).toBe(460)

    expect(result.grandTotal).toBe(2760)

    expect(result.grandTotal).toBe(
      result.subtotal -
        result.totalDiscount +
        result.rushSurcharge +
        result.creditCharge,
    )
  })

  it("applies the 30-day credit charge to the discounted, surcharged total", () => {
    const result = calculatePricing({
      lines: [line(1, 1000)],

      creditTermDays: 30,
    })

    expect(result.creditCharge).toBe(300)

    expect(result.grandTotal).toBe(1300)
  })

  it("uses configured rates and rounds monetary values to cents", () => {
    const config: BillingConfig = {
      tierDiscountRates: {
        Bronze: 0.03,

        Silver: 0.05,

        Gold: 0.08,

        Platinum: 0.1,
      },

      volumeDiscountTiers: [],

      rushSurchargeRate: 0,

      creditTermRates: { 15: 0.2, 30: 0.3 },

      commissionPerPiece: 20,

      npcPointsPerPeso: 1000,
    }

    const result = calculatePricing(
      { lines: [line(3, 10.01)], tier: "Bronze" },

      config,
    )

    expect(result.subtotal).toBe(30.03)

    expect(result.totalDiscount).toBe(0.9)

    expect(result.grandTotal).toBe(29.13)
  })

  it("rejects negative or fractional quantities and negative prices", () => {
    expect(() => calculatePricing({ lines: [line(-1)] })).toThrow(RangeError)

    expect(() => calculatePricing({ lines: [line(1.5)] })).toThrow(RangeError)

    expect(() => calculatePricing({ lines: [line(1, -1)] })).toThrow(RangeError)
  })
})

describe("payment totals and status", () => {
  it("sums pieces, calculates the remaining balance, and derives payment status", () => {
    const firstPayment = baseOrder().payments[0]

    const order = baseOrder({
      lines: [line(2, 100), line(3, 100, "L")],

      payments: [
        firstPayment,

        { ...firstPayment, id: "payment-2", amount: 200 },
      ],
    })

    expect(getTotalPieces(order.lines)).toBe(5)

    expect(getRemainingBalance(order, 500)).toBe(200)

    expect(getPaymentStatus(order, 500)).toBe("Partially Paid")

    expect(getPaymentStatus({ ...order, payments: [] }, 500)).toBe("Unpaid")

    expect(getPaymentStatus(order, 300)).toBe("Paid in Full")
  })

  it("never reports a negative balance", () => {
    expect(getRemainingBalance(baseOrder(), 50)).toBe(0)
  })
})

describe("order lifecycle", () => {
  it("requires a downpayment before entering Cutting", () => {
    const result = advanceStage(
      baseOrder({
        stage: undefined,

        status: "Pending Downpayment",

        payments: [],
      }),
    )

    expect(result).toEqual({ ok: false, reason: "downpayment-required" })
  })

  it("advances by one stage and sets Ready for Claim after Quality Control", () => {
    const cutting = advanceStage(baseOrder({ stage: undefined }))

    expect(cutting).toMatchObject({ ok: true, order: { stage: "Cutting" } })

    if (!cutting.ok) throw new Error("Expected Cutting transition.")

    const printing = advanceStage(cutting.order)

    expect(printing).toMatchObject({
      ok: true,

      order: { stage: "Printing/Sewing" },
    })

    if (!printing.ok) throw new Error("Expected Printing/Sewing transition.")

    const heatPress = advanceStage(printing.order)

    expect(heatPress).toMatchObject({
      ok: true,

      order: { stage: "Heat Press" },
    })

    if (!heatPress.ok) throw new Error("Expected Heat Press transition.")

    const qualityControl = advanceStage(heatPress.order)

    expect(qualityControl).toMatchObject({
      ok: true,

      order: { stage: "Quality Control" },
    })

    if (!qualityControl.ok) {
      throw new Error("Expected Quality Control transition.")
    }

    expect(advanceStage(qualityControl.order)).toMatchObject({
      ok: true,

      order: { stage: "Quality Control", status: "Ready for Claim" },
    })
  })

  it("does not advance an order after it is ready or claimed", () => {
    expect(
      advanceStage(
        baseOrder({ status: "Ready for Claim", stage: "Quality Control" }),
      ),
    ).toEqual({ ok: false, reason: "already-ready" })

    expect(
      advanceStage(baseOrder({ status: "Claimed", stage: "Quality Control" })),
    ).toEqual({ ok: false, reason: "already-claimed" })
  })
})

describe("claim release", () => {
  it("requires a ready order and a settled balance unless a credit term exists", () => {
    const readyOrder = baseOrder({
      stage: "Quality Control",

      status: "Ready for Claim",

      payments: [],
    })

    expect(validateClaimRelease(readyOrder, 1000)).toEqual({
      allowed: false,

      reason: "balance-unsettled",

      remainingBalance: 1000,
    })

    expect(
      validateClaimRelease({ ...readyOrder, creditTermDays: 15 }, 1000),
    ).toEqual({ allowed: true, remainingBalance: 1000 })

    expect(
      validateClaimRelease(
        { ...readyOrder, payments: baseOrder().payments },

        100,
      ),
    ).toEqual({ allowed: true, remainingBalance: 0 })

    expect(
      validateClaimRelease(baseOrder({ payments: [] }), 1000),
    ).toMatchObject({ allowed: false, reason: "not-ready" })
  })
})

describe("IDs, commissions, NPC points, overdue orders, and phone validation", () => {
  it("formats sequential Order IDs and NPC numbers", () => {
    expect(generateOrderId("2026-11-06", 1)).toBe("NPS-20261106-001")

    expect(generateOrderId(new Date("2026-11-06T10:00:00.000Z"), 12)).toBe(
      "NPS-20261106-012",
    )

    expect(generateNpcNumber(1)).toBe("NPC-000001")

    expect(generateNpcNumber(999999)).toBe("NPC-999999")

    expect(() => generateOrderId("2026-11-06", 0)).toThrow(RangeError)

    expect(() => generateNpcNumber(1000000)).toThrow(RangeError)
  })

  it("creates commission only for claimed, fully paid orders", () => {
    const claimedAndPaid = baseOrder({
      status: "Claimed",

      payments: [{ ...baseOrder().payments[0], amount: 1000 }],
    })

    expect(
      createCommissionEntry(
        claimedAndPaid,

        1000,

        "2026-11-06T12:00:00Z",
      ),
    ).toEqual({
      orderId: claimedAndPaid.id,

      salesPersonId: "staff-1",

      pieces: 10,

      amount: 200,

      postedAt: "2026-11-06T12:00:00Z",
    })

    expect(
      createCommissionEntry(
        { ...claimedAndPaid, status: "Ready for Claim" },

        1000,

        "now",
      ),
    ).toBeUndefined()

    expect(
      createCommissionEntry({ ...claimedAndPaid, payments: [] }, 1000, "now"),
    ).toBeUndefined()
  })

  it("awards one NPC point per ₱1,000 paid", () => {
    expect(calculateNpcPoints(0)).toBe(0)

    expect(calculateNpcPoints(1999.99)).toBe(1)

    expect(calculateNpcPoints(2000)).toBe(2)

    expect(() => calculateNpcPoints(-1)).toThrow(RangeError)
  })

  it("marks only past-deadline unclaimed orders overdue", () => {
    expect(
      isOrderOverdue(baseOrder({ deadline: "2026-11-05" }), "2026-11-06"),
    ).toBe(true)

    expect(
      isOrderOverdue(baseOrder({ deadline: "2026-11-06" }), "2026-11-06"),
    ).toBe(false)

    expect(
      isOrderOverdue(
        baseOrder({ deadline: "2026-11-05", status: "Claimed" }),

        "2026-11-06",
      ),
    ).toBe(false)
  })

  it("validates Philippine mobile numbers in local and international formats", () => {
    expect(isValidPhPhone("0917 123 4567")).toBe(true)

    expect(isValidPhPhone("+639171234567")).toBe(true)

    expect(isValidPhPhone("+63 917-123-4567")).toBe(true)

    expect(isValidPhPhone("0817 123 4567")).toBe(false)

    expect(isValidPhPhone("0917 123 456")).toBe(false)
  })

  it("builds hash-based scan links from the configured base URL", () => {
    expect(buildScanLink("NPS-20261106-002")).toBe(
      `${SCAN_BASE_URL}#/scan/NPS-20261106-002`,
    )
    expect(() => buildScanLink("NPC-000001")).toThrow(RangeError)
  })

  it("parses scan links and bare Order IDs", () => {
    expect(parseScanLink("NPS-20261106-002")).toBe("NPS-20261106-002")
    expect(
      parseScanLink("https://neroconnect.local/#/scan/NPS-20261106-002"),
    ).toBe("NPS-20261106-002")
    expect(
      parseScanLink(
        "https://neroconnect.local/#/scan/NPS-20261106-002?via=manual",
      ),
    ).toBe("NPS-20261106-002")
    expect(
      parseScanLink("https://neroconnect.local/scan/NPS-20261106-002"),
    ).toBe("NPS-20261106-002")
    expect(parseScanLink("https://neroconnect.local/#/orders")).toBeUndefined()
  })
})
