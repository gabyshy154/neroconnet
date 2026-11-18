// sample values, to be confirmed
export const QUOTATION_VALIDITY_DAYS = 7

export const VOLUME_DISCOUNTS = [
  { minPieces: 25, rate: 0.05 },
  { minPieces: 50, rate: 0.10 },
]

export const RUSH_SURCHARGE = 0.15

export const CREDIT_TERM_CHARGES = {
  15: 0.20,
  30: 0.30,
}

export const MEMBERSHIP_DISCOUNTS = {
  Bronze: 0.03,
  Silver: 0.05,
  Gold: 0.08,
  Platinum: 0.10,
}

export const NPC_VALIDITY_MONTHS = 12 // sample value, to be confirmed

export const NPC_MEMBERSHIP = {
  number: 'NPC-000101',
  tier: 'Silver',
  enrollmentDate: '2026-03-01',
} as const

export function generateOrderReference(issueDate: Date, sequence = 2) {
  const date = `${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, '0')}${String(issueDate.getDate()).padStart(2, '0')}`
  return `NPS-${date}-${String(sequence).padStart(3, '0')}`
}

export function generateNpcNumber(existingNumber = 'NPC-000101') {
  let sequence = 102
  let candidate = `NPC-${String(sequence).padStart(6, '0')}`
  while (candidate === existingNumber) {
    sequence += 1
    candidate = `NPC-${String(sequence).padStart(6, '0')}`
  }
  return candidate
}
