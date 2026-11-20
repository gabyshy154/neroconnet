import { useMemo, useState } from "react"
import { Button, Badge, Card, FieldLabel, Input, Select } from "../components/ui"
import { useBillingStore } from "../store/billingStore"
import { maskPhone } from "../lib/billing"
import { BILLING_CONFIG } from "../config"
import type { Tier } from "../types"

const TIERS: Tier[] = ["Bronze", "Silver", "Gold", "Platinum"]
const discountPercent = (tier: Tier) => Math.round(BILLING_CONFIG.tierDiscountRates[tier] * 100)

export function Membership() {
  const customers = useBillingStore((state) => state.customers)
  const members = useBillingStore((state) => state.npcMembers)
  const isOnline = useBillingStore((state) => state.isOnline)
  const enrollNpcMember = useBillingStore((state) => state.enrollNpcMember)
  const [query, setQuery] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [notFound, setNotFound] = useState(false)
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
    if (!selectedCustomer) return
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
                    {maskPhone(result.customer.phone)} · {result.customer.npcNumber}
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
                    {result.member ? `${discountPercent(result.member.tier)}%` : "0%"}
                  </strong>
                </div>
                <div className="metric">
                  <span>Points Balance</span>
                  <strong>{result.member?.points ?? 0}</strong>
                </div>
              </div>
              <p className="mt-3 text-xs text-stone-500">
                Points earn rate: 1 point per full ₱1,000 paid on each order.
                {result.member && result.member.tier !== "Platinum" && (() => {
                  const next = TIERS[TIERS.indexOf(result.member.tier) + 1]
                  const needed = BILLING_CONFIG.tierPointThresholds[next] - result.member.points
                  return needed > 0 ? ` ${needed} more points to ${next}.` : ""
                })()}
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
                    {customer.name} · {maskPhone(customer.phone)}
                  </option>
                ))}
            </Select>
            {!customers.some((customer) => !customer.npcNumber) && (
              <p className="mt-2 text-sm text-stone-500">
                No customers are currently eligible for enrollment.
              </p>
            )}
          </div>
          <p className="my-3 text-xs text-stone-600">
            Ask the customer if they want to join the Nero Privilege Card. Enroll only if they agree:
            they start as Bronze (free, 3% discount). If they decline, continue the order as a regular customer.
          </p>
          {error && <div className="alert-banner mb-3" role="alert">{error}</div>}
          {success && <div className="success-banner mb-3">{success}</div>}
          <Button
            className="w-full"
            disabled={!selectedCustomer || Boolean(member)}
            onClick={enroll}
          >
            Enroll as Bronze
          </Button>
        </Card>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-stone-500">
          Tiers upgrade automatically when points reach the threshold (sample thresholds, set in the Admin Portal). Points redemption is not offered.
        </p>
        <div className="tier-strip">
        {TIERS.map((tier) => (
          <div key={tier}>
            <strong>{tier}</strong>
            <span>
              {tier === "Bronze" ? "On enrollment" : `${BILLING_CONFIG.tierPointThresholds[tier]} points`} · {discountPercent(tier)}% discount
            </span>
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}
