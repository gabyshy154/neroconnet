import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DEMO_TODAY } from '../config'
import { EmptyState, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { calculateCostAndProfit, formatCurrency, isFullyPaid } from '../lib/admin'
import { costProfitSeries, filterByCompletedAtPeriod, getPeriodRange, type CostProfitChartPoint, type ReportingPeriod } from '../lib/reporting'
import { useAdminStore } from '../store/adminStore'

const periods: ReportingPeriod[] = ['Daily', 'Weekly', 'Monthly']
const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${screenColors.border}`, textAlign: 'left', fontSize: 12, whiteSpace: 'nowrap' }
const emptyTotals = { sales: 0, productionCost: 0, grossProfit: 0, commission: 0 }

function formatAxisCurrency(value: number): string {
  const absolute = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (absolute >= 1_000_000) return `${sign}₱${(absolute / 1_000_000).toFixed(1)}m`
  if (absolute >= 1_000) return `${sign}₱${(absolute / 1_000).toFixed(1)}k`
  return `${sign}₱${absolute.toFixed(0)}`
}

export default function CostProfitScreen() {
  const orders = useAdminStore(state => state.orders)
  const payouts = useAdminStore(state => state.commissionPayouts)
  const [period, setPeriod] = useState<ReportingPeriod>('Weekly')
  const { calculations, totals, chart, error } = useMemo((): { calculations: { order: { id: string; customer: string; completedAt: string; salePrice: number }; productionCost: number; grossProfit: number; commission: number }[]; totals: typeof emptyTotals; chart: CostProfitChartPoint[]; error: string } => {
    try {
      // REQ-4.17: only completed orders (claimed and paid in full) count toward cost and profit.
      const completed = filterByCompletedAtPeriod(orders, period, DEMO_TODAY)
        .filter(order => order.claimed && isFullyPaid(order))
      const rows = completed.map(order => {
        const commission = payouts.filter(payout => payout.orderId === order.id).reduce((total, payout) => total + payout.amount, 0)
        return { order, ...calculateCostAndProfit(order), commission }
      })
      const summary = rows.reduce((result, row) => ({
        sales: result.sales + row.order.salePrice,
        productionCost: result.productionCost + row.productionCost,
        grossProfit: result.grossProfit + row.grossProfit,
        commission: result.commission + row.commission,
      }), emptyTotals)
      // A chart compares days, so the Daily view shows only the table.
      const chart = period === 'Daily'
        ? []
        : costProfitSeries(
            rows.map(row => ({ completedAt: row.order.completedAt, sales: row.order.salePrice, productionCost: row.productionCost, grossProfit: row.grossProfit })),
            getPeriodRange(period, DEMO_TODAY),
          )
      return { calculations: rows, totals: summary, chart, error: '' }
    } catch (reason) {
      return {
        calculations: [],
        totals: emptyTotals,
        chart: [],
        error: reason instanceof Error ? reason.message : 'Cost and profit data could not be calculated.',
      }
    }
  }, [orders, payouts, period])

  return (
    <div>
      <ScreenTitle title="Cost & Profit" subtitle="Production cost and gross profit for completed orders (claimed and paid in full), with the sales commission paid on them." />
      <ScreenFeedback success={error ? '' : 'Cost and profit totals are current with the local store.'} error={error} />
      <div role="group" aria-label="Cost and profit period" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {periods.map(item => (
          <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)} style={{
            padding: '8px 12px', border: `1px solid ${period === item ? screenColors.accent : screenColors.border}`,
            borderRadius: 6, background: period === item ? screenColors.accentLight : screenColors.card,
            color: screenColors.foreground, cursor: 'pointer',
          }}>{item}</button>
        ))}
      </div>
      {error
        ? null
        : calculations.length === 0
        ? <EmptyState>No orders were completed in this period.</EmptyState>
        : (
          <>
            {chart.length > 0 && (
              <ScreenCard style={{ marginBottom: 16 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: screenColors.foreground }}>Completed sales and gross profit by completion date</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={screenColors.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: screenColors.muted }} tickFormatter={date => String(date).slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: screenColors.muted }} tickFormatter={formatAxisCurrency} />
                    <Tooltip formatter={value => formatCurrency(Number(value ?? 0))} />
                    <Legend />
                    <Bar dataKey="sales" name="Sales" fill="#6B7C5A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="productionCost" name="Production Cost" fill="#A2A68F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="grossProfit" name="Gross Profit" fill="#3F5A3A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p style={{ color: screenColors.muted, fontSize: 11, marginTop: 8 }}>
                  Grouped by the date each order was claimed and paid in full. The Daily view shows the table only.
                </p>
              </ScreenCard>
            )}
            <ScreenCard style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Order', 'Customer', 'Completed', 'Sale', 'Production Cost', 'Gross Profit', 'Commission'].map(label => <th key={label} style={{ ...cellStyle, color: screenColors.muted, fontWeight: 600 }}>{label}</th>)}</tr></thead>
                <tbody>{calculations.map(({ order, productionCost, grossProfit, commission }) => (
                  <tr key={order.id}>
                    <td style={cellStyle}>{order.id}</td><td style={cellStyle}>{order.customer}</td>
                    <td style={cellStyle}>{order.completedAt.slice(0, 10)}</td>
                    <td style={cellStyle}>{formatCurrency(order.salePrice)}</td><td style={cellStyle}>{formatCurrency(productionCost)}</td>
                    <td style={cellStyle}>{formatCurrency(grossProfit)}</td><td style={cellStyle}>{formatCurrency(commission)}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr style={{ background: '#F4F3EE' }}>
                  <th colSpan={3} style={cellStyle}>Total</th>
                  <th style={cellStyle}>{formatCurrency(totals.sales)}</th><th style={cellStyle}>{formatCurrency(totals.productionCost)}</th>
                  <th style={cellStyle}>{formatCurrency(totals.grossProfit)}</th><th style={cellStyle}>{formatCurrency(totals.commission)}</th>
                </tr></tfoot>
              </table>
            </ScreenCard>
            <p style={{ color: screenColors.muted, fontSize: 12, marginTop: 10 }}>
              Production cost = material cost + labor cost. Gross profit = sale − production cost (SRS REQ-4.17-04). Commission is shown for reference.
            </p>
          </>
        )}
    </div>
  )
}
