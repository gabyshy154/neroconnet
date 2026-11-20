import type {
  AccessLevel,
  AccountRole,
  Employee,
  ModuleId,
  ModulePermissions,
  UserAccount,
  UserTag,
  ViewAs,
} from '../types'

export const MODULES: readonly { id: ModuleId; label: string }[] = [
  { id: 'order-entry', label: 'Order Entry / Billing System' },
  { id: 'quotation-billing', label: 'Quotation & Billing' },
  { id: 'payment-recording', label: 'Payment Recording' },
  { id: 'npc-membership', label: 'NPC Membership' },
  { id: 'pricing-rules', label: 'Pricing Rules' },
  { id: 'order-lifecycle', label: 'Order Lifecycle Tracking' },
  { id: 'design-review', label: 'Design Review' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'user-management', label: 'User Management' },
  { id: 'sales-commission', label: 'Sales Commission' },
  { id: 'reports-analytics', label: 'Reports & Analytics' },
  { id: 'business-recommendations', label: 'Business Recommendations' },
]

export const ACCESS_LEVELS: readonly { value: AccessLevel; label: string }[] = [
  { value: 'none', label: 'No access' },
  { value: 'view', label: 'View only' },
  { value: 'edit', label: 'View and edit' },
]

export const ACCOUNT_ROLES: readonly AccountRole[] = ['Employee', 'Admin']
export const USER_TAGS: readonly UserTag[] = ['Sales', 'Production']
export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function fill(level: AccessLevel): ModulePermissions {
  return Object.fromEntries(MODULES.map(module => [module.id, level])) as ModulePermissions
}

const TAG_DEFAULTS: Record<UserTag, Partial<ModulePermissions>> = {
  Sales: {
    'order-entry': 'edit',
    'quotation-billing': 'edit',
    'payment-recording': 'edit',
    'npc-membership': 'view',
    'pricing-rules': 'view',
    'order-lifecycle': 'view',
    'sales-commission': 'view',
  },
  Production: {
    'order-lifecycle': 'edit',
    inventory: 'view',
  },
}

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2 }

/** Default module permissions for a role, widened by each tag. Admin is always full access. */
export function defaultPermissions(role: AccountRole, tags: readonly UserTag[] = []): ModulePermissions {
  if (role === 'Admin') {
    return fill('edit')
  }
  const permissions = fill('none')
  permissions['order-lifecycle'] = 'view'
  for (const tag of tags) {
    for (const [moduleId, level] of Object.entries(TAG_DEFAULTS[tag]) as [ModuleId, AccessLevel][]) {
      if (RANK[level] > RANK[permissions[moduleId]]) {
        permissions[moduleId] = level
      }
    }
  }
  return permissions
}

/** Admin accounts can never be restricted, whatever was stored. */
export function effectivePermissions(account: Pick<UserAccount, 'accountRole' | 'permissions'>): ModulePermissions {
  if (account.accountRole === 'Admin') {
    return fill('edit')
  }
  return { ...fill('none'), ...account.permissions }
}

const LEGACY_FALLBACK_UPDATED_AT = '2026-11-01T08:00:00.000Z'

/** Returns the employee's account, deriving one for records saved before accounts existed. */
export function resolveAccount(employee: Employee): UserAccount {
  if (employee.account) {
    return { ...employee.account, permissions: effectivePermissions(employee.account) }
  }
  const accountRole: AccountRole = 'Employee'
  const tags: UserTag[] = []
  return {
    email: '',
    contactNumber: '',
    credential: 'Invite',
    accountRole,
    tags,
    permissions: defaultPermissions(accountRole, tags),
    updatedAt: LEGACY_FALLBACK_UPDATED_AT,
  }
}

/** Shown wherever staff are listed: the free-text job title, or a label from the role and tags. */
export function displayTitle(employee: Employee): string {
  if (employee.jobTitle?.trim()) return employee.jobTitle.trim()
  const account = resolveAccount(employee)
  if (account.accountRole === 'Admin') return 'Admin'
  return account.tags.length ? `${account.tags.join(' & ')} staff` : 'Employee'
}

/** Sales Persons are staff tagged Sales; they earn commission (BR-10). */
export function isSalesPerson(employee: Employee): boolean {
  return resolveAccount(employee).tags.includes('Sales')
}

/**
 * The access the current viewer has to a module (REQ-4.13-08): the Admin always has View and
 * edit; an employee has what their account grants, and nothing while not Active.
 */
export function accessFor(viewAs: ViewAs, employees: readonly Employee[], moduleId: ModuleId): AccessLevel {
  if (viewAs === 'Admin') return 'edit'
  const employee = employees.find(item => item.id === viewAs.slice('employee:'.length))
  if (!employee || employee.status !== 'Active') return 'none'
  return effectivePermissions(resolveAccount(employee))[moduleId]
}

export interface UserInput {
  name: string
  /** Free text; optional. */
  jobTitle: string
  email: string
  contactNumber: string
  credential: 'Invite' | 'Password'
  /** Only checked on create, and when changed on edit. Never stored. */
  password: string
  accountRole: AccountRole
  tags: UserTag[]
  schedule: string[]
  team: string
  permissions: ModulePermissions
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_PATTERN = /^\+?[0-9][0-9\s-]{6,15}$/

export function validateUserInput(
  input: UserInput,
  employees: readonly Employee[],
  editingId?: string,
): string[] {
  const errors: string[] = []
  const others = employees.filter(employee => employee.id !== editingId)
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!name) {
    errors.push('Full name is required.')
  } else if (others.some(employee => employee.name.trim().toLowerCase() === name.toLowerCase())) {
    errors.push('Full name must be unique.')
  }
  if (input.jobTitle.trim().length > 40) {
    errors.push('Job title must be 40 characters or fewer.')
  }
  if (!email) {
    errors.push('Email is required.')
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push('Enter a valid email address.')
  } else if (others.some(employee => resolveAccount(employee).email.toLowerCase() === email)) {
    errors.push('Email is already used by another user.')
  }
  if (!input.contactNumber.trim()) {
    errors.push('Contact number is required.')
  } else if (!CONTACT_PATTERN.test(input.contactNumber.trim())) {
    errors.push('Enter a valid contact number (digits, spaces, or dashes).')
  }
  // On edit, a blank password keeps the current one, unless the account is switching from invite to password.
  const editing = editingId ? employees.find(employee => employee.id === editingId) : undefined
  const hadPassword = editing ? resolveAccount(editing).credential === 'Password' : false
  const needsPassword = input.credential === 'Password' && (!hadPassword || input.password.length > 0)
  if (needsPassword && input.password.length < 8) {
    errors.push('Password must be at least 8 characters.')
  }
  if (!ACCOUNT_ROLES.includes(input.accountRole)) {
    errors.push('Select a valid role.')
  }
  if (input.tags.some(tag => !USER_TAGS.includes(tag))) {
    errors.push('Tags must be Sales or Production.')
  }
  if (input.schedule.length === 0) {
    errors.push('Select at least one work schedule day.')
  } else if (input.schedule.some(day => !WEEK_DAYS.includes(day)) || new Set(input.schedule).size !== input.schedule.length) {
    errors.push('Work schedule must contain unique, valid days of the week.')
  }
  if (input.tags.includes('Production') && !input.team.trim()) {
    errors.push('Production team is required for users tagged Production.')
  }
  for (const module of MODULES) {
    if (!ACCESS_LEVELS.some(level => level.value === input.permissions[module.id])) {
      errors.push(`Choose an access level for ${module.label}.`)
    }
  }
  return errors
}

/** Builds the stored Employee record. The password itself is never kept. */
export function buildUserRecord(
  id: string,
  input: UserInput,
  at: string,
  previous?: Employee,
): Employee {
  const tags = USER_TAGS.filter(tag => input.tags.includes(tag))
  return {
    id,
    name: input.name.trim(),
    ...(input.jobTitle.trim() ? { jobTitle: input.jobTitle.trim() } : {}),
    team: input.team.trim() || undefined,
    schedule: WEEK_DAYS.filter(day => input.schedule.includes(day)),
    status: previous?.status ?? 'Pending',
    account: {
      email: input.email.trim().toLowerCase(),
      contactNumber: input.contactNumber.trim(),
      credential: input.credential,
      accountRole: input.accountRole,
      tags,
      permissions: input.accountRole === 'Admin' ? fill('edit') : { ...input.permissions },
      updatedAt: at,
    },
  }
}

export function userInputFromEmployee(employee: Employee): UserInput {
  const account = resolveAccount(employee)
  return {
    name: employee.name,
    jobTitle: employee.jobTitle ?? '',
    email: account.email,
    contactNumber: account.contactNumber,
    credential: account.credential,
    password: '',
    accountRole: account.accountRole,
    tags: [...account.tags],
    schedule: [...employee.schedule],
    team: employee.team ?? '',
    permissions: { ...account.permissions },
  }
}

export function emptyUserInput(): UserInput {
  return {
    name: '',
    jobTitle: '',
    email: '',
    contactNumber: '',
    credential: 'Invite',
    password: '',
    accountRole: 'Employee',
    tags: [],
    schedule: [],
    team: '',
    permissions: defaultPermissions('Employee', []),
  }
}

export function isActiveAdmin(employee: Employee): boolean {
  return employee.status === 'Active' && resolveAccount(employee).accountRole === 'Admin'
}
