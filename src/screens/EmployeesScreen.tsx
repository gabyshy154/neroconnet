import { useState } from 'react'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { DEMO_TODAY } from '../config'
import { orderStatus } from '../lib/admin'
import { useAdminStore } from '../store/adminStore'
import CustomersTab from './CustomersTab'
import UserManagement from './UserManagement'

const stages = ['Cutting', 'Printing/Sewing', 'Heat Press', 'Quality Control'] as const
type UserManagementTab = 'Staff' | 'Customers' | 'Order Assignment'

const tabs: UserManagementTab[] = ['Staff', 'Customers', 'Order Assignment']

export default function EmployeesScreen() {
  const employees = useAdminStore(state => state.employees)
  const orders = useAdminStore(state => state.orders)
  const assignOrderTeam = useAdminStore(state => state.assignOrderTeam)
  const [activeTab, setActiveTab] = useState<UserManagementTab>('Staff')
  const [teamByOrder, setTeamByOrder] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState("Assign a production team to each order. Each order's deadline is its schedule.")
  const [error, setError] = useState('')
  const markOrderReady = useAdminStore(state => state.markOrderReady)
  const activeOrders = orders.filter(order => order.stage && !order.claimed && !order.readyAt)
  const readyOrders = orders.filter(order => order.readyAt && !order.claimed)
  const activeEmployees = employees.filter(employee => employee.status === 'Active')

  const runAction = (action: () => void, message: string) => {
    setError('')
    try {
      action()
      setSuccess(message)
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'The employee action could not be completed.')
    }
  }

  const fieldStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    marginTop: 5,
    padding: '8px 9px',
    border: `1px solid ${screenColors.border}`,
    borderRadius: 5,
    background: '#fff',
    color: screenColors.foreground,
    font: '13px Inter, sans-serif',
  }

  return (
    <div>
      <ScreenTitle title="User Management" subtitle="Staff accounts and module access, customer records, and production assignments." />
      {activeTab === 'Order Assignment' && <ScreenFeedback success={success} error={error} />}
      <div role="tablist" aria-label="User Management sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {tabs.map(tab => (
          <button
            key={tab}
            id={`employee-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 11px',
              border: `1px solid ${activeTab === tab ? screenColors.accent : screenColors.border}`,
              borderRadius: 6,
              background: activeTab === tab ? screenColors.accentLight : screenColors.card,
              color: screenColors.foreground,
              font: '12px Inter, sans-serif',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
            }}
          >{tab}</button>
        ))}
      </div>

      {activeTab === 'Order Assignment' && (
        <ScreenCard style={{ overflowX: 'auto' }}>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Production team assignment</h2>
          {activeOrders.length === 0
            ? <EmptyState>No active production orders need assignment.</EmptyState>
            : activeOrders.map(order => (
              <div key={order.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) repeat(3, minmax(140px, 1fr)) auto', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${screenColors.border}`, minWidth: 720 }}>
                <div>
                  <p style={{ color: screenColors.foreground, fontSize: 13, fontWeight: 600 }}>{order.id}</p>
                  <p style={{ color: screenColors.muted, fontSize: 12 }}>{order.customer} · {order.pieces} pcs</p>
                </div>
                <label style={{ color: screenColors.muted, fontSize: 11 }}>
                  Current stage
                  <select value={order.stage} disabled aria-label={`Current stage for ${order.id}`} style={{ ...fieldStyle, background: '#F4F3EE' }}>
                    {stages.map(stage => <option key={stage}>{stage}</option>)}
                  </select>
                </label>
                <label style={{ color: screenColors.muted, fontSize: 11 }}>
                  Production team
                  <select value={teamByOrder[order.id] ?? order.teamId ?? ''} onChange={event => setTeamByOrder(current => ({ ...current, [order.id]: event.target.value }))} style={fieldStyle}>
                    <option value="">Select a team</option>
                    {[...new Set(activeEmployees.map(employee => employee.team).filter((value): value is string => Boolean(value)))].map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <span style={{ color: screenColors.muted, fontSize: 11 }}>
                  Deadline<br />
                  <strong style={{ color: order.deadline < DEMO_TODAY ? '#9B3526' : screenColors.foreground, fontSize: 13 }}>
                    {order.deadline}{order.deadline < DEMO_TODAY ? ' · Overdue' : ''}
                  </strong>
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <ScreenButton onClick={() => runAction(
                    () => assignOrderTeam(order.id, teamByOrder[order.id] ?? order.teamId ?? ''),
                    `${order.id} assigned to ${teamByOrder[order.id] ?? order.teamId}.`,
                  )}>Assign team</ScreenButton>
                  {order.stage === 'Quality Control' && (
                    <ScreenButton variant="secondary" onClick={() => runAction(
                      () => markOrderReady(order.id),
                      `${order.id} passed Quality Control and is now ${orderStatus({ ...order, readyAt: 'now' })}.`,
                    )}>Mark ready</ScreenButton>
                  )}
                </div>
              </div>
            ))}
          {readyOrders.length > 0 && (
            <>
              <h3 style={{ color: screenColors.foreground, fontSize: 14, fontWeight: 600, margin: '18px 0 8px' }}>Ready for claim</h3>
              {readyOrders.map(order => (
                <p key={order.id} style={{ color: screenColors.foreground, fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${screenColors.border}` }}>
                  {order.id} · {order.customer} · <strong style={{ color: '#276749' }}>{orderStatus(order)}</strong>
                </p>
              ))}
            </>
          )}
        </ScreenCard>
      )}

      {activeTab === 'Staff' && <UserManagement />}
      {activeTab === 'Customers' && <CustomersTab />}
    </div>
  )
}
