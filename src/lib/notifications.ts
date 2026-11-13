import { DEMO_TODAY } from '../config'
import { includePendingPurchases, isLowStock } from './admin'
import type {
  AdminOrder,
  DesignSubmission,
  Employee,
  InventoryMovement,
  Material,
  OrderAssignmentEvent,
  ViewAs,
} from '../types'

export type NotificationCategory =
  | 'low-stock'
  | 'design-review'
  | 'overdue-order'
  | 'pending-employee'
  | 'assignment'
  | 'deadline'

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
}

export function generateNotifications(
  source: NotificationSource,
  today = DEMO_TODAY,
): AdminNotification[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new RangeError('Notification reference date must use YYYY-MM-DD.')
  }

  if (source.viewAs === 'Admin' || source.viewAs === 'Manager') {
    const notifications: AdminNotification[] = includePendingPurchases(
      source.materials,
      source.inventoryMovements,
    )
      .filter(isLowStock)
      .map(material => ({
        id: `low-stock:${material.id}`,
        category: 'low-stock',
        title: 'Low stock',
        message: `${material.name} is at or below its reorder point (${material.stock} ${material.unit} remaining).`,
      }))

    notifications.push(
      ...source.designSubmissions
        .filter(design => design.status === 'Under Review')
        .map(design => ({
          id: `design-review:${design.id}`,
          category: 'design-review' as const,
          title: 'Design awaiting review',
          message: `${design.customer}'s design for ${design.orderRef} is under review.`,
        })),
      ...source.orders
        .filter(order => !order.claimed && order.deadline < today)
        .map(order => ({
          id: `overdue-order:${order.id}`,
          category: 'overdue-order' as const,
          title: 'Overdue order',
          message: `${order.id} for ${order.customer} was due ${order.deadline}${order.stage ? `; current stage: ${order.stage}` : ''}.`,
        })),
      ...source.employees
        .filter(employee => employee.status === 'Pending')
        .map(employee => ({
          id: `pending-employee:${employee.id}`,
          category: 'pending-employee' as const,
          title: 'Employee pending activation',
          message: `${employee.name} is waiting for activation.`,
        })),
    )
    return notifications
  }

  const employeeId = source.viewAs.slice('employee:'.length)
  const employee = source.employees.find(item => item.id === employeeId)
  if (!employee) {
    throw new Error(`Employee view "${employeeId}" was not found.`)
  }

  const notifications: AdminNotification[] = source.assignmentEvents
    .filter(event => event.teamId === employee.team)
    .map(event => {
      const order = source.orders.find(item => item.id === event.orderId)
      return {
        id: `assignment:${employee.id}:${event.id}`,
        category: 'assignment' as const,
        title: 'New team and schedule assignment',
        message: `${order ? `${order.id} · ` : ''}${event.teamId}, scheduled for ${event.scheduleStart}.`,
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
