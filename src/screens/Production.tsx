import { useState } from "react"
import { Button, Card, FieldLabel, Input } from "../components/ui"
import { OrderCard } from "../components/OrderCard"
import { STAGES } from "../components/billingView"
import {
  getProductionBlockMessage,
  navigateToProductionScan,
} from "../lib/production"
import { parseScanLink } from "../lib/billing"
import { useBillingStore } from "../store/billingStore"

export function Production() {
  const data = useBillingStore((state) => state)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")

  const openScanPage = () => {
    const orderId = parseScanLink(code)
    if (!orderId) {
      setError(getProductionBlockMessage("unknown-order"))
      return
    }
    setError("")
    navigateToProductionScan(orderId, "Manual entry")
  }

  const waitingOrders = data.orders.filter(
    (order) => order.status === "Pending Downpayment",
  )

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form
          className="production-manual-entry"
          onSubmit={(event) => {
            event.preventDefault()
            openScanPage()
          }}
        >
          <div className="min-w-0 flex-1">
            <FieldLabel>QR Code / Number</FieldLabel>
            <Input
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                setError("")
              }}
              placeholder="Type Order ID or scan link"
              autoComplete="off"
              className="production-scan-input"
            />
          </div>
          <Button
            type="submit"
            disabled={!code.trim()}
            className="production-find-button"
          >
            Open scan page
          </Button>
        </form>
        <p className="mt-2 text-sm text-stone-600">
          Enter an Order ID or scan link to open its Production Scan page.
        </p>
        {error && <div className="alert-banner mt-3" role="alert">{error}</div>}
      </Card>
      <Card className="overflow-hidden">
        <div className="panel-title">Waiting for downpayment</div>
        {waitingOrders.length ? (
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {waitingOrders.map((order) => (
              <OrderCard key={order.id} order={order} data={data} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No orders are waiting for downpayment.</div>
        )}
      </Card>
      <div className="kanban">
        {STAGES.map((stage, stageIndex) => {
          const stageOrders = data.orders.filter(
            (order) =>
              order.status === "In Production" &&
              (order.stage ?? "Cutting") === stage,
          )
          return (
            <section key={stage} className="kanban-column">
              <header>
                <span className="stage-number">{stageIndex + 1}</span>
                <strong>{stage}</strong>
                <span className="count">{stageOrders.length}</span>
              </header>
              <div className="space-y-3 p-3">
                {stageOrders.map((order) => (
                  <OrderCard key={order.id} order={order} data={data} />
                ))}
                {!stageOrders.length && <div className="empty-column">No orders</div>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
