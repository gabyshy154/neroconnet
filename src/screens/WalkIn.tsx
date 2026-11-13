import { useMemo, useState } from "react"
import { Button, Badge, Card, FieldLabel, Input, Select, LockIcon } from "../components/ui"
import { money, SIZES } from "../components/billingView"
import { useBillingStore } from "../store/billingStore"
import { calculatePricing } from "../lib/billing"
import type { OrderLine } from "../types"

const EMPTY_QTY = Object.fromEntries(SIZES.map((size) => [size, 0]))
const DEFAULT_DEADLINE = (() => {
  const date = new Date()
  date.setDate(date.getDate() + 5)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
})()

export function WalkIn() {
  const customers = useBillingStore((state) => state.customers)
  const staff = useBillingStore((state) => state.staff)
  const products = useBillingStore((state) => state.productTypes)
  const addCustomer = useBillingStore((state) => state.addCustomer)
  const createOrder = useBillingStore((state) => state.createOrder)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState(customers[0]?.id ?? "")
  const [showNew, setShowNew] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" })
  const [form, setForm] = useState({
    productId: "",
    material: "Polyester" as NonNullable<OrderLine["material"]>,
    printingType: "Full Sublimation" as OrderLine["printingType"],
    printLocation: "Front",
    colorsCount: 1,
    color: "",
    salesPersonId: "",
    deadline: DEFAULT_DEADLINE,
    rush: false,
    creditTermDays: "" as "" | "15" | "30",
  })
  const [quantities, setQuantities] = useState<Record<string, number>>(EMPTY_QTY)
  const [success, setSuccess] = useState("")
  const [savedOrderId, setSavedOrderId] = useState("")
  const [error, setError] = useState("")

  const selected = customers.find((customer) => customer.id === selectedId)
  const members = useBillingStore((state) => state.npcMembers)
  const results = customers.filter((customer) =>
    `${customer.name} ${customer.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  const product = products.find((item) => item.id === form.productId)
  const totalQty = Object.values(quantities).reduce(
    (total, count) => total + count,
    0,
  )
  const selectedCreditTerm =
    form.creditTermDays === "15"
      ? 15
      : form.creditTermDays === "30"
        ? 30
        : undefined
  const memberTier = members.find(
    (member) => member.npcNumber === selected?.npcNumber,
  )?.tier
  const pricing = calculatePricing({
    lines: product
      ? [{
          productTypeId: product.id,
          printingType: form.printingType,
          printLocation: form.printLocation,
          sizes: quantities,
          pricePerPiece: product.pricePerPiece,
        }]
      : [],
    tier: memberTier,
    rush: form.rush,
    creditTermDays: selectedCreditTerm,
  })
  const membershipDiscount = pricing.discounts.find((item) =>
    item.label.endsWith("membership discount"),
  )
  const volumeDiscount = pricing.discounts.find(
    (item) => item.label === "Volume discount",
  )
  const salesPeople = staff.filter((person) => person.isSalesPerson)
  const canCreate = Boolean(
    selected &&
      product &&
      form.material &&
      form.printingType &&
      form.printLocation.trim() &&
      form.color.trim() &&
      form.salesPersonId &&
      form.deadline &&
      totalQty > 0,
  )
  const sizeLabels = useMemo(() => SIZES, [])

  const saveCustomer = () => {
    try {
      const customer = addCustomer(newCustomer)
      setSelectedId(customer.id)
      setShowNew(false)
      setNewCustomer({ name: "", phone: "" })
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add customer.")
    }
  }

  const saveOrder = () => {
    if (!selected || !product || !canCreate) return
    setSuccess("")
    setSavedOrderId("")
    try {
      const line: OrderLine = {
        productTypeId: product.id,
        material: form.material,
        printingType: form.printingType,
        printLocation: form.printLocation.trim(),
        colorsCount: form.colorsCount,
        color: form.color.trim(),
        sizes: Object.fromEntries(
          Object.entries(quantities).filter(([, count]) => count > 0),
        ),
        pricePerPiece: product.pricePerPiece,
      }
      const order = createOrder({
        customerId: selected.id,
        salesPersonId: form.salesPersonId,
        lines: [line],
        deadline: form.deadline,
        rush: form.rush,
        creditTermDays: selectedCreditTerm,
      })
      setSavedOrderId(order.id)
      setSuccess("Order created successfully. Record the downpayment in Billing.")
      setError("")
      setQuantities(EMPTY_QTY)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create order.")
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[310px_1fr]">
      <div className="space-y-3">
        <Card className="p-4">
          <FieldLabel>Customer lookup</FieldLabel>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or phone number"
          />
          <div className="mt-2 max-h-52 divide-y divide-stone-200 overflow-auto rounded-lg border border-stone-200">
            {results.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelectedId(customer.id)}
                className={`flex min-h-14 w-full items-center justify-between px-3 text-left hover:bg-[#eef1e8] ${
                  selectedId === customer.id ? "bg-[#e2e8d9]" : ""
                }`}
              >
                <span>
                  <strong className="block text-sm">{customer.name}</strong>
                  <span className="text-xs text-stone-500">{customer.phone}</span>
                </span>
                {customer.npcNumber && <Badge tone="green">NPC</Badge>}
              </button>
            ))}
            {!results.length && <div className="empty-state">No matching customers.</div>}
          </div>
        </Card>
        <Button
          tone="secondary"
          className="w-full"
          onClick={() => setShowNew((value) => !value)}
        >
          + New Customer
        </Button>
        {showNew && (
          <Card className="space-y-3 p-4">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <Input
                value={newCustomer.name}
                onChange={(event) =>
                  setNewCustomer({ ...newCustomer, name: event.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel>Phone number</FieldLabel>
              <Input
                value={newCustomer.phone}
                onChange={(event) =>
                  setNewCustomer({ ...newCustomer, phone: event.target.value })
                }
              />
            </div>
            <Button className="w-full" onClick={saveCustomer}>
              Add & Select Customer
            </Button>
          </Card>
        )}
        {selected && (
          <Card className="border-[#74825c] bg-[#f1f4ec] p-4">
            <span className="eyebrow">Selected customer</span>
            <strong className="mt-1 block">{selected.name}</strong>
            <span className="text-xs text-stone-600">{selected.phone}</span>
          </Card>
        )}
      </div>

      <Card className="p-4 lg:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="eyebrow">Fast order entry</span>
            <h2 className="text-lg font-extrabold">Customization details</h2>
          </div>
          <Badge tone="amber">Required fields</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <FieldLabel>Product Type</FieldLabel>
            <Select
              value={form.productId}
              onChange={(event) =>
                setForm({ ...form, productId: event.target.value })
              }
            >
              <option value="">Select product</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Material</FieldLabel>
            <Select
              value={form.material}
              onChange={(event) =>
                setForm({
                  ...form,
                  material: event.target.value as NonNullable<OrderLine["material"]>,
                })
              }
            >
              {["Cotton", "Polyester", "Drift", "Mixed"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Printing Type</FieldLabel>
            <Select
              value={form.printingType}
              onChange={(event) =>
                setForm({
                  ...form,
                  printingType: event.target.value as OrderLine["printingType"],
                })
              }
            >
              {["Full Sublimation", "Screen Print", "Digital Print", "Vinyl"].map(
                (item) => <option key={item}>{item}</option>,
              )}
            </Select>
          </div>
          <div>
            <FieldLabel>Print Location</FieldLabel>
            <Input
              value={form.printLocation}
              onChange={(event) =>
                setForm({ ...form, printLocation: event.target.value })
              }
            />
          </div>
          <div>
            <FieldLabel>Number of Colors</FieldLabel>
            <Input
              type="number"
              min="1"
              step="1"
              value={form.colorsCount}
              onChange={(event) =>
                setForm({ ...form, colorsCount: Math.max(1, Number(event.target.value)) })
              }
            />
          </div>
          <div>
            <FieldLabel>Color</FieldLabel>
            <Input
              value={form.color}
              onChange={(event) => setForm({ ...form, color: event.target.value })}
              placeholder="e.g. Navy / White"
            />
          </div>
          <div>
            <FieldLabel>Price Per Piece (₱)</FieldLabel>
            <div className="relative">
              <Input
                readOnly
                value={product ? product.pricePerPiece.toFixed(2) : ""}
                placeholder="Select product"
                className="locked pr-10"
              />
              <span className="absolute right-3 top-3 text-stone-500"><LockIcon /></span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500">Set by product type</p>
          </div>
          <div>
            <FieldLabel>Deadline</FieldLabel>
            <Input
              type="date"
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 self-end rounded-lg border border-stone-300 bg-stone-50 px-3 py-3">
            <input
              id="walk-in-rush"
              type="checkbox"
              checked={form.rush}
              onChange={(event) =>
                setForm({ ...form, rush: event.target.checked })
              }
            />
            <label htmlFor="walk-in-rush" className="text-sm font-bold">
              Rush order
            </label>
          </div>
          <div>
            <FieldLabel>Credit Term</FieldLabel>
            <Select
              value={form.creditTermDays}
              onChange={(event) =>
                setForm({
                  ...form,
                  creditTermDays: event.target.value as "" | "15" | "30",
                })
              }
            >
              <option value="">No credit term</option>
              <option value="15">15 days</option>
              <option value="30">30 days</option>
            </Select>
          </div>
        </div>
        <div className="my-4 border-t border-stone-200" />
        <FieldLabel>Size and Quantity</FieldLabel>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {sizeLabels.map((size) => (
            <label
              key={size}
              className="rounded-lg border border-stone-300 bg-stone-50 p-2 text-center"
            >
              <span className="mb-1 block text-[11px] font-extrabold text-stone-600">{size}</span>
              <input
                aria-label={`${size} quantity`}
                className="w-full rounded border border-stone-300 bg-white px-1 py-2 text-center font-bold outline-none focus:border-[#65744f]"
                type="number"
                min="0"
                step="1"
                value={quantities[size]}
                onChange={(event) =>
                  setQuantities({
                    ...quantities,
                    [size]: Math.max(0, Math.floor(Number(event.target.value) || 0)),
                  })
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-4 grid items-end gap-3 md:grid-cols-[1fr_210px_240px]">
          <div>
            <FieldLabel>Sales Person *</FieldLabel>
            <Select
              aria-required="true"
              value={form.salesPersonId}
              onChange={(event) =>
                setForm({ ...form, salesPersonId: event.target.value })
              }
            >
              <option value="">Select sales person</option>
              {salesPeople.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </Select>
          </div>
          <div className="summary-box">
            <span>Total Quantity</span>
            <strong>{totalQty} pcs</strong>
          </div>
        </div>
        {product && totalQty > 0 ? (
          <section
            aria-label="Itemized pricing breakdown"
            className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4"
          >
            <h3 className="mb-3 text-sm font-extrabold">Pricing Breakdown</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Subtotal</dt>
                <dd className="font-semibold">{money(pricing.subtotal)}</dd>
              </div>
              {membershipDiscount && (
                <div className="flex justify-between gap-4 text-stone-600">
                  <dt>Membership discount</dt>
                  <dd>−{money(membershipDiscount.amount)}</dd>
                </div>
              )}
              {volumeDiscount && (
                <div className="flex justify-between gap-4 text-stone-600">
                  <dt>Volume discount</dt>
                  <dd>−{money(volumeDiscount.amount)}</dd>
                </div>
              )}
              {form.rush && pricing.rushSurcharge > 0 && (
                <div className="flex justify-between gap-4">
                  <dt>Rush surcharge</dt>
                  <dd>{money(pricing.rushSurcharge)}</dd>
                </div>
              )}
              {form.creditTermDays && pricing.creditCharge > 0 && (
                <div className="flex justify-between gap-4">
                  <dt>Credit charge ({form.creditTermDays} days)</dt>
                  <dd>{money(pricing.creditCharge)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-stone-300 pt-2 text-base font-extrabold">
                <dt>Grand total</dt>
                <dd>{money(pricing.grandTotal)}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <div className="empty-state mt-4">
            Select a product type and enter a quantity to see the itemized pricing breakdown.
          </div>
        )}
        {error && <div className="alert-banner mt-4" role="alert">{error}</div>}
        {success && (
          <div className="success-banner mt-4" role="status">
            <p>{success}</p>
            <p className="mt-1">
              Order ID: <strong>{savedOrderId}</strong>
            </p>
            <p className="mt-1">
              Status: Pending Downpayment · Production: Not started
            </p>
            <p className="mt-1">Materials deducted from inventory.</p>
          </div>
        )}
        <div className="mt-4">
          <Button className="w-full" disabled={!canCreate} onClick={saveOrder}>
            Create Order
          </Button>
        </div>
      </Card>
    </div>
  )
}
