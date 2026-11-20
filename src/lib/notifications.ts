import { DEMO_TODAY } from '../config'
import { isLowStock } from './admin'
import { accessFor } from './userAccess'
import type {
  AdminOrder,
  DesignSubmission,
  Employee,
  InventoryMovement,
  Material,
  ModuleId,
  OrderAssignmentEvent,
  Recommendation,
  ViewAs,
} from '../types'

export type NotificationCategory =
  | 'low-stock'
  | 'design-review'
  | 'overdue-order'
  | 'pending-employee'
  | 'assignment'
  | 'deadline'
  | 'pricing-alert'

export interface AdminNotification {
  id: string
  category: NotificationCategory
  title: string
  message: string
}

export interface NotificationSource {
  viewAs: ViewAs
  materials: readonly Material[]
  inventoryMovements: readonly InventoryMovement[]
  designSubmissions: readonly DesignSubmission[]
  orders: readonly AdminOrder[]
  employees: readonly Employee[]
  assignmentEvents: readonly OrderAssignmentEvent[]
  recommendations: readonly Recommendation[]
}

export function generateNotifications(
  source: NotificationSource,
  today = DEMO_TODAY,
): AdminNotification[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new RangeError('Notification reference date must use YYYY-MM-DD.')
  }

  if (source.viewAs !== 'Admin') {
    const employeeId = source.viewAs.slice('employee:'.length)
    if (!source.employees.some(item => item.id === employeeId)) {
      throw new Error(`Employee view "${employeeId}" was not found.`)
    }
  }
  // Each viewer gets the alerts for the modules they can open (REQ-4.13-08); the Admin gets all.
  const canSee = (moduleId: ModuleId) =>
    accessFor(source.viewAs, source.employees, moduleId) !== 'none'

  // Only received stock clears the alert.
  const notifications: AdminNotification[] = !canSee('inventory') ? [] : source.materials
    .filter(isLowStock)
    .map(material => ({
      id: `low-stock:${material.id}`,
      category: 'low-stock',
      title: 'Low stock',
      message: `${material.name} is at or below its reorder point (${material.stock} ${material.unit} remaining).${(() => {
        const alert = source.recommendations.find(item =>
          item.kind === 'Reorder' && item.status === 'Pending' && item.materialId === material.id)
        return alert?.reorderQty ? ` Suggested reorder: ${alert.reorderQty} ${material.unit}.` : ''
      })()}`,
    }))

  notifications.push(
    ...source.designSubmissions
      .filter(design => canSee('design-review') && design.status === 'Under Review')
      .map(design => ({
        id: `design-review:${design.id}`,
        category: 'design-review' as const,
        title: 'Design awaiting review',
        message: `${design.customer}'s design for ${design.orderRef} is under review.`,
      })),
    // Overdue orders go to whoever assigns production teams (User Management → Order Assignment).
    ...source.orders
      .filter(order => canSee('user-management') && !order.claimed && order.deadline < today)
      .map(order => ({
        id: `overdue-order:${order.id}`,
        category: 'overdue-order' as const,
        title: 'Overdue order',
        message: `${order.id} for ${order.customer} was due ${order.deadline}${order.stage ? `; current stage: ${order.stage}` : ''}.`,
      })),
    ...source.recommendations
      .filter(item => canSee('business-recommendations') && item.kind === 'Pricing' && item.status === 'Pending')
      .map(item => ({
        id: `pricing-alert:${item.id}`,
        category: 'pricing-alert' as const,
        title: `Pricing alert: ${item.subject}`,
        message: `${item.basis} Suggestion: ${item.suggestion} Prices change only if you edit Pricing Rules.`,
      })),
    ...source.employees
      .filter(employee => canSee('user-management') && employee.status === 'Pending')
      .map(employee => ({
        id: `pending-employee:${employee.id}`,
        category: 'pending-employee' as const,
        title: 'Employee pending activation',
        message: `${employee.name} is waiting for activation.`,
      })),
  )
  if (source.viewAs === 'Admin') {
    return notifications
  }
  const employee = source.employees.find(item => item.id === source.viewAs.slice('employee:'.length))!
  return [...notifications, ...employeeNotifications(source, employee, today)]
}

/** An employee's own team assignments and the deadlines of orders assigned to them. */
function employeeNotifications(source: NotificationSource, employee: Employee, today: string): AdminNotification[] {
  const notifications: AdminNotification[] = source.assignmentEvents
    .filter(event => event.teamId === employee.team)
    .map(event => {
      const order = source.orders.find(item => item.id === event.orderId)
      return {
        id: `assignment:${employee.id}:${event.id}`,
        category: 'assignment' as const,
        title: 'New team assignment',
        message: `${order ? `${order.id} assigned to ` : ''}${event.teamId}${order ? `, due ${order.deadline}` : ''}.`,
      }
    })

  const assignedOrders = source.orders.filter(order =>
    !order.claimed &&
    (order.salesPersonId === employee.id || Boolean(employee.team && order.teamId === employee.team)) &&
    Boolean(order.deadline),
  )
  notifications.push(...assignedOrders.map(order => ({
    id: `deadline:${employee.id}:${order.id}:${order.deadline}`,
    category: 'deadline' as const,
    title: order.deadline < today ? 'Assigned order overdue' : 'Assigned order deadline',
    message: `${order.id} for ${order.customer} is due ${order.deadline}${order.stage ? `; stage: ${order.stage}` : ''}${order.deadline < today ? ' (Overdue)' : ''}.`,
  })))
  return notifications
}
