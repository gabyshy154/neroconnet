import { useMemo, useState } from 'react'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { formatCurrency } from '../lib/admin'
import { filterByPostedAtPeriod, type ReportingPeriod } from '../lib/reporting'
import { useAdminStore } from '../store/adminStore'
import { DEMO_TODAY } from '../config'

const cellStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${screenColors.border}`, textAlign: 'left', fontSize: 12 }

export default function CommissionScreen() {
  const employees = useAdminStore(state => state.employees)
  const payouts = useAdminStore(state => state.commissionPayouts)
  const markCommissionPaid = useAdminStore(state => state.markCommissionPaid)
  const [period, setPeriod] = useState<ReportingPeriod>('Daily')
  const [success, setSuccess] = useState('Commission data loaded from the local store.')
  const [error, setError] = useState('')
  const periodPayouts = useMemo(() => filterByPostedAtPeriod(payouts, period, DEMO_TODAY), [payouts, period])
  const salesPeople = employees.filter(employee => employee.role === 'Sales Person')
  const summaries = salesPeople.map(person => {
    const personPayouts = periodPayouts.filter(payout => payout.salesPersonId === person.id)
    const earned = personPayouts.reduce((sum, payout) => sum + payout.amount, 0)
    const paid = personPayouts.filter(payout => payout.status === 'Paid').reduce((sum, payout) => sum + payout.amount, 0)
    return { person, personPayouts, earned, paid, due: earned - paid }
  })
  const totals = periodPayouts.reduce((result, payout) => ({
    pieces: result.pieces + payout.pieces,
    earned: result.earned + payout.amount,
    paid: result.paid + (payout.status === 'Paid' ? payout.amount : 0),
  }), { pieces: 0, earned: 0, paid: 0 })

  const payPayout = (id: string) => {
    setError('')
    try {
      markCommissionPaid(id, new Date().toISOString())
      setSuccess('Commission payout marked paid and timestamped. Paid status cannot be reversed.')
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Commission payout could not be updated.')
    }
  }

  return (
    <div>
      <ScreenTitle title="Commission" subtitle="Commission is earned at ₱20.00 per piece for claimed, fully paid orders." />
      <ScreenFeedback success={success} error={error} />
      <div role="group" aria-label="Commission period" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['Daily', 'Weekly'] as const).map(item => (
          <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)} style={{
            padding: '8px 12px', border: `1px solid ${period === item ? screenColors.accent : screenColors.border}`,
            borderRadius: 6, background: period === item ? screenColors.accentLight : screenColors.card,
            color: screenColors.foreground, cursor: 'pointer',
          }}>{item === 'Daily' ? 'Today' : 'This Week'}</button>
        ))}
      </div>
      <ScreenCard style={{ padding: 0, overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Sales Person', 'Payouts', 'Commission Earned', 'Paid', 'Balance Due'].map(label => <th key={label} style={{ ...cellStyle, color: screenColors.muted, fontWeight: 600 }}>{label}</th>)}</tr></thead>
          <tbody>{summaries.map(({ person, personPayouts, earned, paid, due }) => (
            <tr key={person.id}>
              <td style={cellStyle}>{person.name}</td><td style={cellStyle}>{personPayouts.length}</td>
              <td style={cellStyle}>{formatCurrency(earned)}</td><td style={cellStyle}>{formatCurrency(paid)}</td>
              <td style={cellStyle}>{formatCurrency(due)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{ background: '#F4F3EE' }}>
            <th style={cellStyle}>Total</th><th style={cellStyle}>{periodPayouts.length}</th>
            <th style={cellStyle}>{formatCurrency(totals.earned)}</th><th style={cellStyle}>{formatCurrency(totals.paid)}</th>
            <th style={cellStyle}>{formatCurrency(totals.earned - totals.paid)}</th>
          </tr></tfoot>
        </table>
      </ScreenCard>
      {periodPayouts.length === 0
        ? <EmptyState>No commission payouts are recorded for this period.</EmptyState>
        : (
          <ScreenCard style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Sales Person', 'Order', 'Pieces', 'Amount', 'Status', 'Paid At', 'Action'].map(label => <th key={label} style={{ ...cellStyle, color: screenColors.muted, fontWeight: 600 }}>{label}</th>)}</tr></thead>
              <tbody>{periodPayouts.map(payout => {
                const person = salesPeople.find(employee => employee.id === payout.salesPersonId)
                return (
                  <tr key={payout.id}>
                    <td style={cellStyle}>{person?.name ?? payout.salesPersonId}</td><td style={cellStyle}>{payout.orderId}</td>
                    <td style={cellStyle}>{payout.pieces}</td><td style={cellStyle}>{formatCurrency(payout.amount)}</td>
                    <td style={cellStyle}>{payout.status}</td>
                    <td style={cellStyle}>{payout.paidAt ? new Date(payout.paidAt).toLocaleString() : '—'}</td>
                    <td style={cellStyle}>{payout.status === 'Unpaid'
                      ? <ScreenButton onClick={() => payPayout(payout.id)}>Mark as paid</ScreenButton>
                      : 'Paid — locked'}</td>
                  </tr>
                )
              })}</tbody>
            </table>
          </ScreenCard>
        )}
    </div>
  )
}
