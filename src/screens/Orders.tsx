import { useMemo, useState } from "react"
import { Badge, Button, Card, FieldLabel, Input, Select } from "../components/ui"
import { QRCodeSVG } from "qrcode.react"
import { buildScanLink } from "../lib/billing"
import {
  calculatePricing,
  getRemainingBalance,
  isOrderOverdue,
} from "../lib/billing"
import {
  customerFor,
  localToday,
  money,
  orderItemSummary,
  orderPaymentStatus,
  orderTotal,
  productsFor,
  staffFor,
} from "../components/billingView"
import { useBillingStore } from "../store/billingStore"
import type { OrderStatus } from "../types"

const ORDER_STATUSES: OrderStatus[] = [
  "Pending Downpayment",
  "In Production",
  "Ready for Claim",
  "Claimed",
]
type SortKey =
  | "id"
  | "customer"
  | "items"
  | "salesPerson"
  | "status"
  | "paymentStatus"
  | "claimMethod"
  | "deadline"

export function Orders() {
  const data = useBillingStore((state) => state)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("All")
  const [customerId, setCustomerId] = useState("All")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("id")
  const [sortAscending, setSortAscending] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [printTagOpen, setPrintTagOpen] = useState(false)
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return data.orders
      .filter((order) => {
        const customer = customerFor(data, order.customerId)
        const matchesSearch =
          !query ||
          `${order.id} ${customer?.name ?? ""} ${customer?.phone ?? ""} ${customer?.npcNumber ?? ""}`
            .toLowerCase()
            .includes(query)
        return (
          matchesSearch &&
          (status === "All" || order.status === status) &&
          (customerId === "All" || order.customerId === customerId) &&
          (!from || order.createdAt.slice(0, 10) >= from) &&
          (!to || order.createdAt.slice(0, 10) <= to)
        )
      })
      .sort((a, b) => {
        const getValue = (order: typeof a): string => {
          const customer = customerFor(data, order.customerId)
          switch (sortKey) {
            case "customer":
              return customer?.name ?? ""
            case "items":
              return orderItemSummary(data, order)
            case "salesPerson":
              return staffFor(data, order.salesPersonId)?.name ?? ""
            case "status":
              return order.status
            case "paymentStatus":
              return orderPaymentStatus(data, order)
            case "claimMethod":
              return order.claim?.method ?? ""
            case "deadline":
              return order.deadline
            default:
              return order.id
          }
        }
        const left = getValue(a)
        const right = getValue(b)
        return left.localeCompare(right) * (sortAscending ? 1 : -1)
      })
  }, [customerId, data, from, search, sortAscending, sortKey, status, to])
  const selectedOrder = data.orders.find((order) => order.id === selectedId)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAscending((value) => !value)
    else {
      setSortKey(key)
      setSortAscending(true)
    }
  }
  const selectedPricing = selectedOrder
    ? calculatePricing({
        lines: selectedOrder.lines,
        tier: data.npcMembers.find(
          (item) =>
            item.npcNumber ===
            customerFor(data, selectedOrder.customerId)?.npcNumber,
        )?.tier,
        rush: selectedOrder.rush,
        creditTermDays: selectedOrder.creditTermDays,
      })
    : undefined

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <div>
          <FieldLabel>Search orders</FieldLabel>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Order ID, customer, phone, or NPC number"
          />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All</option>
            {ORDER_STATUSES.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>Customer</FieldLabel>
          <Select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="All">All customers</option>
            {data.customers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>Date from</FieldLabel>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div>
          <FieldLabel>Date to</FieldLabel>
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="panel-title">{rows.length} orders found</div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {([
                    ["id", "Order ID"],
                    ["customer", "Customer"],
                    ["items", "Items / Qty"],
                    ["salesPerson", "Sales Person"],
                    ["status", "Status"],
                    ["paymentStatus", "Payment Status"],
                    ["claimMethod", "Claim Method"],
                    ["deadline", "Deadline"],
                  ] as const).map(([key, label]) => (
                    <th key={key}>
                      <button onClick={() => toggleSort(key)}>
                        {label} {sortKey === key ? (sortAscending ? "↑" : "↓") : "↕"}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => {
                  const customer = customerFor(data, order.customerId)
                  const paymentStatus = orderPaymentStatus(data, order)
                  return (
                    <tr
                      key={order.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          setSelectedId(order.id)
                        }
                      }}
                      onClick={() => setSelectedId(order.id)}
                    >
                      <td><strong>{order.id}</strong></td>
                      <td>
                        <strong>{customer?.name}</strong>
                        <small className="block text-stone-500">{customer?.phone}</small>
                      </td>
                      <td>{orderItemSummary(data, order)}</td>
                      <td>{staffFor(data, order.salesPersonId)?.name}</td>
                      <td>{order.status}</td>
                      <td>
                        <Badge tone={paymentStatus === "Paid in Full" ? "green" : paymentStatus === "Unpaid" ? "red" : "amber"}>
                          {paymentStatus}
                        </Badge>
                      </td>
                      <td>{order.claim?.method ?? "Not set"}</td>
                      <td className={isOrderOverdue(order, localToday()) ? "font-bold text-red-800" : ""}>
                        {order.deadline}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state">No orders match your filters.</div>}
      </Card>
      {selectedOrder && (
        <div className="drawer-backdrop" onClick={() => setSelectedId("")}>
          <aside
            className="order-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Order details ${selectedOrder.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow">Order details</span>
                <h2 className="mt-1 text-xl font-black">{selectedOrder.id}</h2>
              </div>
              <Button tone="secondary" onClick={() => setSelectedId("")}>Close</Button>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-white p-3">
              <QRCodeSVG
                value={buildScanLink(selectedOrder.id)}
                size={96}
                level="M"
                title={`QR code for ${selectedOrder.id}`}
              />
              <div>
                <span className="eyebrow">QR Code / Number</span>
                <strong className="mt-1 block break-all">{selectedOrder.id}</strong>
                <Button
                  type="button"
                  tone="secondary"
                  className="mt-3"
                  onClick={() => setPrintTagOpen(true)}
                >
                  Print QR tag
                </Button>
              </div>
            </div>
            <dl className="detail-list">
              <div><dt>Customer</dt><dd>{customerFor(data, selectedOrder.customerId)?.name}</dd></div>
              <div><dt>Phone</dt><dd>{customerFor(data, selectedOrder.customerId)?.phone}</dd></div>
              <div><dt>NPC number</dt><dd>{customerFor(data, selectedOrder.customerId)?.npcNumber ?? "—"}</dd></div>
              <div><dt>Items / Quantity</dt><dd>{orderItemSummary(data, selectedOrder)}</dd></div>
              <div><dt>Sales person</dt><dd>{staffFor(data, selectedOrder.salesPersonId)?.name}</dd></div>
              <div><dt>Status</dt><dd>{selectedOrder.status}</dd></div>
              <div><dt>Stage</dt><dd>{selectedOrder.stage ?? "Not started"}</dd></div>
              <div><dt>Deadline</dt><dd>{selectedOrder.deadline}</dd></div>
              <div><dt>Created</dt><dd>{new Date(selectedOrder.createdAt).toLocaleString("en-PH")}</dd></div>
              <div><dt>Rush</dt><dd>{selectedOrder.rush ? "Yes" : "No"}</dd></div>
              <div><dt>Credit term</dt><dd>{selectedOrder.creditTermDays ? `${selectedOrder.creditTermDays} days` : "None"}</dd></div>
              <div><dt>Total pieces</dt><dd>{selectedPricing?.totalPieces ?? 0}</dd></div>
              {productsFor(data, selectedOrder.lines).map(({ line, name, pieces }, index) => (
                <div key={`${line.productTypeId}-${index}`}>
                  <dt>{name} · {pieces} pcs</dt>
                  <dd>
                    {Object.entries(line.sizes).map(([size, quantity]) => `${size}: ${quantity}`).join(", ")}
                    {" · "}{line.material ?? "—"} · {line.printingType} · {line.printLocation}
                    {line.color ? ` · ${line.color}` : ""}
                    {line.colorsCount ? ` · ${line.colorsCount} colors` : ""}
                    {" · "}{money(line.pricePerPiece)} / piece
                    {" · Line total "}{money(line.pricePerPiece * pieces)}
                  </dd>
                </div>
              ))}
              <div><dt>Subtotal</dt><dd>{money(selectedPricing?.subtotal ?? 0)}</dd></div>
              {selectedPricing?.discounts.map((discount) => (
                <div key={discount.label}>
                  <dt>{discount.label}</dt><dd>−{money(discount.amount)}</dd>
                </div>
              ))}
              {Boolean(selectedPricing?.rushSurcharge) && (
                <div><dt>Rush surcharge</dt><dd>{money(selectedPricing?.rushSurcharge ?? 0)}</dd></div>
              )}
              {Boolean(selectedPricing?.creditCharge) && (
                <div><dt>Credit charge</dt><dd>{money(selectedPricing?.creditCharge ?? 0)}</dd></div>
              )}
              <div><dt>Order total</dt><dd>{money(orderTotal(data, selectedOrder))}</dd></div>
              <div><dt>Amount paid</dt><dd>{money(selectedOrder.payments.reduce((sum, payment) => sum + payment.amount, 0))}</dd></div>
              <div><dt>Remaining balance</dt><dd>{money(getRemainingBalance(selectedOrder, orderTotal(data, selectedOrder)))}</dd></div>
              <div><dt>Payment status</dt><dd>{orderPaymentStatus(data, selectedOrder)}</dd></div>
              <div><dt>Claim method</dt><dd>{selectedOrder.claim?.method ?? "Not set"}</dd></div>
              <div><dt>Claimed at</dt><dd>{selectedOrder.claim?.claimedAt ? new Date(selectedOrder.claim.claimedAt).toLocaleString("en-PH") : "—"}</dd></div>
              {selectedOrder.claim?.deliveryAddress && (
                <div><dt>Delivery address</dt><dd>{selectedOrder.claim.deliveryAddress}</dd></div>
              )}
            </dl>
            <h3 className="mt-5 font-extrabold">Production stage history</h3>
            {selectedOrder.stageLog?.length ? (
              <div className="mt-2 space-y-2">
                {selectedOrder.stageLog.map((entry, index) => (
                  <div
                    key={`${entry.at}-${entry.stage}-${index}`}
                    className="rounded-lg bg-stone-100 p-3 text-sm"
                  >
                    <strong>{entry.stage} completed</strong>
                    <p className="mt-1 text-xs text-stone-500">
                      {staffFor(data, entry.staffId)?.name ?? "Unknown staff"} · {new Date(entry.at).toLocaleString("en-PH")} · {entry.via}
                    </p>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state">No production stages have been logged.</div>}
            <h3 className="mt-5 font-extrabold">Payment history</h3>
            {selectedOrder.payments.length ? (
              <div className="mt-2 space-y-2">
                {selectedOrder.payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg bg-stone-100 p-3 text-sm">
                    <div className="flex justify-between font-bold">
                      <span>{payment.method}</span><span>{money(payment.amount)}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {new Date(payment.recordedAt).toLocaleString("en-PH")} · {staffFor(data, payment.recordedBy)?.name} · Receipt {payment.receiptIssued ? "Issued" : "Not Issued"}
                    </p>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state">No payments recorded.</div>}
          </aside>
        </div>
      )}
      {printTagOpen && selectedOrder && (
        <div
          className="qr-tag-preview-backdrop"
          onClick={() => setPrintTagOpen(false)}
        >
          <section
            className="qr-tag-preview qr-tag-print-view"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-tag-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="qr-tag-preview-header">
              <div>
                <span className="eyebrow">Production QR tag preview</span>
                <h2 id="qr-tag-title" className="mt-1 text-lg font-black">
                  {selectedOrder.id}
                </h2>
              </div>
              <Button
                type="button"
                tone="secondary"
                onClick={() => setPrintTagOpen(false)}
              >
                Close
              </Button>
            </header>
            <div className="qr-tag-print-content">
              <QRCodeSVG
                value={buildScanLink(selectedOrder.id)}
                size={220}
                level="M"
                title={`QR code for ${selectedOrder.id}`}
                className="qr-tag-code"
              />
              <div className="qr-tag-details">
                <span className="eyebrow">Production order</span>
                <h2>{selectedOrder.id}</h2>
                <p><strong>Customer</strong><span>{customerFor(data, selectedOrder.customerId)?.name ?? "Unknown customer"}</span></p>
                <p><strong>Pieces</strong><span>{selectedPricing?.totalPieces ?? 0}</span></p>
                <p><strong>Deadline</strong><span>{selectedOrder.deadline}</span></p>
              </div>
            </div>
            <div className="qr-tag-print-actions">
              <Button
                type="button"
                tone="secondary"
                onClick={() => setPrintTagOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => window.print()}>
                Print QR tag
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
