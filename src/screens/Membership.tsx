import { useMemo, useState } from "react"
import { Button, Badge, Card, FieldLabel, Input, Select } from "../components/ui"
import { useBillingStore } from "../store/billingStore"

const TIER_REFERENCE = [
  ["Bronze", "Free", "3%"],
  ["Silver", "₱50", "5%"],
  ["Gold", "₱80", "8%"],
  ["Platinum", "₱100", "10%"],
]

export function Membership() {
  const customers = useBillingStore((state) => state.customers)
  const members = useBillingStore((state) => state.npcMembers)
  const isOnline = useBillingStore((state) => state.isOnline)
  const enrollNpcMember = useBillingStore((state) => state.enrollNpcMember)
  const [query, setQuery] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [notFound, setNotFound] = useState(false)
  const [optIn, setOptIn] = useState<"Yes" | "No">("No")
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [lookupSubmitted, setLookupSubmitted] = useState(false)
  const result = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized || !lookupSubmitted) return undefined
    const customer = customers.find(
      (item) => item.npcNumber?.toLowerCase() === normalized,
    )
    if (!customer) return undefined
    return {
      customer,
      member: members.find((item) => item.npcNumber === customer.npcNumber),
    }
  }, [customers, lookupSubmitted, members, query])
  const selectedCustomer = customers.find(
    (item) => item.id === selectedCustomerId,
  )
  const member = selectedCustomer
    ? members.find((item) => item.npcNumber === selectedCustomer.npcNumber)
    : undefined

  const lookup = () => {
    const found = members.some(
      (item) => item.npcNumber.toLowerCase() === query.trim().toLowerCase(),
    )
    setLookupSubmitted(true)
    setNotFound(!found)
    setError("")
    setSuccess("")
  }

  const enroll = () => {
    if (!selectedCustomer || optIn !== "Yes") return
    try {
      const enrolled = enrollNpcMember(selectedCustomer.id)
      setSuccess(`Enrollment complete. Member number: ${enrolled.npcNumber}`)
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enrollment failed.")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="grid items-end gap-3 md:grid-cols-[1fr_180px]">
          <div>
            <FieldLabel>QR Code / Number</FieldLabel>
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setNotFound(false)
                setLookupSubmitted(false)
              }}
              onKeyDown={(event) => event.key === "Enter" && lookup()}
              placeholder="Type NPC number"
            />
          </div>
          <Button onClick={lookup} disabled={!query.trim()}>Look Up</Button>
        </div>
        {notFound && (
          <div className="alert-banner mt-3" role="alert">
            Unknown NPC number. Check the number and try again.
          </div>
        )}
        {!isOnline && (
          <p className="mt-3 text-sm font-semibold text-amber-800" role="status">
            Offline: tier and points will update after sync.
          </p>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.9fr]">
        <Card className="p-5">
          <span className="eyebrow">Membership result</span>
          {result ? (
            <div className="mt-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">{result.customer.name}</h2>
                  <p className="text-sm text-stone-500">
                    {result.customer.phone} · {result.customer.npcNumber}
                  </p>
                </div>
                <Badge tone={result.member ? "green" : "neutral"}>
                  {result.member?.tier ?? "Non-member"}
                </Badge>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="metric">
                  <span>Tier</span>
                  <strong>{result.member?.tier ?? "None"}</strong>
                </div>
                <div className="metric">
                  <span>Discount</span>
                  <strong>
                    {result.member
                      ? `${({ Bronze: 3, Silver: 5, Gold: 8, Platinum: 10 })[result.member.tier]}%`
                      : "0%"}
                  </strong>
                </div>
                <div className="metric">
                  <span>Points Balance</span>
                  <strong>{result.member?.points ?? 0}</strong>
                </div>
              </div>
              <p className="mt-3 text-xs text-stone-500">
                Points earn rate: 1 point per ₱1,000 paid.
              </p>
            </div>
          ) : (
            <div className="empty-state">
              Enter an NPC number and select Look Up to view membership details.
            </div>
          )}
        </Card>
        <Card className="p-5">
          <span className="eyebrow">Walk-in enrollment</span>
          <h2 className="mt-1 font-extrabold">Staff-assisted Bronze enrollment</h2>
          <div className="mt-4">
            <FieldLabel>Eligible walk-in customer</FieldLabel>
            <Select
              value={selectedCustomerId}
              onChange={(event) => {
                setSelectedCustomerId(event.target.value)
                setSuccess("")
              }}
            >
              <option value="">Select a customer without an NPC number</option>
              {customers
                .filter((customer) => !customer.npcNumber)
                .map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {customer.phone}
                  </option>
                ))}
            </Select>
            {!customers.some((customer) => !customer.npcNumber) && (
              <p className="mt-2 text-sm text-stone-500">
                No customers are currently eligible for enrollment.
              </p>
            )}
          </div>
          <div className="mt-4">
            <FieldLabel>Customer opts in?</FieldLabel>
            <div className="segmented">
              {(["Yes", "No"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={optIn === value ? "active" : ""}
                  onClick={() => setOptIn(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <p className="my-3 text-xs text-stone-600">
            Yes auto-enrolls this customer as Bronze — free, with 3% discount.
          </p>
          {optIn === "No" && selectedCustomer && (
            <p className="mb-3 text-sm text-stone-600" role="status">
              Customer remains a regular customer and can continue without enrollment.
            </p>
          )}
          {error && <div className="alert-banner mb-3" role="alert">{error}</div>}
          {success && <div className="success-banner mb-3">{success}</div>}
          <Button
            className="w-full"
            disabled={!selectedCustomer || Boolean(member) || optIn !== "Yes"}
            onClick={enroll}
          >
            Enroll as Bronze
          </Button>
        </Card>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-stone-500">
          Tier reference only. Upgrade and points redemption rules are not defined.
        </p>
        <div className="tier-strip">
        {TIER_REFERENCE.map(([tier, fee, discount]) => (
          <div key={tier}>
            <strong>{tier}</strong>
            <span>{fee} · {discount} discount</span>
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}
