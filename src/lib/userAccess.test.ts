import { describe, expect, it } from 'vitest'
import type { Employee } from '../types'
import {
  MODULES,
  buildUserRecord,
  defaultPermissions,
  accessFor,
  displayTitle,
  isSalesPerson,
  effectivePermissions,
  emptyUserInput,
  resolveAccount,
  userInputFromEmployee,
  validateUserInput,
  type UserInput,
} from './userAccess'

const validInput: UserInput = {
  ...emptyUserInput(),
  name: 'Alex Example',
  email: 'Alex@Example.com',
  contactNumber: '0917 555 0199',
  tags: ['Sales'],
  schedule: ['Wednesday', 'Monday'],
  permissions: defaultPermissions('Employee', ['Sales']),
}

describe('default permissions', () => {
  it('covers all 12 modules with Admin at View and edit everywhere', () => {
    expect(MODULES).toHaveLength(12)
    expect(Object.values(defaultPermissions('Admin'))).toEqual(Array(12).fill('edit'))
  })

  it('widens Employee defaults by tag', () => {
    const base = defaultPermissions('Employee')
    expect(base['order-entry']).toBe('none')
    expect(base['order-lifecycle']).toBe('view')
    const sales = defaultPermissions('Employee', ['Sales'])
    expect(sales['payment-recording']).toBe('edit')
    expect(sales['user-management']).toBe('none')
    const both = defaultPermissions('Employee', ['Sales', 'Production'])
    expect(both['order-lifecycle']).toBe('edit')
    expect(both.inventory).toBe('view')
  })

  it('never restricts an Admin, even with stored restrictions', () => {
    const restricted = { ...defaultPermissions('Admin'), inventory: 'none' as const }
    expect(effectivePermissions({ accountRole: 'Admin', permissions: restricted }).inventory).toBe('edit')
  })
})

describe('job titles and access', () => {
  const sales = buildUserRecord('EMP-1', validInput, 'now')
  const manager = {
    ...buildUserRecord('EMP-2', { ...validInput, name: 'Mae', email: 'mae@x.com', jobTitle: 'Manager', tags: [] }, 'now'),
    status: 'Active' as const,
  }

  it('shows the free-text job title, or a label from the role and tags', () => {
    expect(displayTitle(manager)).toBe('Manager')
    expect(displayTitle(sales)).toBe('Sales staff')
    const legacy: Employee = { id: 'X', name: 'Old', schedule: ['Monday'], status: 'Active' }
    expect(resolveAccount(legacy)).toMatchObject({ accountRole: 'Employee', tags: [] })
    expect(displayTitle(legacy)).toBe('Employee')
  })

  it('finds Sales Persons by the Sales tag, never by the title', () => {
    expect(isSalesPerson(sales)).toBe(true)
    expect(isSalesPerson({ ...manager, jobTitle: 'Sales Manager' })).toBe(false)
  })

  it('gives the Admin full access and an employee only what their account grants while Active', () => {
    const employees = [{ ...sales, status: 'Active' as const }, manager]
    expect(accessFor('Admin', employees, 'user-management')).toBe('edit')
    expect(accessFor('employee:EMP-1', employees, 'payment-recording')).toBe('edit')
    expect(accessFor('employee:EMP-1', employees, 'inventory')).toBe('none')
    expect(accessFor('employee:EMP-1', [{ ...sales, status: 'Pending' }], 'payment-recording')).toBe('none')
    expect(accessFor('employee:missing', employees, 'inventory')).toBe('none')
  })

  it('rejects job titles over 40 characters', () => {
    expect(validateUserInput({ ...validInput, jobTitle: 'x'.repeat(41) }, [])).toContain('Job title must be 40 characters or fewer.')
  })
})

describe('user validation', () => {
  it('accepts a valid invite-based user', () => {
    expect(validateUserInput(validInput, [])).toEqual([])
  })

  it('reports missing and invalid fields', () => {
    const errors = validateUserInput({
      ...emptyUserInput(),
      email: 'nope',
      contactNumber: 'abc',
      credential: 'Password',
      password: 'short',
      tags: ['Production'],
    }, [])
    expect(errors).toEqual(expect.arrayContaining([
      'Full name is required.',
      'Enter a valid email address.',
      'Enter a valid contact number (digits, spaces, or dashes).',
      'Password must be at least 8 characters.',
      'Select at least one work schedule day.',
      'Production team is required for users tagged Production.',
    ]))
  })

  it('checks unique name and email, excluding the user being edited', () => {
    const existing = buildUserRecord('EMP-1', validInput, '2026-11-06T00:00:00.000Z')
    expect(validateUserInput(validInput, [existing])).toEqual(
      expect.arrayContaining(['Full name must be unique.', 'Email is already used by another user.']),
    )
    expect(validateUserInput(userInputFromEmployee(existing), [existing], 'EMP-1')).toEqual([])
  })

  it('keeps an existing password when the edit leaves it blank', () => {
    const existing = buildUserRecord('EMP-1', { ...validInput, credential: 'Password', password: 'longenough' }, 'now')
    expect(validateUserInput(userInputFromEmployee(existing), [existing], 'EMP-1')).toEqual([])
  })
})

describe('building user records', () => {
  it('normalizes input, keeps the job title, and never stores the password', () => {
    const record = buildUserRecord('EMP-9', { ...validInput, jobTitle: '  Cashier ', credential: 'Password', password: 'secret-pass' }, '2026-11-06T00:00:00.000Z')
    expect(record).toMatchObject({ id: 'EMP-9', jobTitle: 'Cashier', status: 'Pending', schedule: ['Monday', 'Wednesday'] })
    expect(record.account?.email).toBe('alex@example.com')
    expect(JSON.stringify(record)).not.toContain('secret-pass')
  })

  it('stores full access for Admin regardless of submitted grid', () => {
    const record = buildUserRecord('EMP-9', {
      ...validInput,
      accountRole: 'Admin',
      permissions: { ...validInput.permissions, inventory: 'none' },
    }, 'now')
    expect(record.account?.accountRole).toBe('Admin')
    expect(Object.values(record.account!.permissions)).toEqual(Array(12).fill('edit'))
  })
})
