import { useEffect, useState } from "react"
import { Button, Card, FieldLabel, Input, LockIcon } from "../components/ui"
import { customerFor, money, orderItemSummary, orderTotal } from "../components/billingView"
import { getRemainingBalance } from "../lib/billing"
import { useBillingStore } from "../store/billingStore"

export function Claim() {
  const data = useBillingStore((state) => state)
  const claimOrder = useBillingStore((state) => state.claimOrder)
  const readyOrders = data.orders.filter((order) => order.status === "Ready for Claim")
  const [selectedId, setSelectedId] = useState(readyOrders[0]?.id ?? "")
  const [method, setMethod] = useState<"Pick-up" | "Delivery" | "">("")
  const [address, setAddress] = useState("")
  const [saved, setSaved] = useState("")
  const [error, setError] = useState("")
  const order = readyOrders.find((item) => item.id === selectedId)
  const total = order ? orderTotal(data, order) : 0
  const remaining = order ? getRemainingBalance(order, total) : 0

  useEffect(() => {
    setMethod(order?.claim?.method ?? "")
    setAddress(order?.claim?.deliveryAddress ?? "")
    setSaved("")
    setError("")
  }, [selectedId])

  const save = () => {
    if (!order || !method) return
    if (method === "Delivery" && !address.trim()) {
      setError("A delivery address is required.")
      setSaved("")
      return
    }
    try {
      const claimed = claimOrder({
        orderId: order.id,
        method,
        deliveryAddress: method === "Delivery" ? address : undefined,
      })
      setSaved(`${claimed.id} marked as Claimed.`)
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not release order.")
      setSaved("")
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="overflow-hidden">
        <div className="panel-title">Ready for Claim</div>
        {readyOrders.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            className={`order-list-item ${selectedId === item.id ? "selected" : ""}`}
          >
            <span className="eyebrow">{item.id}</span>
            <strong>{customerFor(data, item.customerId)?.name}</strong>
            <small>{orderItemSummary(data, item)}</small>
          </button>
        ))}
        {!readyOrders.length && <div className="empty-state">No orders ready for claim.</div>}
      </Card>
      {order ? (
        <Card className="p-5">
          <div className="rounded-lg bg-stone-100 p-4">
            <FieldLabel>Order ID</FieldLabel>
            <div className="flex items-center gap-2 text-lg font-black">
              <LockIcon />{order.id}
            </div>
            <p className="mt-1 text-sm text-stone-600">{customerFor(data, order.customerId)?.name} · {orderItemSummary(data, order)}</p>
            <p className="mt-1 text-sm font-bold">Remaining balance: {money(remaining)}</p>
          </div>
          {remaining > 0 && order.creditTermDays === undefined && (
            <div className="alert-banner mt-4">
              Remaining balance must be settled before release.
            </div>
          )}
          {order.creditTermDays !== undefined && remaining > 0 && (
            <div className="success-banner mt-4">
              Approved {order.creditTermDays}-day credit term. Release is allowed.
            </div>
          )}
          <div className="my-5">
            <FieldLabel>Claim Method</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {(["Pick-up", "Delivery"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setMethod(choice)}
                  className={`choice-card ${method === choice ? "selected" : ""}`}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
          {method === "Delivery" && (
            <div>
              <FieldLabel>Delivery Address</FieldLabel>
              <Input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Complete delivery address"
              />
            </div>
          )}
          {method === "Pick-up" && (
            <p className="rounded-lg bg-[#edf6e9] p-3 text-sm font-semibold text-green-900">
              Customer will claim this order at the shop counter.
            </p>
          )}
          {error && <div className="alert-banner mt-4" role="alert">{error}</div>}
          {saved && <div className="success-banner mt-4">{saved}</div>}
          <Button
            className="mt-5 w-full"
            onClick={save}
            disabled={!method}
          >
            Mark as Claimed
          </Button>
        </Card>
      ) : saved ? (
        <Card className="p-5">
          <div className="success-banner" role="status">{saved}</div>
          <p className="mt-3 text-sm text-stone-600">
            The order has been released and is no longer in the Ready for Claim list.
          </p>
        </Card>
      ) : <Card className="empty-state">No orders are ready for claim.</Card>}
    </div>
  )
}
