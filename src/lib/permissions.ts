import type { PermissionKey, Role } from '../types'

export interface PermissionDefinition {
  key: PermissionKey
  label: string
  group: 'Screen access' | 'Actions'
}

export const permissionCatalog: readonly PermissionDefinition[] = [
  { key: 'screen.dashboard', label: 'Dashboard', group: 'Screen access' },
  { key: 'screen.inventory', label: 'Inventory', group: 'Screen access' },
  { key: 'screen.recommendations', label: 'Recommendations', group: 'Screen access' },
  { key: 'screen.reports', label: 'Reports & Analytics', group: 'Screen access' },
  { key: 'screen.employees', label: 'Employees', group: 'Screen access' },
  { key: 'screen.cost', label: 'Cost & Profit', group: 'Screen access' },
  { key: 'screen.commission', label: 'Commission', group: 'Screen access' },
  { key: 'screen.membership', label: 'Membership', group: 'Screen access' },
  { key: 'screen.design', label: 'Design Review', group: 'Screen access' },
  { key: 'screen.pricing', label: 'Pricing Rules', group: 'Screen access' },
  { key: 'action.recommendations', label: 'Approve/reject recommendations', group: 'Actions' },
  { key: 'action.design', label: 'Approve/revise designs', group: 'Actions' },
  { key: 'action.pricing', label: 'Edit pricing rules', group: 'Actions' },
  { key: 'action.employees', label: 'Create/activate employees', group: 'Actions' },
  { key: 'action.commission', label: 'Mark commission as paid', group: 'Actions' },
  { key: 'action.member-tier', label: 'Correct member tier', group: 'Actions' },
  { key: 'action.role-permissions', label: 'Manage roles & permissions', group: 'Actions' },
]

export type RolePermissions = Record<Role, PermissionKey[]>

export function getDefaultRolePermissions(): RolePermissions {
  const allScreens = permissionCatalog
    .filter(permission => permission.group === 'Screen access')
    .map(permission => permission.key)
  const allPermissions = permissionCatalog.map(permission => permission.key)

  return {
    Admin: [...allPermissions],
    Manager: [
      ...allScreens,
      'action.recommendations',
      'action.design',
    ],
    'Sales Person': [],
    'Production Staff': [],
  }
}
