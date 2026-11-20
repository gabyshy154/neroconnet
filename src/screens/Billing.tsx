import { useEffect, useState } from "react"
import { Button, Badge, Card, FieldLabel, Input } from "../components/ui"
import { customerFor, money, orderItemSummary, orderTotal } from "../components/billingView"
import {
  getPaymentStatus,
  getRemainingBalance,
  validatePaymentAmount,
} from "../lib/billing"
import { billingStore, useBillingStore } from "../store/billingStore"

const billingSnapshot = () => billingStore.getState()
import type { PaymentMethod } from "../types"

const METHODS: PaymentMethod[] = ["Cash", "GCash", "Bank Transfer"]

export function Billing({ initialOrderId }: { initialOrderId?: string } = {}) {
  const data = useBillingStore((state) => state)
  const recordPayment = useBillingStore((state) => state.recordPayment)
  const signedInStaffId = useBillingStore((state) => state.signedInStaffId)
  const [selectedId, setSelectedId] = useState(initialOrderId ?? data.orders[0]?.id ?? "")
  const [method, setMethod] = useState<PaymentMethod | "">("")
  const [amount, setAmount] = useState("")
  const [receiptIssued, setReceiptIssued] = useState(false)
  const [referenceCode, setReferenceCode] = useState("")
  const [confirmCash, setConfirmCash] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const order = data.orders.find((item) => item.id === selectedId)
  const total = order ? orderTotal(order) : 0
  const remaining = order ? getRemainingBalance(order, total) : 0
  const customer = order ? customerFor(data, order.customerId) : undefined
  // The breakdown saved when the order was confirmed (a later tier change never alters it).
  const breakdown = order?.pricing

  useEffect(() => {
    if (!order) return
    const suggested = Math.round(total * 0.5 * 100) / 100
    setAmount(suggested.toFixed(2))
    setMethod("")
    setReceiptIssued(false)
    setReferenceCode("")
    setConfirmCash(false)
    setMessage("")
    setError("")
  }, [selectedId, order?.id])

  const savePayment = () => {
    if (!order || !method || !signedInStaffId) return
    if (method === "Cash" && !confirmCash) {
      try {
        validatePaymentAmount(order, total, Number(amount))
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Invalid payment amount.")
        setMessage("")
        return
      }
      setConfirmCash(true)
      setError("")
      return
    }
    try {
      const tierBefore = data.npcMembers.find((item) => item.npcNumber === customer?.npcNumber)?.tier
      recordPayment(order.id, {
        method,
        amount: Number(amount),
        recordedBy: signedInStaffId,
        referenceCode,
        receiptIssued,
      })
      const after = billingSnapshot()
      const updatedOrder = after.orders.find((item) => item.id === order.id)
      const tierAfter = after.npcMembers.find((item) => item.npcNumber === customer?.npcNumber)?.tier
      const notes = [
        method === "Cash"
          ? `Cash received and verified by ${data.staff.find((item) => item.id === signedInStaffId)?.name}.`
          : "Recorded as received. Not processed here.",
        order.status === "Awaiting Release" && updatedOrder?.status === "In Production"
          ? "Released for production. Materials deducted from inventory."
          : order.status === "Awaiting Release" && updatedOrder?.status === "Awaiting Release"
            ? "Downpayment recorded. Production starts once the design is approved in the Admin Portal."
            : "",
        tierBefore && tierAfter && tierBefore !== tierAfter
          ? `NPC tier upgraded from ${tierBefore} to ${tierAfter}.`
          : "",
      ]
      setMessage(notes.filter(Boolean).join(" "))
      setReferenceCode("")
      setError("")
      setConfirmCash(false)
      setAmount("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record payment.")
      setMessage("")
      setConfirmCash(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="overflow-hidden">
        <div className="panel-title">Orders</div>
        {data.orders.map((item) => (
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
        {!data.orders.length && <div className="empty-state">No orders to bill.</div>}
      </Card>
      {order ? (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="eyebrow">{order.id}</span>
                <h2 className="text-xl font-black">{customer?.name}</h2>
                <p className="text-sm text-stone-500">{orderItemSummary(data, order)}</p>
              </div>
              <div className="text-right">
                <span className="eyebrow">Order total</span>
                <strong className="block text-3xl">{money(total)}</strong>
                <Badge
                  tone={
                    getPaymentStatus(order, total) === "Paid in Full"
                      ? "green"
                      : order.payments.length
                        ? "amber"
                        : "red"
                  }
                >
                  {getPaymentStatus(order, total)}
                </Badge>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-4">
              <FieldLabel>Payment method</FieldLabel>
              <p className="text-sm font-semibold text-amber-800">
                Record payment method. Payments are not processed here.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {METHODS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMethod(item)
                    setConfirmCash(false)
                  }}
                  className={`choice-card ${method === item ? "selected" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>
            {method === "GCash" || method === "Bank Transfer" ? (
              <p className="mt-3 text-sm font-semibold text-stone-600" role="status">
                Recorded as received. Not processed here.
              </p>
            ) : null}
            {method && (
              <div className="mt-4">
                <FieldLabel>
                  Reference code {method === "Cash" ? "(optional)" : "*"}
                </FieldLabel>
                <Input
                  value={referenceCode}
                  maxLength={40}
                  onChange={(event) => setReferenceCode(event.target.value)}
                  placeholder={method === "Cash" ? "Optional for cash" : `${method} reference number`}
                />
              </div>
            )}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Payment Amount (₱)</FieldLabel>
                <Input
                  type="number"
                  min="0.01"
                  max={remaining}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Suggested downpayment (50%): {money(total * 0.5)}
                </p>
              </div>
              <div className={`balance-box ${remaining ? "due" : "paid"}`}>
                <span>Remaining Balance</span>
                <strong>{money(remaining)}</strong>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-100 p-3">
              <div>
                <strong className="block text-sm">Non-VAT Sales Invoice</strong>
                <span className="text-xs text-stone-500">Record issuance status</span>
              </div>
              <div className="segmented">
                {[false, true].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    className={receiptIssued === value ? "active" : ""}
                    onClick={() => setReceiptIssued(value)}
                  >
                    {value ? "Issued" : "Not Issued"}
                  </button>
                ))}
              </div>
            </div>
            {confirmCash && (
              <div className="alert-banner mt-4">
                Confirm: Cash received and verified by{" "}
                {data.staff.find((item) => item.id === signedInStaffId)?.name}?
              </div>
            )}
            {error && <div className="alert-banner mt-4" role="alert">{error}</div>}
            {message && <div className="success-banner mt-4">{message}</div>}
            <Button
              className="mt-4 w-full"
              disabled={!method || !amount || remaining <= 0 || (method !== "Cash" && !referenceCode.trim())}
              onClick={savePayment}
            >
              {confirmCash ? "Confirm Cash Received" : "Save Payment Record"}
            </Button>
          </Card>
          <Card className="overflow-hidden">
            <div className="panel-title">Itemized breakdown</div>
            <div className="divide-y divide-stone-200 p-4 text-sm">
              <div className="flex justify-between py-1"><span>Subtotal</span><strong>{money(breakdown?.subtotal ?? 0)}</strong></div>
              {breakdown?.tier && (
                <div className="flex justify-between py-1 text-xs text-stone-500">
                  <span>NPC tier at order time</span><strong>{breakdown.tier}</strong>
                </div>
              )}
              {breakdown?.discounts.map((discount) => (
                <div key={discount.label} className="flex justify-between py-1">
                  <span>{discount.label}</span><strong>−{money(discount.amount)}</strong>
                </div>
              ))}
              {Boolean(breakdown?.rushSurcharge) && (
                <div className="flex justify-between py-1"><span>Rush surcharge</span><strong>{money(breakdown?.rushSurcharge ?? 0)}</strong></div>
              )}
              {Boolean(breakdown?.creditCharge) && (
                <div className="flex justify-between py-1"><span>Credit term charge</span><strong>{money(breakdown?.creditCharge ?? 0)}</strong></div>
              )}
              <div className="flex justify-between py-2 text-base font-black"><span>Grand total</span><strong>{money(total)}</strong></div>
              <div className="flex justify-between border-t border-stone-200 py-2 font-bold">
                <span>Remaining balance</span><strong>{money(remaining)}</strong>
              </div>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="panel-title">Payment history</div>
            {order.payments.length ? (
              <div className="overflow-x-auto">
                <table>
                  <thead><tr><th>Recorded at</th><th>Method</th><th>Reference code</th><th>Amount</th><th>Staff</th><th>Non-VAT Sales Invoice</th></tr></thead>
                  <tbody>
                    {order.payments.map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.recordedAt).toLocaleString("en-PH")}</td>
                        <td>{item.method}</td>
                        <td>{item.referenceCode ?? "—"}</td>
                        <td>{money(item.amount)}</td>
                        <td>{data.staff.find((staff) => staff.id === item.recordedBy)?.name}</td>
                        <td>{item.receiptIssued ? "Issued" : "Not Issued"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state">No payments have been recorded.</div>}
          </Card>
        </div>
      ) : <Card className="empty-state">Select an order to record payment.</Card>}
    </div>
  )
}
