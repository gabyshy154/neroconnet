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
    recommendations: seedData.recommendations,
  }

  it('gives the Admin every alert and each employee only the alerts for modules they can open', () => {
    const adminNotifications = generateNotifications({
      ...source,
      viewAs: 'Admin',
      employees: [
        ...source.employees,
        { id: 'EMP-PENDING', name: 'Pending Person', jobTitle: 'Production Staff', team: 'Team A', schedule: ['Monday'], status: 'Pending' as const },
      ],
    })
    // Nina Cruz, job title "Manager": Inventory, Recommendations, and Design Review, but no User Management.
    const managerNotifications = generateNotifications({
      ...source,
      viewAs: 'employee:EMP-005',
      employees: [
        ...source.employees,
        { id: 'EMP-PENDING', name: 'Pending Person', jobTitle: 'Production Staff', team: 'Team A', schedule: ['Monday'], status: 'Pending' as const },
      ],
    })
    expect(adminNotifications.map(item => item.category)).toEqual([
      'low-stock',
      'low-stock',
      'design-review',
      'design-review',
      'overdue-order',
      'pricing-alert',
      'pending-employee',
    ])
    expect(adminNotifications.find(item => item.category === 'pricing-alert')?.title).toBe('Pricing alert: Custom T-Shirt')
    expect(adminNotifications.find(item => item.id === 'low-stock:jersey-fabric-white')?.message).toContain('Suggested reorder: 17 pcs.')
    expect(managerNotifications.map(item => item.category)).toEqual([
      'low-stock',
      'low-stock',
      'design-review',
      'design-review',
      'pricing-alert',
    ])
    expect(adminNotifications.find(item => item.id === 'overdue-order:NPS-20261101-001')?.message)
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
        at: '2026-11-06T00:00:00.000Z',
      }],
      orders: source.orders.map(order => order.id === 'NPS-20261106-002'
        ? { ...order, teamId: 'Team A' }
        : order),
    })
    expect(notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'assignment',
        message: expect.stringContaining('NPS-20261106-002 assigned to Team A, due 2026-11-12'),
      }),
      expect.objectContaining({
        category: 'deadline',
        message: expect.stringContaining('due 2026-11-12; stage: Cutting'),
      }),
    ]))
    // Production staff have View only access to Inventory by default, so they see low-stock alerts,
    // but not alerts for modules they cannot open.
    expect(notifications.some(item => item.category === 'low-stock')).toBe(true)
    expect(notifications.some(item => ['design-review', 'pricing-alert', 'pending-employee', 'overdue-order'].includes(item.category))).toBe(false)
  })

  it('returns no notifications for an employee with no module alerts, assignments, or deadlines', () => {
    // Rina Flores is tagged Sales: no Inventory, Design Review, Recommendations, or User Management access.
    const notifications = generateNotifications({
      ...source,
      viewAs: 'employee:staff-001',
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
