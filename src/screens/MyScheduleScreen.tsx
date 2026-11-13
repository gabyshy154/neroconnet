import { DEMO_TODAY } from '../config'
import { EmptyState, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { useAdminStore } from '../store/adminStore'

export default function MyScheduleScreen() {
  const viewAs = useAdminStore(state => state.viewAs)
  const employees = useAdminStore(state => state.employees)
  const orders = useAdminStore(state => state.orders)
  const employeeId = viewAs.startsWith('employee:') ? viewAs.slice('employee:'.length) : ''
  const employee = employees.find(item => item.id === employeeId)

  if (!employee) {
    return (
      <div>
        <ScreenTitle title="My Schedule" subtitle="Read-only employee schedule and assigned production work." />
        <ScreenFeedback error="The selected employee could not be found." />
      </div>
    )
  }

  const assignedOrders = orders.filter(order =>
    !order.claimed &&
    (order.salesPersonId === employee.id || Boolean(employee.team && order.teamId === employee.team)),
  )

  return (
    <div>
      <ScreenTitle title="My Schedule" subtitle={`Read-only schedule for ${employee.name}. Demo date: ${DEMO_TODAY}.`} />
      <ScreenFeedback success="Schedule and assigned order details are read-only." />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.7fr) minmax(0, 1.5fr)', gap: 16, alignItems: 'start' }}>
        <ScreenCard>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 10 }}>My shifts</h2>
          <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 12 }}>Team: <strong style={{ color: screenColors.foreground }}>{employee.team ?? 'Not assigned'}</strong></p>
          {employee.schedule.length === 0
            ? <EmptyState>No shifts are scheduled.</EmptyState>
            : <ul style={{ paddingLeft: 18, margin: 0, color: screenColors.foreground, fontSize: 13, lineHeight: 1.9 }}>
                {employee.schedule.map(day => <li key={day}>{day}</li>)}
              </ul>}
        </ScreenCard>
        <ScreenCard style={{ overflowX: 'auto' }}>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Assigned orders</h2>
          {assignedOrders.length === 0
            ? <EmptyState>No orders are assigned to your team or account.</EmptyState>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                <thead><tr style={{ textAlign: 'left', background: '#ECEAE3' }}>
                  {['Order', 'Customer', 'Deadline', 'Stage', 'Status'].map(label => (
                    <th key={label} scope="col" style={{ padding: 9, color: screenColors.muted, fontSize: 11 }}>{label}</th>
                  ))}
                </tr></thead>
                <tbody>{assignedOrders.map(order => {
                  const overdue = order.deadline < DEMO_TODAY
                  return (
                    <tr key={order.id} style={{ borderBottom: `1px solid ${screenColors.border}` }}>
                      <th scope="row" style={{ padding: 9, textAlign: 'left', color: screenColors.foreground, fontSize: 12, fontWeight: 600 }}>{order.id}</th>
                      <td style={{ padding: 9, color: screenColors.foreground, fontSize: 12 }}>{order.customer}</td>
                      <td style={{ padding: 9, color: screenColors.foreground, fontSize: 12 }}>{order.deadline}</td>
                      <td style={{ padding: 9, color: screenColors.foreground, fontSize: 12 }}>{order.stage ?? 'Not assigned'}</td>
                      <td style={{ padding: 9, color: overdue ? '#9B3526' : '#276749', fontSize: 12, fontWeight: 600 }}>{overdue ? 'Overdue' : 'On schedule'}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            )}
        </ScreenCard>
      </div>
    </div>
  )
}
