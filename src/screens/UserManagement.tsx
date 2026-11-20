import { useState, type FormEvent } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'
import PermissionsGrid from '../components/PermissionsGrid'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, screenColors } from '../components/ScreenUI'
import {
  ACCOUNT_ROLES,
  USER_TAGS,
  WEEK_DAYS,
  defaultPermissions,
  displayTitle,
  emptyUserInput,
  resolveAccount,
  userInputFromEmployee,
  validateUserInput,
  type UserInput,
} from '../lib/userAccess'
import { useAdminStore } from '../store/adminStore'
import type { AccountRole, Employee, UserTag } from '../types'

type View = { mode: 'list' } | { mode: 'add' } | { mode: 'edit'; id: string }

const statusStyle: Record<Employee['status'], { color: string; background: string; border: string }> = {
  Active: { color: '#276749', background: '#E8F5EE', border: '#B7D9C5' },
  Pending: { color: '#7A5A12', background: '#FBF6E9', border: '#E2CC8F' },
  Inactive: { color: screenColors.muted, background: '#ECEAE3', border: screenColors.border },
}

function formatUpdated(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
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
const sectionHeading: React.CSSProperties = { color: screenColors.foreground, fontSize: 13, fontWeight: 600, marginBottom: 10 }
const chip: React.CSSProperties = { display: 'inline-block', padding: '1px 7px', borderRadius: 10, fontSize: 11, marginRight: 4 }

export default function UserManagement() {
  const employees = useAdminStore(state => state.employees)
  const deactivateUser = useAdminStore(state => state.deactivateUser)
  const reactivateUser = useAdminStore(state => state.reactivateUser)
  const activateEmployee = useAdminStore(state => state.activateEmployee)
  const [view, setView] = useState<View>({ mode: 'list' })
  const [confirmingId, setConfirmingId] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const run = (action: () => void, message: string) => {
    setError('')
    try {
      action()
      setSuccess(message)
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'The user action could not be completed.')
    }
    setConfirmingId('')
  }

  if (view.mode !== 'list') {
    const editing = view.mode === 'edit' ? employees.find(employee => employee.id === view.id) : undefined
    if (view.mode === 'edit' && !editing) {
      return (
        <ScreenCard>
          <ScreenFeedback error="That user no longer exists." />
          <ScreenButton variant="secondary" onClick={() => setView({ mode: 'list' })}>Back to users</ScreenButton>
        </ScreenCard>
      )
    }
    return (
      <UserForm
        key={view.mode === 'edit' ? view.id : 'new'}
        editing={editing}
        onCancel={() => setView({ mode: 'list' })}
        onSaved={message => {
          setError('')
          setSuccess(message)
          setView({ mode: 'list' })
        }}
      />
    )
  }

  return (
    <ScreenCard style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600 }}>Staff</h2>
          <p style={{ color: screenColors.muted, fontSize: 12, marginTop: 3 }}>Staff accounts, teams, work schedules, and per-module access. New staff start as Pending until activated.</p>
        </div>
        <ScreenButton onClick={() => { setSuccess(''); setError(''); setView({ mode: 'add' }) }}>Add User</ScreenButton>
      </div>
      <ScreenFeedback success={success} error={error} />
      {employees.length === 0
        ? <EmptyState>No staff yet. Select Add User to create the first account.</EmptyState>
        : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead><tr style={{ textAlign: 'left', background: '#ECEAE3' }}>
              {['Name', 'Job title and access', 'Team', 'Schedule', 'Status', 'Last updated', 'Actions'].map(label => (
                <th key={label} scope="col" style={{ padding: 10, color: screenColors.muted, fontSize: 11, textTransform: 'uppercase' }}>{label}</th>
              ))}
            </tr></thead>
            <tbody>{employees.map(employee => {
              const account = resolveAccount(employee)
              const status = statusStyle[employee.status]
              return (
                <tr key={employee.id} style={{ borderBottom: `1px solid ${screenColors.border}` }}>
                  <th scope="row" style={{ padding: 10, textAlign: 'left', color: screenColors.foreground, fontSize: 13, fontWeight: 500 }}>
                    {employee.name}
                    <small style={{ display: 'block', color: screenColors.muted, marginTop: 3, fontWeight: 400 }}>{account.email || 'No email on file'}</small>
                  </th>
                  <td style={{ padding: 10, fontSize: 13, color: screenColors.foreground }}>
                    <span style={{ display: 'block', marginBottom: 3 }}>{displayTitle(employee)}</span>
                    <span style={{ marginRight: 6, color: screenColors.muted, fontSize: 12, fontWeight: account.accountRole === 'Admin' ? 600 : 400 }}>{account.accountRole}</span>
                    {account.tags.map(tag => (
                      <span key={tag} style={{ ...chip, background: screenColors.accentLight, color: '#4A5A38', border: '1px solid #C9D6BC' }}>{tag}</span>
                    ))}
                  </td>
                  <td style={{ padding: 10, color: screenColors.muted, fontSize: 12 }}>{employee.team ?? '—'}</td>
                  <td style={{ padding: 10, color: screenColors.muted, fontSize: 12 }}>{employee.schedule.length ? employee.schedule.map(day => day.slice(0, 3)).join(', ') : 'Not scheduled'}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ ...chip, fontWeight: 600, color: status.color, background: status.background, border: `1px solid ${status.border}` }}>{employee.status}</span>
                  </td>
                  <td style={{ padding: 10, color: screenColors.muted, fontSize: 12 }}>{formatUpdated(account.updatedAt)}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {confirmingId === employee.id
                        ? (
                          <>
                            <span style={{ color: screenColors.error, fontSize: 12 }}>Deactivate {employee.name}?</span>
                            <ScreenButton variant="danger" onClick={() => run(() => deactivateUser(employee.id), `${employee.name} was deactivated and can no longer sign in.`)}>Confirm</ScreenButton>
                            <ScreenButton variant="secondary" onClick={() => setConfirmingId('')}>Cancel</ScreenButton>
                          </>
                        )
                        : (
                          <>
                            {employee.status === 'Pending' && (
                              <ScreenButton onClick={() => run(() => activateEmployee(employee.id), `${employee.name} is now Active.`)}>Activate</ScreenButton>
                            )}
                            <ScreenButton variant="secondary" onClick={() => { setSuccess(''); setError(''); setView({ mode: 'edit', id: employee.id }) }}>Edit</ScreenButton>
                            {employee.status === 'Inactive'
                              ? <ScreenButton variant="secondary" onClick={() => run(() => reactivateUser(employee.id), `${employee.name} is Active again.`)}>Reactivate</ScreenButton>
                              : <ScreenButton variant="danger" onClick={() => setConfirmingId(employee.id)}>Deactivate</ScreenButton>}
                          </>
                        )}
                    </div>
                  </td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
    </ScreenCard>
  )
}

function UserForm({
  editing,
  onCancel,
  onSaved,
}: {
  editing?: Employee
  onCancel: () => void
  onSaved: (message: string) => void
}) {
  const employees = useAdminStore(state => state.employees)
  const createUser = useAdminStore(state => state.createUser)
  const updateUser = useAdminStore(state => state.updateUser)
  const [form, setForm] = useState<UserInput>(() => editing ? userInputFromEmployee(editing) : emptyUserInput())
  const [errors, setErrors] = useState<string[]>([])
  const isAdmin = form.accountRole === 'Admin'
  const defaults = defaultPermissions(form.accountRole, form.tags)
  const hadPassword = editing ? resolveAccount(editing).credential === 'Password' : false
  const teams = [...new Set(employees.map(employee => employee.team).filter((team): team is string => Boolean(team)))]

  const update = <K extends keyof UserInput>(key: K, value: UserInput[K]) => setForm(current => ({ ...current, [key]: value }))

  const changeRole = (accountRole: AccountRole) =>
    setForm(current => ({ ...current, accountRole, permissions: defaultPermissions(accountRole, current.tags) }))

  const toggleTag = (tag: UserTag, on: boolean) =>
    setForm(current => {
      const tags = on ? [...current.tags, tag] : current.tags.filter(item => item !== tag)
      return { ...current, tags, permissions: defaultPermissions(current.accountRole, tags) }
    })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateUserInput(form, employees, editing?.id)
    if (found.length > 0) {
      setErrors(found)
      return
    }
    try {
      if (editing) {
        updateUser(editing.id, form)
        onSaved(`${form.name.trim()} was updated. Changes apply the next time they sign in.`)
      } else {
        createUser(form)
        onSaved(form.credential === 'Invite'
          ? `${form.name.trim()} was added as Pending. An invite will go to ${form.email.trim()} (mock). Activate them from the Staff list.`
          : `${form.name.trim()} was added as Pending with a password set. Activate them from the Staff list.`)
      }
    } catch (reason) {
      setErrors([reason instanceof Error ? reason.message : 'The user could not be saved.'])
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button type="button" onClick={onCancel} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: screenColors.muted, font: '12px Inter, sans-serif', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={14} /> Users
        </button>
        <span style={{ color: screenColors.border }}>/</span>
        <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600 }}>{editing ? `Edit User: ${editing.name}` : 'Add User'}</h2>
      </div>

      {errors.length > 0 && (
        <div role="alert" style={{ padding: '10px 12px', borderRadius: 6, marginBottom: 16, background: screenColors.errorLight, border: '1px solid #E8C4B4', color: screenColors.error, fontSize: 13 }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Fix the following before saving:</p>
          <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>{errors.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <ScreenCard>
          <h3 style={sectionHeading}>Account details</h3>
          <label style={{ ...labelStyle, marginBottom: 12 }}>
            Full name
            <input required value={form.name} onChange={event => update('name', event.target.value)} style={fieldStyle} autoComplete="off" />
          </label>
          <label style={{ ...labelStyle, marginBottom: 12 }}>
            Email
            <input required type="email" value={form.email} onChange={event => update('email', event.target.value)} style={fieldStyle} autoComplete="off" />
          </label>
          <label style={{ ...labelStyle, marginBottom: 12 }}>
            Contact number
            <input required type="tel" value={form.contactNumber} onChange={event => update('contactNumber', event.target.value)} style={fieldStyle} placeholder="0917 555 0100" />
          </label>
          <fieldset style={{ border: `1px solid ${screenColors.border}`, borderRadius: 5, padding: 10 }}>
            <legend style={{ color: screenColors.muted, fontSize: 12, padding: '0 4px' }}>Sign-in setup</legend>
            <div style={{ display: 'flex', gap: 16, marginBottom: form.credential === 'Password' ? 10 : 0 }}>
              {(['Invite', 'Password'] as const).map(option => (
                <label key={option} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: screenColors.foreground, fontSize: 12 }}>
                  <input type="radio" name="credential" checked={form.credential === option} onChange={() => update('credential', option)} style={{ accentColor: screenColors.accent }} />
                  {option === 'Invite' ? 'Send invite link (user sets password)' : 'Set password now'}
                </label>
              ))}
            </div>
            {form.credential === 'Password' && (
              <label style={labelStyle}>
                {hadPassword ? 'New password (optional)' : 'Password'}
                <input type="password" value={form.password} onChange={event => update('password', event.target.value)} style={fieldStyle} autoComplete="new-password" placeholder={hadPassword ? 'Leave blank to keep current password' : 'At least 8 characters'} />
              </label>
            )}
          </fieldset>
        </ScreenCard>

        <ScreenCard>
          <h3 style={sectionHeading}>Role and work setup</h3>
          <label style={{ ...labelStyle, marginBottom: 12 }}>
            Job title (optional)
            <input value={form.jobTitle} maxLength={40} onChange={event => update('jobTitle', event.target.value)} style={fieldStyle} placeholder="e.g. Manager, Cashier, Lead Printer" />
            <small style={{ display: 'block', marginTop: 4 }}>A label only. Access comes from the account role and module permissions below.</small>
          </label>
          <label style={{ ...labelStyle, marginBottom: 12 }}>
            Account role
            <select value={form.accountRole} onChange={event => changeRole(event.target.value as AccountRole)} style={fieldStyle}>
              {ACCOUNT_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <fieldset style={{ border: `1px solid ${screenColors.border}`, borderRadius: 5, padding: 10, marginBottom: 12 }}>
            <legend style={{ color: screenColors.muted, fontSize: 12, padding: '0 4px' }}>Tags (optional)</legend>
            <div style={{ display: 'flex', gap: 16 }}>
              {USER_TAGS.map(tag => (
                <label key={tag} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: screenColors.foreground, fontSize: 12 }}>
                  <input type="checkbox" checked={form.tags.includes(tag)} onChange={event => toggleTag(tag, event.target.checked)} style={{ accentColor: screenColors.accent }} />
                  {tag}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset style={{ border: `1px solid ${screenColors.border}`, borderRadius: 5, padding: 10, marginBottom: 12 }}>
            <legend style={{ color: screenColors.muted, fontSize: 12, padding: '0 4px' }}>Work schedule</legend>
            <div style={{ display: 'flex', gap: '8px 14px', flexWrap: 'wrap' }}>
              {WEEK_DAYS.map(day => (
                <label key={day} style={{ display: 'inline-flex', gap: 5, alignItems: 'center', color: screenColors.foreground, fontSize: 12 }}>
                  <input type="checkbox" checked={form.schedule.includes(day)} onChange={event => update('schedule', event.target.checked ? [...form.schedule, day] : form.schedule.filter(value => value !== day))} style={{ accentColor: screenColors.accent }} />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </fieldset>
          <label style={labelStyle}>
            Production team{form.tags.includes('Production') ? '' : ' (optional)'}
            <input list="production-teams" value={form.team} onChange={event => update('team', event.target.value)} style={fieldStyle} placeholder="e.g. Team A" />
            <datalist id="production-teams">{teams.map(team => <option key={team} value={team} />)}</datalist>
          </label>
        </ScreenCard>
      </div>

      <ScreenCard style={{ overflowX: 'auto', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div>
            <h3 style={{ ...sectionHeading, marginBottom: 3 }}>Module permissions</h3>
            <p style={{ color: screenColors.muted, fontSize: 12 }}>
              {isAdmin
                ? 'Admin accounts always have View and edit on every module.'
                : 'Pre-filled from the account role and tags. Changing either resets the grid to its defaults; adjust any row after that. No access hides a screen; View only shows it read-only.'}
            </p>
          </div>
          {!isAdmin && (
            <ScreenButton variant="secondary" onClick={() => update('permissions', defaults)}>Reset to defaults</ScreenButton>
          )}
        </div>
        {isAdmin && (
          <p role="note" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', marginBottom: 10, borderRadius: 6, background: screenColors.accentLight, border: '1px solid #C9D6BC', color: '#4A5A38', fontSize: 12 }}>
            <Lock size={14} /> Locked: Admin access cannot be restricted. Change the role to Employee to set per-module access.
          </p>
        )}
        <PermissionsGrid
          permissions={isAdmin ? defaults : form.permissions}
          defaults={defaults}
          locked={isAdmin}
          onChange={(moduleId, level) => update('permissions', { ...form.permissions, [moduleId]: level })}
        />
      </ScreenCard>

      <div style={{ display: 'flex', gap: 8 }}>
        <ScreenButton type="submit">{editing ? 'Save changes' : 'Create user'}</ScreenButton>
        <ScreenButton variant="secondary" onClick={onCancel}>Cancel</ScreenButton>
      </div>
    </form>
  )
}
