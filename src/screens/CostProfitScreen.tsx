import { useMemo, useState } from 'react'
import { DEMO_TODAY } from '../config'
import { EmptyState, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { calculateCostAndProfit, formatCurrency, isFullyPaid } from '../lib/admin'
import { filterByCompletedAtPeriod, type ReportingPeriod } from '../lib/reporting'
import { useAdminStore } from '../store/adminStore'

const periods: ReportingPeriod[] = ['Daily', 'Weekly', 'Monthly']
const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${screenColors.border}`, textAlign: 'left', fontSize: 12, whiteSpace: 'nowrap' }
const emptyTotals = { sales: 0, productionCost: 0, grossProfit: 0, commission: 0 }

export default function CostProfitScreen() {
  const orders = useAdminStore(state => state.orders)
  const payouts = useAdminStore(state => state.commissionPayouts)
  const [period, setPeriod] = useState<ReportingPeriod>('Weekly')
  const { calculations, totals, error } = useMemo(() => {
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
      return { calculations: rows, totals: summary, error: '' }
    } catch (reason) {
      return {
        calculations: [],
        totals: emptyTotals,
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
