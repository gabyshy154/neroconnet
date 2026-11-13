import { useMemo, useState } from 'react'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { exportToCsv, formatCurrency } from '../lib/admin'
import { filterByPeriod, type ReportingPeriod } from '../lib/reporting'
import { useAdminStore } from '../store/adminStore'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DEMO_TODAY } from '../config'

const periods: ReportingPeriod[] = ['Daily', 'Weekly', 'Monthly']
const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${screenColors.border}`, textAlign: 'left', fontSize: 12 }

export default function ReportsScreen() {
  const orders = useAdminStore(state => state.orders)
  const [period, setPeriod] = useState<ReportingPeriod>('Daily')
  const [success, setSuccess] = useState('Report data loaded from the local order store.')
  const [error, setError] = useState('')
  const filteredOrders = useMemo(() => filterByPeriod(orders, period, DEMO_TODAY), [orders, period])
  const revenue = filteredOrders.reduce((total, order) => total + order.salePrice, 0)
  const pieces = filteredOrders.reduce((total, order) => total + order.pieces, 0)
  const demandByDate = Object.entries(filteredOrders.reduce<Record<string, number>>((totals, order) => {
    const date = order.createdAt.slice(0, 10)
    totals[date] = (totals[date] ?? 0) + order.pieces
    return totals
  }, {})).sort(([first], [second]) => first.localeCompare(second))
  const salesByDate = Object.entries(filteredOrders.reduce<Record<string, number>>((totals, order) => {
    const date = order.createdAt.slice(0, 10)
    totals[date] = (totals[date] ?? 0) + order.salePrice
    return totals
  }, {})).sort(([first], [second]) => first.localeCompare(second))
    .map(([date, sales]) => ({ date, sales }))

  const downloadCsv = () => {
    setError('')
    try {
      const csv = exportToCsv(filteredOrders.map(order => ({
        date: order.createdAt.slice(0, 10),
        orderId: order.id,
        customer: order.customer,
        pieces: order.pieces,
        salePrice: order.salePrice,
        amountPaid: order.amountPaid,
      })), ['date', 'orderId', 'customer', 'pieces', 'salePrice', 'amountPaid'])
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `neroconnect-sales-${period.toLowerCase()}-${DEMO_TODAY}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setSuccess(`Downloaded ${period.toLowerCase()} sales as a CSV file.`)
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'The CSV report could not be downloaded.')
    }
  }

  return (
    <div>
      <ScreenTitle title="Reports & Analytics" subtitle="Sales activity and demand estimates from saved orders." />
      <ScreenFeedback success={success} error={error} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div role="group" aria-label="Report period" style={{ display: 'flex', gap: 4 }}>
          {periods.map(item => (
            <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)} style={{
              padding: '8px 12px', border: `1px solid ${period === item ? screenColors.accent : screenColors.border}`,
              borderRadius: 6, background: period === item ? screenColors.accentLight : screenColors.card,
              color: screenColors.foreground, cursor: 'pointer',
            }}>{item}</button>
          ))}
        </div>
        <ScreenButton onClick={downloadCsv}>Download CSV</ScreenButton>
      </div>
      {filteredOrders.length === 0
        ? <EmptyState>No sales are recorded for this period.</EmptyState>
        : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
              <ScreenCard><p style={{ color: screenColors.muted, fontSize: 12 }}>Sales</p><strong>{formatCurrency(revenue)}</strong></ScreenCard>
              <ScreenCard><p style={{ color: screenColors.muted, fontSize: 12 }}>Orders</p><strong>{filteredOrders.length}</strong></ScreenCard>
              <ScreenCard><p style={{ color: screenColors.muted, fontSize: 12 }}>Pieces</p><strong>{pieces}</strong></ScreenCard>
            </div>
            <ScreenCard style={{ padding: 0, overflowX: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Date', 'Order', 'Customer', 'Pieces', 'Sale Price', 'Paid'].map(label => <th key={label} style={{ ...cellStyle, color: screenColors.muted, fontWeight: 600 }}>{label}</th>)}</tr></thead>
                <tbody>{filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td style={cellStyle}>{order.createdAt.slice(0, 10)}</td><td style={cellStyle}>{order.id}</td>
                    <td style={cellStyle}>{order.customer}</td><td style={cellStyle}>{order.pieces}</td>
                    <td style={cellStyle}>{formatCurrency(order.salePrice)}</td><td style={cellStyle}>{formatCurrency(order.amountPaid)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </ScreenCard>
            <ScreenCard style={{ marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, color: screenColors.foreground }}>Sales by order date</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke={screenColors.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: screenColors.muted }} />
                  <YAxis tick={{ fontSize: 11, fill: screenColors.muted }} tickFormatter={value => formatCurrency(Number(value))} />
                  <Tooltip formatter={value => formatCurrency(Number(value ?? 0))} />
                  <Bar dataKey="sales" name="Sales" fill={screenColors.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ScreenCard>
            <ScreenCard>
              <h2 style={{ margin: '0 0 6px', fontSize: 15, color: screenColors.foreground }}>Demand estimate</h2>
              <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 12 }}>
                input-based estimate from past sales, not predictive forecasting
              </p>
              {demandByDate.map(([date, quantity]) => (
                <p key={date} style={{ color: screenColors.foreground, fontSize: 13, padding: '6px 0' }}>{date}: {quantity} pieces sold</p>
              ))}
            </ScreenCard>
          </>
        )}
    </div>
  )
}
