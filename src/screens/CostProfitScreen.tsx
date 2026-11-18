import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DEMO_TODAY } from '../config'
import { EmptyState, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import {
  formatCurrency,
  getCostProfitChartData,
  getCostProfitSummary,
  getCostProfitSummaryForRows,
} from '../lib/admin'
import { filterByDateAccessor, filterByPostedAtPeriod, type ReportingPeriod } from '../lib/reporting'
import { useAdminStore } from '../store/adminStore'

const periods: ReportingPeriod[] = ['Daily', 'Weekly', 'Monthly']
const cellStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: `1px solid ${screenColors.border}`,
  fontSize: 12,
  whiteSpace: 'nowrap',
}

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
  const [period, setPeriod] = useState<ReportingPeriod>('Daily')

  const analysis = useMemo(() => {
    try {
      const allCompleted = getCostProfitSummary(orders, payouts)
      const periodRows = filterByDateAccessor(
        allCompleted.rows,
        period,
        row => row.completionDate,
        DEMO_TODAY,
      )
      const summary = getCostProfitSummaryForRows(periodRows)
      const chart = getCostProfitChartData(periodRows)
      const commissionScreenPayouts = filterByPostedAtPeriod(payouts, period, DEMO_TODAY)
      const commissionScreenTotal = commissionScreenPayouts.reduce((total, payout) => total + payout.amount, 0)
      return { summary, chart, commissionScreenTotal, error: '' }
    } catch (reason) {
      return {
        summary: getCostProfitSummary([], payouts),
        chart: [],
        commissionScreenTotal: 0,
        error: reason instanceof Error ? reason.message : 'Cost and profit data could not be calculated.',
      }
    }
  }, [orders, payouts, period])

  const { summary, chart, commissionScreenTotal } = analysis
  const { totals, rows } = summary
  const reconciliationMatches = totals.commission === commissionScreenTotal
  const navigateTo = (hash: 'reports' | 'commission') => {
    window.location.hash = hash
  }

  return (
    <div>
      <ScreenTitle title="Cost & Profit" subtitle="Completed sales, production cost, and net profit from the local store." />
      <ScreenFeedback success={analysis.error ? '' : 'Cost and profit totals are current with the local store.'} error={analysis.error} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div role="group" aria-label="Cost and profit period" style={{ display: 'flex', gap: 4 }}>
          {periods.map(item => (
            <button
              key={item}
              type="button"
              aria-pressed={period === item}
              onClick={() => setPeriod(item)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${period === item ? screenColors.accent : screenColors.border}`,
                borderRadius: 6,
                background: period === item ? screenColors.accentLight : screenColors.card,
                color: screenColors.foreground,
                cursor: 'pointer',
              }}
            >{item}</button>
          ))}
        </div>
        <p style={{ color: screenColors.muted, fontSize: 12 }}>
          Completed sales: claimed and paid in full
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          ['Sales', totals.sales],
          ['Production cost', totals.productionCost],
          ['Gross profit', totals.grossProfit],
          ['Commission', totals.commission],
          ['Net profit', totals.netProfit],
        ].map(([label, value]) => (
          <ScreenCard key={String(label)}>
            <p style={{ color: screenColors.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{String(label)}</p>
            <strong style={{
              display: 'block',
              marginTop: 7,
              color: label === 'Net profit' && Number(value) < 0 ? '#9B3526' : screenColors.foreground,
              fontSize: 18,
            }}>{formatCurrency(Number(value))}</strong>
          </ScreenCard>
        ))}
      </div>

      <ScreenCard style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 15, color: screenColors.foreground }}>Completed sales and profit by completion date</h2>
        {rows.length === 0
          ? <EmptyState>No completed sales fall in this period.</EmptyState>
          : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={screenColors.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: screenColors.muted }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: screenColors.muted }}
                    tickFormatter={formatAxisCurrency}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip formatter={value => formatCurrency(Number(value ?? 0))} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#6B7C5A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="productionCost" name="Production Cost" fill="#A2A68F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="netProfit" name="Net Profit" fill="#3F5A3A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p style={{ color: screenColors.muted, fontSize: 11, marginTop: 8 }}>
                Completed sales are grouped by the date the order was claimed and paid in full. Data sources: Sales from Billing System orders and payments (completed sales only); production cost from materials and labor;
                commission from the Commission screen.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
                <button type="button" onClick={() => navigateTo('reports')} style={{ border: 0, background: 'transparent', color: screenColors.accent, cursor: 'pointer', padding: 0, fontSize: 12, textDecoration: 'underline' }}>
                  View in Reports
                </button>
                <button type="button" onClick={() => navigateTo('commission')} style={{ border: 0, background: 'transparent', color: screenColors.accent, cursor: 'pointer', padding: 0, fontSize: 12, textDecoration: 'underline' }}>
                  View in Commission
                </button>
              </div>
              <p
                role="status"
                style={{
                  marginTop: 10,
                  color: reconciliationMatches ? '#276749' : '#9B3526',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {period === 'Monthly'
                  ? 'Commission reconciliation unavailable for Monthly: the Commission screen only provides Today and This Week.'
                  : reconciliationMatches
                    ? `Commission total matches Commission screen: ✓ (${formatCurrency(totals.commission)})`
                    : `Commission reconciliation warning: Cost & Profit ${formatCurrency(totals.commission)}; Commission screen ${formatCurrency(commissionScreenTotal)}.`}
              </p>
            </>
          )}
      </ScreenCard>

      {rows.length > 0 && (
        <ScreenCard style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Order', 'Customer', 'Date', 'Sale', 'Production Cost', 'Gross Profit', 'Commission', 'Net Profit'].map(label => (
                  <th
                    key={label}
                    scope="col"
                    style={{
                      ...cellStyle,
                      textAlign: label === 'Order' || label === 'Customer' || label === 'Date' ? 'left' : 'right',
                      color: screenColors.muted,
                      fontWeight: 600,
                    }}
                  >{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.order.id}>
                  <td style={{ ...cellStyle, textAlign: 'left' }}>{row.order.id}</td>
                  <td style={{ ...cellStyle, textAlign: 'left' }}>{row.order.customer}</td>
                  <td style={{ ...cellStyle, textAlign: 'left' }}>{row.completionDate.slice(0, 10)}</td>
                  {[row.sales, row.productionCost, row.grossProfit, row.commission, row.netProfit].map((value, index) => (
                    <td
                      key={index}
                      style={{
                        ...cellStyle,
                        textAlign: 'right',
                        color: index === 4 && value < 0 ? '#9B3526' : screenColors.foreground,
                      }}
                    >{formatCurrency(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#F4F3EE' }}>
                <th colSpan={3} style={{ ...cellStyle, textAlign: 'left' }}>Total</th>
                {[totals.sales, totals.productionCost, totals.grossProfit, totals.commission, totals.netProfit].map((value, index) => (
                  <th
                    key={index}
                    style={{
                      ...cellStyle,
                      textAlign: 'right',
                      color: index === 4 && value < 0 ? '#9B3526' : screenColors.foreground,
                    }}
                  >{formatCurrency(value)}</th>
                ))}
              </tr>
            </tfoot>
          </table>
          <p style={{ color: screenColors.muted, fontSize: 12, padding: '10px 12px' }}>
            Net profit = gross profit − commission.
          </p>
        </ScreenCard>
      )}
    </div>
  )
}
