import { useState, type FormEvent } from 'react'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import type { EmployeeInput } from '../lib/admin'
import { useAdminStore } from '../store/adminStore'
import type { Role } from '../types'

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const stages = ['Cutting', 'Printing/Sewing', 'Heat Press', 'Quality Control'] as const
const roles: Role[] = ['Admin', 'Manager', 'Sales Person', 'Production Staff']
const permissions: Record<Role, string[]> = {
  Admin: ['View dashboard and reports', 'Manage inventory and recommendations', 'Manage employee records and permissions', 'Manage membership and pricing rules', 'Review submitted designs'],
  Manager: ['View dashboard and reports', 'Manage inventory and recommendations', 'Manage production assignments', 'Review submitted designs'],
  'Sales Person': ['View assigned orders', 'Record staff-entered payments', 'View membership details'],
  'Production Staff': ['View assigned production orders', 'Update production stage', 'View assigned schedule'],
}

type EmployeeTab = 'Staff List' | 'Schedule' | 'Order Assignment' | 'Roles & Permissions' | 'Create Employee'

const tabs: EmployeeTab[] = [
  'Staff List',
  'Schedule',
  'Order Assignment',
  'Roles & Permissions',
  'Create Employee',
]

export default function EmployeesScreen() {
  const employees = useAdminStore(state => state.employees)
  const orders = useAdminStore(state => state.orders)
  const createEmployee = useAdminStore(state => state.createEmployee)
  const activateEmployee = useAdminStore(state => state.activateEmployee)
  const assignOrderTeamAndSchedule = useAdminStore(state => state.assignOrderTeamAndSchedule)
  const [activeTab, setActiveTab] = useState<EmployeeTab>('Staff List')
  const [selectedRole, setSelectedRole] = useState<Role>('Admin')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('Production Staff')
  const [team, setTeam] = useState('')
  const [schedule, setSchedule] = useState<string[]>([])
  const [teamByOrder, setTeamByOrder] = useState<Record<string, string>>({})
  const [scheduleByOrder, setScheduleByOrder] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState('Employee records and schedules loaded from the local store.')
  const [error, setError] = useState('')
  const activeOrders = orders.filter(order => order.stage && !order.claimed)
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

  const submitEmployee = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      const input: EmployeeInput = { name, role, team, schedule }
      createEmployee(input)
      setName('')
      setTeam('')
      setSchedule([])
      setSuccess('Employee created with Pending status. Activate the account from Staff List after review.')
      setActiveTab('Staff List')
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Employee could not be created.')
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
  const labelStyle: React.CSSProperties = { display: 'block', color: screenColors.muted, fontSize: 12 }

  return (
    <div>
      <ScreenTitle title="Employees" subtitle="Staff, schedules, production assignments, roles, and employee creation." />
      <ScreenFeedback success={success} error={error} />
      <div role="tablist" aria-label="Employee sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
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

      {activeTab === 'Staff List' && (
        <ScreenCard style={{ overflowX: 'auto' }}>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Staff list</h2>
          {employees.length === 0
            ? <EmptyState>No employees have been added.</EmptyState>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead><tr style={{ textAlign: 'left', background: '#ECEAE3' }}>
                  {['Employee', 'Role', 'Team', 'Status', 'Schedule', 'Action'].map(label => (
                    <th key={label} scope="col" style={{ padding: 10, color: screenColors.muted, fontSize: 11, textTransform: 'uppercase' }}>{label}</th>
                  ))}
                </tr></thead>
                <tbody>{employees.map(employee => (
                  <tr key={employee.id} style={{ borderBottom: `1px solid ${screenColors.border}` }}>
                    <th scope="row" style={{ padding: 10, color: screenColors.foreground, textAlign: 'left', fontSize: 13, fontWeight: 500 }}>{employee.name}<small style={{ display: 'block', color: screenColors.muted, marginTop: 3 }}>{employee.id}</small></th>
                    <td style={{ padding: 10, color: screenColors.foreground, fontSize: 13 }}>{employee.role}</td>
                    <td style={{ padding: 10, color: screenColors.muted, fontSize: 13 }}>{employee.team ?? '—'}</td>
                    <td style={{ padding: 10, color: employee.status === 'Active' ? '#276749' : screenColors.muted, fontSize: 12, fontWeight: 600 }}>{employee.status}</td>
                    <td style={{ padding: 10, color: screenColors.muted, fontSize: 12 }}>{employee.schedule.length ? employee.schedule.join(', ') : 'Not scheduled'}</td>
                    <td style={{ padding: 10 }}>
                      {employee.status === 'Pending'
                        ? <ScreenButton onClick={() => runAction(() => activateEmployee(employee.id), `${employee.name} is now Active.`)}>Activate</ScreenButton>
                        : <span style={{ color: screenColors.muted, fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            )}
        </ScreenCard>
      )}

      {activeTab === 'Schedule' && (
        <ScreenCard style={{ overflowX: 'auto' }}>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Weekly schedule calendar</h2>
          {activeEmployees.length === 0
            ? <EmptyState>No active employees are scheduled.</EmptyState>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                <thead><tr style={{ textAlign: 'center', background: '#ECEAE3' }}>
                  <th scope="col" style={{ padding: 9, color: screenColors.muted, fontSize: 11, textAlign: 'left' }}>Employee</th>
                  <th scope="col" style={{ padding: 9, color: screenColors.muted, fontSize: 11 }}>Team</th>
                  {weekDays.map(day => <th key={day} scope="col" style={{ padding: 9, color: screenColors.muted, fontSize: 11 }}>{day.slice(0, 3)}</th>)}
                </tr></thead>
                <tbody>{activeEmployees.map(employee => (
                  <tr key={employee.id} style={{ borderBottom: `1px solid ${screenColors.border}`, textAlign: 'center' }}>
                    <th scope="row" style={{ padding: 9, color: screenColors.foreground, fontSize: 12, fontWeight: 500, textAlign: 'left' }}>{employee.name}</th>
                    <td style={{ padding: 9, color: screenColors.muted, fontSize: 12 }}>{employee.team ?? '—'}</td>
                    {weekDays.map(day => {
                      const scheduled = employee.schedule.includes(day)
                      return <td key={day} aria-label={`${day}: ${scheduled ? 'scheduled' : 'off'}`} style={{ padding: 9, background: scheduled ? '#EAF0E4' : 'transparent', color: scheduled ? '#4A5A38' : screenColors.muted, fontSize: 12 }}>{scheduled ? 'Scheduled' : 'Off'}</td>
                    })}
                  </tr>
                ))}</tbody>
              </table>
            )}
        </ScreenCard>
      )}

      {activeTab === 'Order Assignment' && (
        <ScreenCard style={{ overflowX: 'auto' }}>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Production team and schedule assignment</h2>
          {activeOrders.length === 0
            ? <EmptyState>No active production orders need assignment.</EmptyState>
            : activeOrders.map(order => (
              <div key={order.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) repeat(4, minmax(140px, 1fr)) auto', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${screenColors.border}`, minWidth: 850 }}>
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
                <label style={{ color: screenColors.muted, fontSize: 11 }}>
                  Schedule start
                  <input type="datetime-local" value={scheduleByOrder[order.id] ?? order.scheduleStart ?? ''} onChange={event => setScheduleByOrder(current => ({ ...current, [order.id]: event.target.value }))} style={fieldStyle} />
                </label>
                <span style={{ color: screenColors.muted, fontSize: 11 }}>Deadline<br />{order.deadline}</span>
                <ScreenButton onClick={() => runAction(
                  () => assignOrderTeamAndSchedule(order.id, teamByOrder[order.id] ?? order.teamId ?? '', scheduleByOrder[order.id] ?? order.scheduleStart ?? ''),
                  `Team and schedule saved for ${order.id}.`,
                )}>Save assignment</ScreenButton>
              </div>
            ))}
        </ScreenCard>
      )}

      {activeTab === 'Roles & Permissions' && (
        <ScreenCard>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 5 }}>Permissions by role</h2>
          <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 12 }}>Review the access configured for each role.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {roles.map(item => (
              <button key={item} type="button" onClick={() => setSelectedRole(item)} aria-pressed={selectedRole === item} style={{
                textAlign: 'left',
                padding: '8px 10px',
                border: `1px solid ${selectedRole === item ? screenColors.accent : screenColors.border}`,
                borderRadius: 5,
                background: selectedRole === item ? screenColors.accentLight : '#fff',
                color: screenColors.foreground,
                font: '13px Inter, sans-serif',
                cursor: 'pointer',
              }}>{item}</button>
            ))}
          </div>
          <h3 style={{ color: screenColors.foreground, fontSize: 13, marginBottom: 9 }}>{selectedRole} permissions</h3>
          <ul style={{ paddingLeft: 18, color: screenColors.muted, fontSize: 12, lineHeight: 1.8 }}>
            {permissions[selectedRole].map(permission => <li key={permission}>{permission}</li>)}
          </ul>
        </ScreenCard>
      )}

      {activeTab === 'Create Employee' && (
        <ScreenCard style={{ maxWidth: 700 }}>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Create Employee</h2>
          <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 14 }}>Complete the required fields, validate, and save as Pending. Activate from Staff List after review.</p>
          <form onSubmit={submitEmployee} noValidate>
            <label style={{ ...labelStyle, marginBottom: 12 }}>
              Employee name
              <input required value={name} onChange={event => setName(event.target.value)} style={fieldStyle} />
            </label>
            <label style={{ ...labelStyle, marginBottom: 12 }}>
              Role
              <select value={role} onChange={event => setRole(event.target.value as Role)} style={fieldStyle}>
                {roles.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label style={{ ...labelStyle, marginBottom: 12 }}>
              Team
              <input required value={team} onChange={event => setTeam(event.target.value)} style={fieldStyle} placeholder="Enter employee team" />
            </label>
            <fieldset style={{ border: `1px solid ${screenColors.border}`, borderRadius: 5, padding: 10, marginBottom: 14 }}>
              <legend style={{ color: screenColors.muted, fontSize: 12, padding: '0 4px' }}>Schedule days</legend>
              <div style={{ display: 'flex', gap: '8px 14px', flexWrap: 'wrap' }}>
                {weekDays.map(day => (
                  <label key={day} style={{ display: 'inline-flex', gap: 5, alignItems: 'center', color: screenColors.foreground, fontSize: 12 }}>
                    <input type="checkbox" checked={schedule.includes(day)} onChange={event => setSchedule(current => event.target.checked ? [...current, day] : current.filter(value => value !== day))} />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
            <ScreenButton type="submit">Validate and create Pending employee</ScreenButton>
          </form>
        </ScreenCard>
      )}
    </div>
  )
}
