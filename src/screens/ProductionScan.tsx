import { useEffect, useState } from "react"
import { Button, Card, FieldLabel, Input, Select } from "../components/ui"
import { OrderCard } from "../components/OrderCard"
import { STAGES } from "../components/billingView"
import { parseScanLink } from "../lib/billing"
import {
  getCurrentProductionStage,
  getProductionBlockMessage,
  getProductionBlockReason,
  navigateToProductionScan,
  PRODUCTION_STATION_STORAGE_KEY,
} from "../lib/production"
import { useBillingStore } from "../store/billingStore"
import type { Stage, StageLogEntry } from "../types"

function readSavedStation(): Stage {
  const savedStation = window.localStorage.getItem(
    PRODUCTION_STATION_STORAGE_KEY,
  )
  return STAGES.find((stage) => stage === savedStation) ?? "Cutting"
}

export function ProductionScan({
  orderId,
  via,
}: {
  orderId: string
  via: StageLogEntry["via"]
}) {
  const data = useBillingStore((state) => state)
  const advanceOrderStage = useBillingStore((state) => state.advanceOrderStage)
  const [station, setStation] = useState<Stage>(readSavedStation)
  const [manualCode, setManualCode] = useState(orderId)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{
    completedStage: Stage
    nextStage: string
  }>()

  const staff = data.staff.find((item) => item.id === data.signedInStaffId)
  const order = data.orders.find((item) => item.id === orderId)
  const currentStage = order ? getCurrentProductionStage(order) : undefined
  const blockReason = getProductionBlockReason(order, station)
  const blockMessage = blockReason
    ? getProductionBlockMessage(blockReason, currentStage)
    : ""
  const nextStage = currentStage === "Quality Control"
    ? "Ready for Claim"
    : currentStage
      ? STAGES[STAGES.indexOf(currentStage) + 1]
      : ""

  useEffect(() => {
    window.localStorage.setItem(PRODUCTION_STATION_STORAGE_KEY, station)
  }, [station])

  useEffect(() => {
    setManualCode(orderId)
    setError("")
    setSuccess(undefined)
  }, [orderId])

  const openManualOrder = () => {
    const parsedOrderId = parseScanLink(manualCode)
    if (!parsedOrderId) {
      setError(getProductionBlockMessage("unknown-order"))
      return
    }
    navigateToProductionScan(parsedOrderId, "Manual entry")
  }

  const completeStage = () => {
    if (!order || !currentStage || !staff || blockReason) return
    try {
      const updated = advanceOrderStage(order.id, station, staff.id, via)
      setSuccess({
        completedStage: currentStage,
        nextStage:
          updated.status === "Ready for Claim"
            ? "Ready for Claim"
            : updated.stage ?? "the next stage",
      })
      setError("")
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not complete the production stage.",
      )
    }
  }

  return (
    <main className="scan-route-page">
      <Card className="scan-route-card p-4">
        <div>
          <span className="eyebrow">Production Scan</span>
          <h1 className="mt-1 text-2xl font-black">Order stage check</h1>
        </div>

        <div className="scan-route-staff">
          <div>
            <FieldLabel>Production station</FieldLabel>
            <Select
              aria-label="Production station"
              className="scan-station-select"
              value={station}
              onChange={(event) => {
                setStation(event.target.value as Stage)
                setError("")
              }}
            >
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </Select>
          </div>
          <div className="scan-staff-name">
            <span>Signed-in staff</span>
            <strong>{staff?.name ?? "Not signed in"}</strong>
          </div>
        </div>

        <form
          className="scan-manual-form"
          onSubmit={(event) => {
            event.preventDefault()
            openManualOrder()
          }}
        >
          <div>
            <FieldLabel>QR Code / Number</FieldLabel>
            <Input
              aria-label="QR Code / Number"
              value={manualCode}
              onChange={(event) => {
                setManualCode(event.target.value)
                setError("")
              }}
              placeholder="Type Order ID or scan link"
              autoComplete="off"
            />
          </div>
          <Button type="submit" tone="secondary">
            Open order
          </Button>
        </form>

        {error && <div className="alert-banner" role="alert">{error}</div>}

        {!order ? (
          <div className="alert-banner" role="alert">
            {getProductionBlockMessage("unknown-order")}
          </div>
        ) : (
          <>
            <div className="scan-order-context" role="status">
              <span>Selected station: <strong>{station}</strong></span>
              <span>Staff member: <strong>{staff?.name ?? "Not signed in"}</strong></span>
            </div>
            <OrderCard
              order={order}
              data={data}
              showSimulateScan={false}
            />
            {success ? (
              <section className="scan-success" role="status" aria-live="polite">
                <span className="eyebrow">Stage complete</span>
                <h2>{success.completedStage} done.</h2>
                <p>
                  {success.completedStage} done. Moved to {success.nextStage}.
                </p>
                <strong>Scan next order to continue production.</strong>
              </section>
            ) : blockMessage ? (
              <div className="alert-banner" role="alert">{blockMessage}</div>
            ) : (
              <Button
                className="scan-complete-button"
                disabled={!staff || !currentStage}
                onClick={completeStage}
              >
                Mark {currentStage} done and move to {nextStage}
              </Button>
            )}
          </>
        )}
      </Card>
    </main>
  )
}
