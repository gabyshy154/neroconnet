import { useEffect, useState } from "react"
import { Badge, Button, Card, FieldLabel, Input, LockIcon } from "../components/ui"
import { customerFor, money, orderItemSummary, orderPieces, orderTotal } from "../components/billingView"
import { getPaidTotal, getRemainingBalance, isReadyForClaim, maskPhone } from "../lib/billing"
import { useBillingStore } from "../store/billingStore"
import type { ClaimMethod, Order } from "../types"

/**
 * Release (hand-over) of finished orders. The claim method was chosen at order entry, so this
 * screen confirms it: settle the balance, check the Order ID, then mark the order Claimed.
 */
export function Claim({ onOpenBilling }: { onOpenBilling: (orderId: string) => void }) {
  const data = useBillingStore((state) => state)
  const claimOrder = useBillingStore((state) => state.claimOrder)
  const changeClaimMethod = useBillingStore((state) => state.changeClaimMethod)
  const readyOrders = data.orders.filter((order) => isReadyForClaim(order.status))
  const [selectedId, setSelectedId] = useState(readyOrders[0]?.id ?? "")
  const [changing, setChanging] = useState(false)
  const [newMethod, setNewMethod] = useState<ClaimMethod>("Pick-up")
  const [newAddress, setNewAddress] = useState("")
  const [saved, setSaved] = useState("")
  const [error, setError] = useState("")
  const order = readyOrders.find((item) => item.id === selectedId)
  const customer = order ? customerFor(data, order.customerId) : undefined
  const total = order ? orderTotal(order) : 0
  const paid = order ? getPaidTotal(order) : 0
  const remaining = order ? getRemainingBalance(order, total) : 0
  const onCredit = Boolean(order?.creditTermDays) && remaining > 0
  const blocked = remaining > 0 && !onCredit

  useEffect(() => {
    setChanging(false)
    setError("")
  }, [selectedId])

  const startChange = () => {
    if (!order) return
    setNewMethod(order.claim.method === "Pick-up" ? "Delivery" : "Pick-up")
    setNewAddress(order.claim.deliveryAddress ?? "")
    setChanging(true)
    setSaved("")
  }

  const saveChange = () => {
    if (!order) return
    try {
      const updated = changeClaimMethod(order.id, newMethod, newAddress)
      setSaved(`${updated.id} changed to ${updated.claim.method}. Now ${updated.status}.`)
      setChanging(false)
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not change the claim method.")
    }
  }

  const release = () => {
    if (!order) return
    try {
      const claimed = claimOrder({
        orderId: order.id,
        method: order.claim.method,
        deliveryAddress: order.claim.deliveryAddress,
      })
      setSaved(
        claimed.claim.method === "Delivery"
          ? `${claimed.id} delivered and marked as Claimed.`
          : `${claimed.id} picked up and marked as Claimed.`,
      )
      setError("")
      const next = readyOrders.find((item) => item.id !== claimed.id)
      setSelectedId(next?.id ?? "")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not release the order.")
      setSaved("")
    }
  }

  const listGroup = (method: ClaimMethod, title: string) => {
    const orders = readyOrders.filter((item) => item.claim.method === method)
    return (
      <>
        <div className="panel-title">{title} ({orders.length})</div>
        {orders.map((item) => (
          <OrderListButton
            key={item.id}
            order={item}
            customerName={customerFor(data, item.customerId)?.name}
            selected={selectedId === item.id}
            onSelect={() => {
              setSelectedId(item.id)
              setSaved("")
            }}
          />
        ))}
        {!orders.length && <div className="empty-state">None</div>}
      </>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="overflow-hidden">
        {listGroup("Pick-up", "Ready for Pickup")}
        {listGroup("Delivery", "Ready for Delivery")}
      </Card>

      {order ? (
        <Card className="space-y-4 p-5">
          {saved && <div className="success-banner" role="status">{saved}</div>}

          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-stone-100 p-4">
            <div>
              <FieldLabel>Order ID (check with the customer)</FieldLabel>
              <div className="flex items-center gap-2 text-lg font-black">
                <LockIcon />{order.id}
              </div>
              <p className="mt-1 text-sm font-bold">{customer?.name}</p>
              <p className="text-sm text-stone-600">{customer ? maskPhone(customer.phone) : ""}</p>
              <p className="mt-1 text-sm text-stone-600">
                {orderItemSummary(data, order)} · {orderPieces(order)} pcs
              </p>
            </div>
            <Badge tone="green">{order.status}</Badge>
          </div>

          <section>
            <h3 className="mb-2 text-sm font-extrabold">1. Payment</h3>
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div className="metric"><span>Order total</span><strong>{money(total)}</strong></div>
              <div className="metric"><span>Paid</span><strong>{money(paid)}</strong></div>
              <div className="metric"><span>Balance</span><strong>{money(remaining)}</strong></div>
            </dl>
            {remaining === 0 && (
              <p className="mt-2 text-sm font-semibold text-green-900">✓ Fully paid.</p>
            )}
            {blocked && (
              <div className="alert-banner mt-3" role="alert">
                <p>Collect the remaining {money(remaining)} before releasing this order.</p>
                <Button tone="secondary" className="mt-2" onClick={() => onOpenBilling(order.id)}>
                  Record payment in Billing
                </Button>
              </div>
            )}
            {onCredit && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                On a {order.creditTermDays}-day credit term: release is allowed, and the {money(remaining)} balance
                is due within {order.creditTermDays} days of release. Record it in Billing when the customer pays.
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-extrabold">2. Hand-over</h3>
            {!changing ? (
              <div className="rounded-lg border border-stone-200 p-3 text-sm">
                <p className="font-bold">{order.claim.method}</p>
                <p className="mt-1 text-stone-600">
                  {order.claim.method === "Delivery"
                    ? `Deliver to: ${order.claim.deliveryAddress}`
                    : "The customer picks up the order at the shop counter."}
                </p>
                <p className="mt-1 text-xs text-stone-500">Chosen when the order was created.</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-bold text-[#4f5d3c] underline"
                  onClick={startChange}
                >
                  Customer asked to switch to {order.claim.method === "Pick-up" ? "delivery" : "pick-up"}?
                </button>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-stone-300 p-3">
                <div className="grid grid-cols-2 gap-2">
                  {(["Pick-up", "Delivery"] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setNewMethod(choice)}
                      className={`choice-card ${newMethod === choice ? "selected" : ""}`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
                {newMethod === "Delivery" && (
                  <div>
                    <FieldLabel>Delivery Address *</FieldLabel>
                    <Input
                      value={newAddress}
                      onChange={(event) => setNewAddress(event.target.value)}
                      placeholder="Complete delivery address"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={saveChange}>Save change</Button>
                  <Button tone="secondary" onClick={() => setChanging(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </section>

          {error && <div className="alert-banner" role="alert">{error}</div>}

          <Button className="w-full" disabled={blocked || changing} onClick={release}>
            {order.claim.method === "Delivery"
              ? "3. Confirm delivered (mark as Claimed)"
              : "3. Confirm picked up (mark as Claimed)"}
          </Button>
        </Card>
      ) : (
        <Card className="p-5">
          {saved && <div className="success-banner mb-3" role="status">{saved}</div>}
          <div className="empty-state">
            {readyOrders.length
              ? "Select an order to release."
              : "No orders are ready for pickup or delivery. Orders appear here after Quality Control."}
          </div>
        </Card>
      )}
    </div>
  )
}

function OrderListButton({
  order,
  customerName,
  selected,
  onSelect,
}: {
  order: Order
  customerName?: string
  selected: boolean
  onSelect: () => void
}) {
  const remaining = getRemainingBalance(order, orderTotal(order))
  return (
    <button onClick={onSelect} className={`order-list-item ${selected ? "selected" : ""}`}>
      <span className="eyebrow">{order.id}</span>
      <strong>{customerName}</strong>
      <small>
        {remaining === 0
          ? "Fully paid"
          : order.creditTermDays
            ? `${money(remaining)} on credit`
            : `${money(remaining)} due`}
      </small>
    </button>
  )
}
