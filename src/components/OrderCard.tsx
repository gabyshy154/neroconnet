import type { BillingData } from "../store/billingStore"
import type { Order } from "../types"
import { QRCodeSVG } from "qrcode.react"
import { buildScanLink, isOrderOverdue, isReadyForClaim } from "../lib/billing"
import { navigateToProductionScan } from "../lib/production"
import { Badge, Button } from "./ui"
import { getToday } from "../config"
import { orderItemSummary, staffFor, STAGES } from "./billingView"

export function OrderCard({
  order,
  data,
  showSimulateScan = true,
}: {
  order: Order
  data: BillingData
  showSimulateScan?: boolean
}) {
  const customer = data.customers.find((item) => item.id === order.customerId)
  const currentStage =
    order.status === "In Production" ? order.stage ?? "Cutting" : order.stage
  const lifecycleComplete =
    isReadyForClaim(order.status) || order.status === "Claimed"
  const activeIndex = lifecycleComplete
    ? STAGES.length
    : currentStage
      ? STAGES.indexOf(currentStage)
      : -1
  const overdue = isOrderOverdue(order, getToday())

  return (
    <article className={`production-card ${overdue ? "overdue" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <QRCodeSVG
            value={buildScanLink(order.id)}
            size={52}
            level="M"
            title={`QR code for ${order.id}`}
            className="shrink-0 rounded bg-white p-1"
          />
          <span className="eyebrow break-all">{order.id}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {overdue && <Badge tone="red">Overdue</Badge>}
          {order.status === "Awaiting Release" && (
            <Badge tone="amber">Awaiting Release</Badge>
          )}
          {isReadyForClaim(order.status) && <Badge tone="green">{order.status}</Badge>}
          {order.status === "Claimed" && <Badge tone="green">Claimed</Badge>}
        </div>
      </div>
      <h3>{customer?.name ?? "Unknown customer"}</h3>
      <p>{orderItemSummary(data, order)}</p>
      <dl>
        <div>
          <dt>Deadline</dt>
          <dd>{order.deadline}</dd>
        </div>
        <div>
          <dt>Sales person</dt>
          <dd>{staffFor(data, order.salesPersonId)?.name ?? "Unassigned"}</dd>
        </div>
      </dl>
      <div className="progress">
        {STAGES.map((stage, index) => (
          <span
            key={stage}
            className={index < activeIndex ? "done" : index === activeIndex ? "current" : ""}
            title={stage}
            aria-label={`${stage}: ${
              index < activeIndex
                ? "done"
                : index === activeIndex
                  ? "current"
                  : "remaining"
            }`}
          >
            {index < activeIndex ? "✓" : index + 1}
          </span>
        ))}
      </div>
      <div className="production-card-stage">
        <span>Current stage</span>
        <strong>{currentStage ?? "Not started"}</strong>
      </div>
      {showSimulateScan && (
        <Button
          type="button"
          tone="secondary"
          className="mt-2 w-full"
          onClick={() => navigateToProductionScan(order.id, "Phone scan")}
        >
          Update stage
        </Button>
      )}
      {currentStage && (
        <span className="sr-only">Current stage: {currentStage}</span>
      )}
    </article>
  )
}
