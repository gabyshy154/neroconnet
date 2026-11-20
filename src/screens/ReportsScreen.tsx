import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { DEMO_TODAY } from '../config'
import { exportToCsv, formatCurrency, isLowStock, orderStatus } from '../lib/admin'
import { dailySeries, demandByProduct, filterByDateRange, getPeriodRange, type DateRange, type ReportingPeriod } from '../lib/reporting'
import { useAdminStore } from '../store/adminStore'

type ReportType = 'Sales' | 'Inventory' | 'Production' | 'Membership' | 'Commission'
type PeriodMode = ReportingPeriod | 'Custom'
type Cell = string | number

interface ReportTable {
  title: string
  description?: string
  columns: string[]
  rows: Cell[][]
  empty: string
}

interface Report {
  summary: [label: string, value: string][]
  tables: ReportTable[]
  note?: string
}

const reportTypes: ReportType[] = ['Sales', 'Inventory', 'Production', 'Membership', 'Commission']
const periodModes: PeriodMode[] = ['Daily', 'Weekly', 'Monthly', 'Custom']
const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${screenColors.border}`, textAlign: 'left', fontSize: 12 }

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 12px', border: `1px solid ${active ? screenColors.accent : screenColors.border}`,
    borderRadius: 6, background: active ? screenColors.accentLight : screenColors.card,
    color: screenColors.foreground, cursor: 'pointer',
  }
}

export default function ReportsScreen() {
  const orders = useAdminStore(state => state.orders)
  const materials = useAdminStore(state => state.materials)
  const movements = useAdminStore(state => state.inventoryMovements)
  const members = useAdminStore(state => state.members)
  const tierCorrections = useAdminStore(state => state.membershipTierCorrections)
  const pointsAdjustments = useAdminStore(state => state.membershipPointsAdjustments)
  const payouts = useAdminStore(state => state.commissionPayouts)
  const employees = useAdminStore(state => state.employees)
  const [reportType, setReportType] = useState<ReportType>('Sales')
  const [mode, setMode] = useState<PeriodMode>('Daily')
  const [custom, setCustom] = useState<DateRange>(() => getPeriodRange('Monthly', DEMO_TODAY))
  const [message, setMessage] = useState({ success: 'Report data loaded from the local store.', error: '' })

  const range: DateRange = mode === 'Custom' ? custom : getPeriodRange(mode, DEMO_TODAY)

  const result = useMemo((): { report: Report; chart: { date: string; sales: number }[] } | { error: string } => {
    try {
      const nameOf = (id: string) => employees.find(employee => employee.id === id)?.name ?? id
      const materialName = (id: string) => materials.find(material => material.id === id)?.name ?? id
      const ordersInRange = filterByDateRange(orders, range, order => order.createdAt)
      let report: Report
      if (reportType === 'Sales') {
        report = {
          summary: [
            ['Sales', formatCurrency(ordersInRange.reduce((total, order) => total + order.salePrice, 0))],
            ['Paid', formatCurrency(ordersInRange.reduce((total, order) => total + order.amountPaid, 0))],
            ['Orders', String(ordersInRange.length)],
            ['Pieces', String(ordersInRange.reduce((total, order) => total + order.pieces, 0))],
          ],
          tables: [{
            title: 'Sales by order',
            columns: ['Date', 'Order', 'Customer', 'Product', 'Pieces', 'Sale Price', 'Paid'],
            rows: ordersInRange.map(order => [order.createdAt.slice(0, 10), order.id, order.customer, order.product, order.pieces, formatCurrency(order.salePrice), formatCurrency(order.amountPaid)]),
            empty: 'No sales are recorded for this period.',
          }, {
            title: 'Demand by product',
            description: 'input-based estimate from past sales, not predictive forecasting. Counts orders with a payment recorded, the same rule the pricing alerts use.',
            columns: ['Product', 'Pieces sold', 'Orders', 'Share of pieces'],
            rows: demandByProduct(ordersInRange).map(item => [item.product, item.pieces, item.orders, `${item.sharePercent}%`]),
            empty: 'No paid orders in this period.',
          }],
        }
      } else if (reportType === 'Inventory') {
        const movementsInRange = filterByDateRange(movements, range, movement => movement.at)
        report = {
          summary: [
            ['Stock-in movements', String(movementsInRange.filter(movement => movement.type === 'In').length)],
            ['Stock-out movements', String(movementsInRange.filter(movement => movement.type === 'Out').length)],
            ['Low-stock materials', String(materials.filter(isLowStock).length)],
          ],
          tables: [
            {
              title: 'Current stock levels',
              columns: ['Material', 'Stock', 'Reorder point', 'Status'],
              rows: materials.map(material => [material.name, `${material.stock} ${material.unit}`, `${material.reorderPoint} ${material.unit}`, isLowStock(material) ? 'Low stock' : 'OK']),
              empty: 'No materials are in inventory.',
            },
            {
              title: 'Inventory movements in this period',
              columns: ['Date', 'Type', 'Material', 'Quantity', 'QR Code / Number', 'Reason'],
              rows: movementsInRange.map(movement => [movement.at.slice(0, 10), movement.type, materialName(movement.materialId), movement.qty, movement.orderId ?? movement.reference ?? '—', movement.reason]),
              empty: 'No inventory movements were recorded in this period.',
            },
          ],
          note: 'Stock levels are current; movements follow the selected date range.',
        }
      } else if (reportType === 'Production') {
        const statusCounts = new Map<string, number>()
        for (const order of ordersInRange) {
          const status = orderStatus(order)
          statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)
        }
        report = {
          summary: [...statusCounts.entries()].map(([status, count]) => [status, String(count)]),
          tables: [{
            title: 'Orders and production status',
            columns: ['Order', 'Customer', 'Product', 'Pieces', 'Stage', 'Status', 'Team', 'Deadline', 'Schedule'],
            rows: ordersInRange.map(order => [
              order.id, order.customer, order.product, order.pieces, order.stage ?? '—', orderStatus(order),
              order.teamId ?? '—', order.deadline,
              !order.claimed && !order.readyAt && order.deadline < DEMO_TODAY ? 'Overdue' : 'On schedule',
            ]),
            empty: 'No orders were created in this period.',
          }],
          note: 'Orders are included by creation date.',
        }
      } else if (reportType === 'Membership') {
        const adjustments = [
          ...filterByDateRange(tierCorrections, range, item => item.at).map(item => [item.at.slice(0, 10), item.npcNumber, `Tier ${item.fromTier} → ${item.toTier}`, '—'] as Cell[]),
          ...filterByDateRange(pointsAdjustments, range, item => item.at).map(item => [item.at.slice(0, 10), item.npcNumber, `Points ${item.fromPoints} → ${item.toPoints}`, item.reason] as Cell[]),
        ]
        report = {
          summary: [
            ...(['Bronze', 'Silver', 'Gold', 'Platinum'] as const).map(tier => [tier, String(members.filter(member => member.tier === tier).length)] as [string, string]),
            ['Total points', members.reduce((total, member) => total + member.points, 0).toLocaleString()],
          ],
          tables: [
            {
              title: 'Members by tier and points',
              columns: ['NPC Number', 'Name', 'Tier', 'Points', 'Joined'],
              rows: members.map(member => [member.npcNumber, member.name, member.tier, member.points, member.joinedAt]),
              empty: 'There are no members.',
            },
            {
              title: 'Manual adjustments in this period',
              columns: ['Date', 'NPC Number', 'Change', 'Reason'],
              rows: adjustments,
              empty: 'No manual tier or points adjustments in this period.',
            },
          ],
          note: 'Tier and points balances are current; manual adjustments follow the selected date range.',
        }
      } else {
        const payoutsInRange = filterByDateRange(payouts, range, payout => payout.postedAt)
        const bySalesPerson = new Map<string, { pieces: number; earned: number; paid: number }>()
        for (const payout of payoutsInRange) {
          const totals = bySalesPerson.get(payout.salesPersonId) ?? { pieces: 0, earned: 0, paid: 0 }
          totals.pieces += payout.pieces
          totals.earned += payout.amount
          totals.paid += payout.status === 'Paid' ? payout.amount : 0
          bySalesPerson.set(payout.salesPersonId, totals)
        }
        report = {
          summary: [
            ['Commission earned', formatCurrency(payoutsInRange.reduce((total, payout) => total + payout.amount, 0))],
            ['Paid out', formatCurrency(payoutsInRange.filter(payout => payout.status === 'Paid').reduce((total, payout) => total + payout.amount, 0))],
            ['Payouts', String(payoutsInRange.length)],
          ],
          tables: [
            {
              title: 'Commission by sales person',
              columns: ['Sales Person', 'Pieces', 'Earned', 'Paid', 'Balance Due'],
              rows: [...bySalesPerson.entries()].map(([id, totals]) => [nameOf(id), totals.pieces, formatCurrency(totals.earned), formatCurrency(totals.paid), formatCurrency(totals.earned - totals.paid)]),
              empty: 'No commission was earned in this period.',
            },
            {
              title: 'Commission entries',
              columns: ['Posted', 'Sales Person', 'Order', 'Pieces', 'Amount', 'Status'],
              rows: payoutsInRange.map(payout => [payout.postedAt.slice(0, 10), nameOf(payout.salesPersonId), payout.orderId, payout.pieces, formatCurrency(payout.amount), payout.status]),
              empty: 'No commission entries in this period.',
            },
          ],
        }
      }
      // A chart compares days, so a one-day range shows only the summary cards.
      const chart = range.from === range.to
        ? []
        : dailySeries(ordersInRange, range, order => order.createdAt, order => order.salePrice)
            .map(({ date, total }) => ({ date, sales: total }))
      return { report, chart }
    } catch (reason) {
      return { error: reason instanceof Error ? reason.message : 'The report could not be generated.' }
    }
  }, [reportType, range.from, range.to, orders, materials, movements, members, tierCorrections, pointsAdjustments, payouts, employees])

  const downloadCsv = () => {
    if ('error' in result) return
    try {
      const sections = result.report.tables.map(table => {
        const rows = table.rows.map(row => Object.fromEntries(table.columns.map((column, index) => [column, row[index]])))
        return `${table.title}\r\n${exportToCsv(rows, table.columns)}`
      })
      const csv = [`${reportType} report,${range.from} to ${range.to}`, ...sections].join('\r\n\r\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `neroconnect-${reportType.toLowerCase()}-${range.from}-to-${range.to}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage({ success: `Downloaded the ${reportType.toLowerCase()} report as a CSV file.`, error: '' })
    } catch (reason) {
      setMessage({ success: '', error: reason instanceof Error ? reason.message : 'The CSV report could not be downloaded.' })
    }
  }

  const dateField: React.CSSProperties = { display: 'block', marginTop: 4, padding: '6px 8px', border: `1px solid ${screenColors.border}`, borderRadius: 5, fontSize: 12 }

  return (
    <div>
      <ScreenTitle title="Reports & Analytics" subtitle="Sales, inventory, production, membership, and commission reports from saved records." />
      <ScreenFeedback success={'error' in result ? '' : message.success} error={'error' in result ? result.error : message.error} />
      <div role="tablist" aria-label="Report type" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {reportTypes.map(item => (
          <button key={item} type="button" role="tab" aria-selected={reportType === item} onClick={() => setReportType(item)} style={toggleStyle(reportType === item)}>{item}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
        <div role="group" aria-label="Report period" style={{ display: 'flex', gap: 4 }}>
          {periodModes.map(item => (
            <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)} style={toggleStyle(mode === item)}>{item}</button>
          ))}
        </div>
        {mode === 'Custom' && (
          <>
            <label style={{ color: screenColors.muted, fontSize: 11 }}>From
              <input type="date" value={custom.from} max={custom.to} onChange={event => setCustom(current => ({ ...current, from: event.target.value }))} style={dateField} />
            </label>
            <label style={{ color: screenColors.muted, fontSize: 11 }}>To
              <input type="date" value={custom.to} min={custom.from} onChange={event => setCustom(current => ({ ...current, to: event.target.value }))} style={dateField} />
            </label>
          </>
        )}
        <span style={{ color: screenColors.muted, fontSize: 12, padding: '0 6px 8px' }}>{range.from} to {range.to}</span>
        <ScreenButton allowReadOnly onClick={downloadCsv} disabled={'error' in result}>Download CSV</ScreenButton>
      </div>
      {'error' in result ? null : (
        <>
          {result.report.summary.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              {result.report.summary.map(([label, value]) => (
                <ScreenCard key={label}><p style={{ color: screenColors.muted, fontSize: 12 }}>{label}</p><strong>{value}</strong></ScreenCard>
              ))}
            </div>
          )}
          {result.report.note && <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 10 }}>{result.report.note}</p>}
          {result.report.tables.map(table => (
            <ScreenCard key={table.title} style={{ padding: 0, overflowX: 'auto', marginBottom: 16 }}>
              <h2 style={{ margin: 0, padding: '14px 12px 4px', fontSize: 15, color: screenColors.foreground }}>{table.title}</h2>
              {table.description && <p style={{ margin: 0, padding: '0 12px 8px', color: screenColors.muted, fontSize: 12 }}>{table.description}</p>}
              {table.rows.length === 0
                ? <div style={{ padding: 12 }}><EmptyState>{table.empty}</EmptyState></div>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{table.columns.map(column => <th key={column} style={{ ...cellStyle, color: screenColors.muted, fontWeight: 600 }}>{column}</th>)}</tr></thead>
                    <tbody>{table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} style={cellStyle}>{cell}</td>)}</tr>
                    ))}</tbody>
                  </table>
                )}
            </ScreenCard>
          ))}
          {reportType === 'Sales' && result.chart.length > 0 && (
            <>
              <ScreenCard style={{ marginBottom: 16 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 15, color: screenColors.foreground }}>Sales by order date</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={result.chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={screenColors.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: screenColors.muted }} />
                    <YAxis tick={{ fontSize: 11, fill: screenColors.muted }} tickFormatter={value => formatCurrency(Number(value))} />
                    <Tooltip formatter={value => formatCurrency(Number(value ?? 0))} />
                    <Bar dataKey="sales" name="Sales" fill={screenColors.accent} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </ScreenCard>
            </>
          )}
        </>
      )}
    </div>
  )
}
