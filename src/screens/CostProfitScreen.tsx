import { useMemo } from 'react'
import { otherExpensesPerOrder } from '../config'
import { EmptyState, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { formatCurrency } from '../lib/admin'
import { useAdminStore } from '../store/adminStore'

const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${screenColors.border}`, textAlign: 'left', fontSize: 12, whiteSpace: 'nowrap' }

export default function CostProfitScreen() {
  const orders = useAdminStore(state => state.orders)
  const payouts = useAdminStore(state => state.commissionPayouts)
  const { calculations, totals, error } = useMemo(() => {
    try {
      const rows = orders.map(order => {
        if (![order.salePrice, order.materialCost, order.laborCost].every(Number.isFinite)) {
          throw new Error(`Financial data for order ${order.id} contains an invalid amount.`)
        }
        const productionCost = order.materialCost + order.laborCost
        const grossProfit = order.salePrice - productionCost
        const commission = payouts.filter(payout => payout.orderId === order.id).reduce((total, payout) => total + payout.amount, 0)
        const otherExpenses = otherExpensesPerOrder
        return { order, productionCost, grossProfit, commission, otherExpenses, netProfit: grossProfit - commission - otherExpenses }
      })
      const summary = rows.reduce((result, row) => ({
        sales: result.sales + row.order.salePrice,
        productionCost: result.productionCost + row.productionCost,
        grossProfit: result.grossProfit + row.grossProfit,
        commission: result.commission + row.commission,
        otherExpenses: result.otherExpenses + row.otherExpenses,
        netProfit: result.netProfit + row.netProfit,
      }), { sales: 0, productionCost: 0, grossProfit: 0, commission: 0, otherExpenses: 0, netProfit: 0 })
      return { calculations: rows, totals: summary, error: '' }
    } catch (reason) {
      return {
        calculations: [],
        totals: { sales: 0, productionCost: 0, grossProfit: 0, commission: 0, otherExpenses: 0, netProfit: 0 },
        error: reason instanceof Error ? reason.message : 'Cost and profit data could not be calculated.',
      }
    }
  }, [orders, payouts])

  return (
    <div>
      <ScreenTitle title="Cost & Profit" subtitle="Per-order production cost, gross profit, and net profit from store data." />
      <ScreenFeedback success={error ? '' : 'Cost and profit totals are current with the local store.'} error={error} />
      {error
        ? null
        : calculations.length === 0
        ? <EmptyState>No orders are available for cost and profit analysis.</EmptyState>
        : (
          <>
            <ScreenCard style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Order', 'Customer', 'Sale', 'Production Cost', 'Gross Profit', 'Commission', 'Other Expenses', 'Net Profit'].map(label => <th key={label} style={{ ...cellStyle, color: screenColors.muted, fontWeight: 600 }}>{label}</th>)}</tr></thead>
                <tbody>{calculations.map(({ order, productionCost, grossProfit, commission, otherExpenses, netProfit }) => (
                  <tr key={order.id}>
                    <td style={cellStyle}>{order.id}</td><td style={cellStyle}>{order.customer}</td>
                    <td style={cellStyle}>{formatCurrency(order.salePrice)}</td><td style={cellStyle}>{formatCurrency(productionCost)}</td>
                    <td style={cellStyle}>{formatCurrency(grossProfit)}</td><td style={cellStyle}>{formatCurrency(commission)}</td>
                    <td style={cellStyle}>{formatCurrency(otherExpenses)}</td><td style={cellStyle}>{formatCurrency(netProfit)}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr style={{ background: '#F4F3EE' }}>
                  <th colSpan={2} style={cellStyle}>Total</th>
                  <th style={cellStyle}>{formatCurrency(totals.sales)}</th><th style={cellStyle}>{formatCurrency(totals.productionCost)}</th>
                  <th style={cellStyle}>{formatCurrency(totals.grossProfit)}</th><th style={cellStyle}>{formatCurrency(totals.commission)}</th>
                  <th style={cellStyle}>{formatCurrency(totals.otherExpenses)}</th><th style={cellStyle}>{formatCurrency(totals.netProfit)}</th>
                </tr></tfoot>
              </table>
            </ScreenCard>
            <p style={{ color: screenColors.muted, fontSize: 12, marginTop: 10 }}>Net profit = gross profit − commission − other expenses. Other expenses use the configured sample placeholder.</p>
          </>
        )}
    </div>
  )
}
