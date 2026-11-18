import { useState } from "react"
import { Badge, Card } from "../components/ui"
import { money, orderTotal } from "../components/billingView"
import { BILLING_CONFIG, getToday } from "../config"
import { getPaymentStatus } from "../lib/billing"
import { useBillingStore } from "../store/billingStore"

function localDateKey(value: string): string {
  return value.slice(0, 10)
}

export function Commission() {
  const data = useBillingStore((state) => state)
  const commissions = data.commissions
  const allStaff = useBillingStore((state) => state.staff)
  const staff = allStaff.filter((person) => person.isSalesPerson)
  const [period, setPeriod] = useState<"today" | "week">("today")
  const today = getToday()
  const todayDate = new Date(`${today}T00:00:00.000Z`)
  const weekStart = new Date(todayDate)
  weekStart.setUTCDate(todayDate.getUTCDate() - ((todayDate.getUTCDay() + 6) % 7))
  const start = weekStart.toISOString().slice(0, 10)
  const filtered = commissions.filter((entry) => {
    const order = data.orders.find((item) => item.id === entry.orderId)
    if (
      !order ||
      order.status !== "Claimed" ||
      getPaymentStatus(order, orderTotal(data, order)) !== "Paid in Full"
    ) {
      return false
    }
    const date = localDateKey(entry.postedAt)
    return period === "today" ? date === today : date >= start && date <= today
  })
  const summary = staff.map((person) => {
    const entries = filtered.filter((entry) => entry.salesPersonId === person.id)
    return {
      person,
      orders: entries.length,
      pieces: entries.reduce((sum, entry) => sum + entry.pieces, 0),
      commission: entries.reduce(
        (sum, entry) => sum + entry.pieces * BILLING_CONFIG.commissionPerPiece,
        0,
      ),
    }
  })
  const total = summary.reduce((sum, row) => sum + row.commission, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="segmented">
          {(["today", "week"] as const).map((value) => (
            <button
              key={value}
              className={period === value ? "active" : ""}
              onClick={() => setPeriod(value)}
            >
              {value === "today" ? "Today" : "This Week"}
            </button>
          ))}
        </div>
        <Badge tone="green">Flat rate: {money(BILLING_CONFIG.commissionPerPiece)} per piece</Badge>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr><th>Sales Person</th><th>Orders</th><th>Pieces Sold</th><th>Rate</th><th>Commission</th></tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.person.id}>
                  <td className="font-bold">{row.person.name}</td>
                  <td>{row.orders}</td>
                  <td>{row.pieces}</td>
                  <td>{money(BILLING_CONFIG.commissionPerPiece)} / piece</td>
                  <td className="font-black text-green-800">{money(row.commission)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4}>Total commission</td><td>{money(total)}</td></tr>
            </tfoot>
          </table>
        </div>
        {!filtered.length && (
          <div className="empty-state">No commission entries for this period.</div>
        )}
      </Card>
    </div>
  )
}
