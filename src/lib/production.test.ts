import { describe, expect, it } from "vitest"
import {
  getScanVia,
  getProductionBlockMessage,
  getProductionBlockReason,
} from "./production"
import type { Order } from "../types"

const order: Order = {
  id: "NPS-20261106-001",
  customerId: "customer-001",
  salesPersonId: "staff-001",
  lines: [],
  deadline: "2026-11-20",
  rush: false,
  stage: "Printing/Sewing",
  status: "In Production",
  payments: [],
  stageLog: [],
  createdAt: "2026-11-06T08:00:00.000Z",
}

describe("production station rules", () => {
  it("allows completion only at the order's current station", () => {
    expect(getProductionBlockReason(order, "Printing/Sewing")).toBeUndefined()
    expect(getProductionBlockReason(order, "Cutting")).toBe("wrong-station")
  })

  it("blocks orders at the wrong station with the current station in the message", () => {
    expect(getProductionBlockReason(order, "Cutting")).toBe("wrong-station")
    expect(getProductionBlockMessage("wrong-station", order.stage)).toBe(
      "This order is at Printing/Sewing. Switch to the Printing/Sewing station to update it.",
    )
  })

  it("blocks unknown orders", () => {
    expect(getProductionBlockReason(undefined, "Cutting")).toBe("unknown-order")
    expect(getProductionBlockMessage("unknown-order")).toBe(
      "Order not found. Check the QR code or enter the Order ID.",
    )
  })

  it("blocks orders that have not started", () => {
    const pendingOrder = { ...order, status: "Pending Downpayment" as const }

    expect(getProductionBlockReason(pendingOrder, "Cutting")).toBe(
      "downpayment-required",
    )
    expect(getProductionBlockMessage("downpayment-required")).toBe(
      "Record the downpayment before starting production.",
    )
  })

  it.each(["Ready for Claim", "Claimed"] as const)(
    "blocks finished %s orders",
    (status) => {
      expect(
        getProductionBlockReason({ ...order, status }, "Quality Control"),
      ).toBe(status === "Claimed" ? "already-claimed" : "already-ready")
      expect(
        getProductionBlockMessage(
          status === "Claimed" ? "already-claimed" : "already-ready",
        ),
      ).toBe("This order has finished production.")
    },
  )

  it("treats a production order without an explicit stage as Cutting", () => {
    const unstagedOrder = { ...order, stage: undefined }

    expect(
      getProductionBlockReason(unstagedOrder, "Cutting"),
    ).toBeUndefined()
    expect(
      getProductionBlockReason(unstagedOrder, "Heat Press"),
    ).toBe("wrong-station")
  })

  it("uses the route source to distinguish manual entry from phone scans", () => {
    expect(getScanVia("#/scan/NPS-20261106-001")).toBe("Phone scan")
    expect(getScanVia("#/scan/NPS-20261106-001?via=manual")).toBe(
      "Manual entry",
    )
  })
})
