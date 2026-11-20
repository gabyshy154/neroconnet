import { Fragment, useMemo, useState } from 'react'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, screenColors } from '../components/ScreenUI'
import { formatCurrency, orderStatus } from '../lib/admin'
import { useAdminStore } from '../store/adminStore'
import type { Customer } from '../types'

const cellStyle: React.CSSProperties = { padding: 10, color: screenColors.foreground, fontSize: 12, verticalAlign: 'top' }
const smallField: React.CSSProperties = { padding: '5px 7px', border: `1px solid ${screenColors.border}`, borderRadius: 5, fontSize: 12, width: 180 }

/**
 * Customer records for the shop (portal accounts and walk-ins). Mostly view-only: customers
 * correct their own details in the Customer Portal, and enrollment stays in the Customer Portal
 * and Billing System. The admin can deactivate a portal login, for example on a data-privacy request.
 */
export default function CustomersTab() {
  const customers = useAdminStore(state => state.customers)
  const orders = useAdminStore(state => state.orders)
  const members = useAdminStore(state => state.members)
  const deactivateCustomer = useAdminStore(state => state.deactivateCustomer)
  const reactivateCustomer = useAdminStore(state => state.reactivateCustomer)
  const blockCustomer = useAdminStore(state => state.blockCustomer)
  const unblockCustomer = useAdminStore(state => state.unblockCustomer)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [actingId, setActingId] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState({ success: '', error: '' })

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return customers
      .filter(customer => !query || [customer.name, customer.contactNumber, customer.email ?? '', customer.npcNumber ?? '', customer.id]
        .some(value => value.toLowerCase().includes(query)))
      .map(customer => {
        const customerOrders = orders
          .filter(order => order.customerId === customer.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        return {
          customer,
          member: members.find(member => member.npcNumber === customer.npcNumber),
          orders: customerOrders,
          totalPaid: customerOrders.reduce((total, order) => total + order.amountPaid, 0),
        }
      })
  }, [customers, orders, members, search])

  // Portal accounts are deactivated (login disabled); walk-ins have no login, so their record is blocked.
  const actionLabel = (customer: Customer) => customer.type === 'Portal account'
    ? (customer.status === 'Active' ? 'Deactivate' : 'Reactivate')
    : (customer.status === 'Active' ? 'Block' : 'Unblock')

  const act = (customer: Customer) => {
    const label = actionLabel(customer)
    try {
      const run = { Deactivate: deactivateCustomer, Reactivate: reactivateCustomer, Block: blockCustomer, Unblock: unblockCustomer }[label]
      run(customer.id, reason)
      const done = { Deactivate: 'portal account was deactivated', Reactivate: 'portal account was reactivated', Block: 'record was blocked', Unblock: 'record was unblocked' }[label]
      setMessage({ success: `${customer.name}'s ${done}. The reason is logged.`, error: '' })
      setActingId('')
      setReason('')
    } catch (error) {
      setMessage({ success: '', error: error instanceof Error ? error.message : 'The account could not be updated.' })
    }
  }

  return (
    <ScreenCard style={{ overflowX: 'auto' }}>
      <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600 }}>Customers</h2>
      <p style={{ color: screenColors.muted, fontSize: 12, margin: '3px 0 12px' }}>
        Customer records and order history. Customers update their own details in the Customer Portal; NPC enrollment happens in the Customer Portal or at the Billing System counter.
        For data-privacy requests, a portal account is deactivated (login disabled) and a walk-in customer's record is blocked (not used for new orders or NPC lookups). Records are kept for the retention period.
      </p>
      <p style={{ color: screenColors.muted, fontSize: 12, margin: '0 0 12px', padding: '8px 10px', background: '#F4F3EE', borderRadius: 6 }}>
        Sample data: members start with an opening points balance from purchases before the orders shown here, so every tier can be demonstrated.
        Points = opening balance + 1 point per full ₱1,000 paid on each order. A live system starts every member at 0.
      </p>
      <ScreenFeedback success={message.success} error={message.error} />
      <label htmlFor="customer-search" style={{ display: 'block', color: screenColors.muted, fontSize: 12, marginBottom: 5 }}>Search customers</label>
      <input
        id="customer-search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Name, phone, email, or NPC number"
        style={{ width: '100%', maxWidth: 360, padding: 8, marginBottom: 12, border: `1px solid ${screenColors.border}`, borderRadius: 6, fontSize: 13 }}
      />
      {rows.length === 0
        ? <EmptyState>{customers.length === 0 ? 'No customers have been recorded yet.' : 'No customers match this search.'}</EmptyState>
        : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead><tr style={{ textAlign: 'left', background: '#ECEAE3' }}>
              {['Customer', 'Contact', 'Type', 'NPC membership', 'Orders', 'Total paid', 'Last order', 'Status', 'Actions'].map(label => (
                <th key={label} scope="col" style={{ padding: 10, color: screenColors.muted, fontSize: 11, textTransform: 'uppercase' }}>{label}</th>
              ))}
            </tr></thead>
            <tbody>{rows.map(({ customer, member, orders: customerOrders, totalPaid }) => (
              <Fragment key={customer.id}>
                <tr style={{ borderBottom: `1px solid ${screenColors.border}` }}>
                  <th scope="row" style={{ ...cellStyle, textAlign: 'left', fontSize: 13, fontWeight: 500 }}>
                    {customer.name}
                    <small style={{ display: 'block', color: screenColors.muted, fontWeight: 400, marginTop: 3 }}>{customer.id} · since {customer.registeredAt}</small>
                  </th>
                  <td style={cellStyle}>{customer.contactNumber}<small style={{ display: 'block', color: screenColors.muted }}>{customer.email ?? 'No email'}</small></td>
                  <td style={cellStyle}>{customer.type}</td>
                  <td style={cellStyle}>
                    {member
                      ? <><strong>{member.tier}</strong><small style={{ display: 'block', color: screenColors.muted }}>{member.npcNumber} · {member.points} pts{member.openingPoints > 0 ? ` (${member.openingPoints} opening balance)` : ''}</small></>
                      : <span style={{ color: screenColors.muted }}>Not enrolled</span>}
                  </td>
                  <td style={cellStyle}>{customerOrders.length}</td>
                  <td style={cellStyle}>{formatCurrency(totalPaid)}</td>
                  <td style={cellStyle}>{customerOrders[0]?.createdAt.slice(0, 10) ?? '—'}</td>
                  <td style={{ ...cellStyle, color: customer.status === 'Active' ? '#276749' : screenColors.error, fontWeight: 600 }}>{customer.status}</td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <ScreenButton allowReadOnly variant="secondary" onClick={() => setExpandedId(current => current === customer.id ? '' : customer.id)}>
                        {expandedId === customer.id ? 'Hide history' : 'View history'}
                      </ScreenButton>
                      {actingId !== customer.id && (
                        <ScreenButton
                          variant={customer.status === 'Active' ? 'danger' : 'secondary'}
                          onClick={() => { setActingId(customer.id); setReason(''); setMessage({ success: '', error: '' }) }}
                        >{actionLabel(customer)}</ScreenButton>
                      )}
                    </div>
                    {actingId === customer.id && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                        <input
                          aria-label={`Reason to ${actionLabel(customer).toLowerCase()} ${customer.name}`}
                          placeholder={customer.status === 'Active' ? 'Reason, e.g. customer request' : 'Reason'}
                          value={reason}
                          onChange={event => setReason(event.target.value)}
                          style={smallField}
                        />
                        <ScreenButton variant={customer.status === 'Active' ? 'danger' : 'primary'} onClick={() => act(customer)}>Confirm {actionLabel(customer).toLowerCase()}</ScreenButton>
                        <ScreenButton variant="secondary" onClick={() => setActingId('')}>Cancel</ScreenButton>
                      </div>
                    )}
                  </td>
                </tr>
                {expandedId === customer.id && (
                  <tr style={{ background: '#F4F3EE', borderBottom: `1px solid ${screenColors.border}` }}>
                    <td colSpan={9} style={{ padding: '10px 14px' }}>
                      {customerOrders.length === 0
                        ? <p style={{ color: screenColors.muted, fontSize: 12 }}>No orders yet.</p>
                        : customerOrders.map(order => (
                            <p key={order.id} style={{ color: screenColors.foreground, fontSize: 12, padding: '4px 0' }}>
                              {order.createdAt.slice(0, 10)} · <strong>{order.id}</strong> · {order.product} × {order.pieces} · {formatCurrency(order.salePrice)} (paid {formatCurrency(order.amountPaid)}) · {orderStatus(order)}
                            </p>
                          ))}
                      {customer.accountLog.map(entry => (
                        <p key={entry.at} style={{ color: screenColors.muted, fontSize: 12, padding: '4px 0' }}>
                          Account {entry.action.toLowerCase()} {entry.at.slice(0, 10)}: {entry.reason}
                        </p>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}</tbody>
          </table>
        )}
    </ScreenCard>
  )
}
