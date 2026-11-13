import { describe, expect, it } from 'vitest'
import { seedData } from '../data/seed'
import { generateNotifications } from './notifications'

describe('notification rules', () => {
  const source = {
    materials: seedData.materials,
    inventoryMovements: seedData.inventoryMovements,
    designSubmissions: seedData.designSubmissions,
    orders: seedData.orders,
    employees: seedData.employees,
    assignmentEvents: [],
  }

  it('generates Admin and Manager notifications for low stock, review, overdue orders, and pending employees', () => {
    const adminNotifications = generateNotifications({
      ...source,
      viewAs: 'Admin',
      employees: [
        ...source.employees,
        { id: 'EMP-PENDING', name: 'Pending Person', role: 'Production Staff', team: 'Team A', schedule: ['Monday'], status: 'Pending' },
      ],
    })
    const managerNotifications = generateNotifications({
      ...source,
      viewAs: 'Manager',
      employees: [
        ...source.employees,
        { id: 'EMP-PENDING', name: 'Pending Person', role: 'Production Staff', team: 'Team A', schedule: ['Monday'], status: 'Pending' },
      ],
    })
    expect(adminNotifications.map(item => item.category)).toEqual([
      'low-stock',
      'low-stock',
      'design-review',
      'design-review',
      'overdue-order',
      'pending-employee',
    ])
    expect(managerNotifications).toEqual(adminNotifications)
    expect(adminNotifications.find(item => item.id === 'overdue-order:NPS-20261106-004')?.message)
      .toContain('Heat Press')
  })

  it('generates employee assignment and assigned-order deadline notifications using the demo date', () => {
    const notifications = generateNotifications({
      ...source,
      viewAs: 'employee:EMP-001',
      assignmentEvents: [{
        id: 'ASSIGN-NPS-20261106-002-1',
        orderId: 'NPS-20261106-002',
        teamId: 'Team A',
        scheduleStart: '2026-11-09T08:00',
        at: '2026-11-06T00:00:00.000Z',
      }],
      orders: source.orders.map(order => order.id === 'NPS-20261106-002'
        ? { ...order, teamId: 'Team A', scheduleStart: '2026-11-09T08:00' }
        : order),
    })
    expect(notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'assignment',
        message: expect.stringContaining('Team A, scheduled for 2026-11-09T08:00'),
      }),
      expect.objectContaining({
        category: 'deadline',
        message: expect.stringContaining('due 2026-11-12; stage: Cutting'),
      }),
    ]))
    expect(notifications.some(item => item.category === 'low-stock')).toBe(false)
  })

  it('returns no notifications for an employee with no assignments or deadlines', () => {
    const notifications = generateNotifications({
      ...source,
      viewAs: 'employee:EMP-001',
      orders: [],
      assignmentEvents: [],
    })
    expect(notifications).toEqual([])
  })

  it('rejects invalid employee views and malformed reference dates', () => {
    expect(() => generateNotifications({ ...source, viewAs: 'employee:missing' })).toThrow(/not found/)
    expect(() => generateNotifications({ ...source, viewAs: 'Admin' }, 'not-a-date')).toThrow(/YYYY-MM-DD/)
  })
})
