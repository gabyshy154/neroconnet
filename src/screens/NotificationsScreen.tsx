import { useMemo, useState } from 'react'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { generateNotifications } from '../lib/notifications'
import { useAdminStore } from '../store/adminStore'

const categoryLabels = {
  'low-stock': 'Inventory',
  'design-review': 'Design Review',
  'overdue-order': 'Order',
  'pending-employee': 'Employee',
  assignment: 'Assignment',
  deadline: 'Deadline',
} as const

export default function NotificationsScreen() {
  const viewAs = useAdminStore(state => state.viewAs)
  const materials = useAdminStore(state => state.materials)
  const inventoryMovements = useAdminStore(state => state.inventoryMovements)
  const designSubmissions = useAdminStore(state => state.designSubmissions)
  const orders = useAdminStore(state => state.orders)
  const employees = useAdminStore(state => state.employees)
  const assignmentEvents = useAdminStore(state => state.assignmentEvents)
  const readNotificationIds = useAdminStore(state => state.readNotificationIds)
  const markNotificationRead = useAdminStore(state => state.markNotificationRead)
  const markAllNotificationsRead = useAdminStore(state => state.markAllNotificationsRead)
  const [success, setSuccess] = useState('Notifications are generated from current store data.')
  const [error, setError] = useState('')
  const notifications = useMemo(() => generateNotifications({
    viewAs,
    materials,
    inventoryMovements,
    designSubmissions,
    orders,
    employees,
    assignmentEvents,
  }), [viewAs, materials, inventoryMovements, designSubmissions, orders, employees, assignmentEvents])
  const unreadNotifications = notifications.filter(item => !readNotificationIds.includes(item.id))

  const markRead = (id: string) => {
    setError('')
    try {
      markNotificationRead(id)
      setSuccess('Notification marked as read.')
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Notification could not be updated.')
    }
  }

  const markAllRead = () => {
    setError('')
    try {
      markAllNotificationsRead(unreadNotifications.map(item => item.id))
      setSuccess('All current notifications are marked as read.')
    } catch (reason) {
      setSuccess('')
      setError(reason instanceof Error ? reason.message : 'Notifications could not be updated.')
    }
  }

  return (
    <div>
      <ScreenTitle title="Notifications" subtitle="Rule-based updates derived from the current store data." />
      <ScreenFeedback success={success} error={error} />
      <ScreenCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600 }}>Current notifications ({notifications.length})</h2>
          {unreadNotifications.length > 0 && <ScreenButton onClick={markAllRead}>Mark all as read</ScreenButton>}
        </div>
        {notifications.length === 0
          ? <EmptyState>You're all caught up. There are no notifications for this view.</EmptyState>
          : <div style={{ display: 'grid', gap: 8 }}>
              {notifications.map(notification => {
                const isRead = readNotificationIds.includes(notification.id)
                return (
                  <article key={notification.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: 12,
                    border: `1px solid ${screenColors.border}`,
                    borderLeft: `4px solid ${isRead ? screenColors.border : screenColors.accent}`,
                    borderRadius: 6,
                    background: isRead ? screenColors.background : screenColors.card,
                  }}>
                    <div>
                      <p style={{ color: screenColors.muted, fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>{categoryLabels[notification.category]}{isRead ? ' · Read' : ' · Unread'}</p>
                      <h3 style={{ color: screenColors.foreground, fontSize: 13, fontWeight: 600 }}>{notification.title}</h3>
                      <p style={{ color: screenColors.muted, fontSize: 12, marginTop: 4 }}>{notification.message}</p>
                    </div>
                    {!isRead && <ScreenButton variant="secondary" onClick={() => markRead(notification.id)}>Mark as read</ScreenButton>}
                  </article>
                )
              })}
            </div>}
      </ScreenCard>
    </div>
  )
}
