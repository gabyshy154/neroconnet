import { commissionPerPiece, otherExpensesPerOrder, pointsPer1000Paid } from '../config'
import type {
  AdminOrder,
  CommissionPayout,
  Employee,
  InventoryMovement,
  Material,
  PricingRules,
  Recommendation,
  Role,
} from '../types'

export interface MaterialRequirement {
  materialId: string
  qty: number
}

export interface InventoryUpdate {
  materials: Material[]
  movements: InventoryMovement[]
}

export interface MaterialYieldEstimate {
  yieldPerUnit: number
  wastePercent: number
}

export function includePendingPurchases(
  materials: readonly Material[],
  movements: readonly InventoryMovement[],
): Material[] {
  const pendingQtyByMaterial = new Map<string, number>()
  for (const movement of movements) {
    if (movement.type === 'In' && movement.reason.startsWith('Pending purchase (mock)')) {
      pendingQtyByMaterial.set(
        movement.materialId,
        (pendingQtyByMaterial.get(movement.materialId) ?? 0) + movement.qty,
      )
    }
  }
  return materials.map(material => ({
    ...material,
    stock: material.stock + (pendingQtyByMaterial.get(material.id) ?? 0),
  }))
}

export interface PricingSuggestionInput {
  product: string
  currentPrice: number
  suggestedPrice: number
  basis: string
}

export interface ProfitBreakdown {
  productionCost: number
  grossProfit: number
  netProfit: number
}

export type EmployeeInput = Omit<Employee, 'id' | 'status'>

const VALID_ROLES: readonly Role[] = [
  'Admin',
  'Manager',
  'Sales Person',
  'Production Staff',
]
const VALID_SCHEDULE_DAYS = new Set([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
])

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite number greater than or equal to zero.`)
  }
}

export function isLowStock(material: Pick<Material, 'stock' | 'reorderPoint'>): boolean {
  return material.stock <= material.reorderPoint
}

export function deductInventory(
  materials: readonly Material[],
  requirements: readonly MaterialRequirement[],
  existingMovements: readonly InventoryMovement[],
  orderId: string,
  at: string,
  movementIdPrefix: string,
): InventoryUpdate {
  if (!orderId.trim() || !at.trim() || !movementIdPrefix.trim()) {
    throw new Error('Order ID, timestamp, and movement ID prefix are required.')
  }

  const requiredByMaterial = new Map<string, number>()
  for (const requirement of requirements) {
    if (!requirement.materialId.trim()) {
      throw new Error('Every material requirement must include a material ID.')
    }
    if (!Number.isFinite(requirement.qty) || requirement.qty <= 0) {
      throw new RangeError('Required material quantities must be finite and greater than zero.')
    }
    requiredByMaterial.set(
      requirement.materialId,
      (requiredByMaterial.get(requirement.materialId) ?? 0) + requirement.qty,
    )
  }

  const materialById = new Map(materials.map(material => [material.id, material]))
  for (const [materialId, qty] of requiredByMaterial) {
    const material = materialById.get(materialId)
    if (!material) {
      throw new Error(`Material "${materialId}" was not found.`)
    }
    if (material.stock < qty) {
      throw new RangeError(`Insufficient stock for "${material.name}".`)
    }
  }

  const deductions = [...requiredByMaterial.entries()]
  const updatedMaterials = materials.map(material => {
    const qty = requiredByMaterial.get(material.id)
    return qty === undefined ? material : { ...material, stock: material.stock - qty }
  })
  const newMovements = deductions.map(([materialId, qty], index): InventoryMovement => ({
    id: `${movementIdPrefix}-${index + 1}`,
    materialId,
    type: 'Out',
    qty,
    reason: 'Order confirmed',
    orderId,
    at,
  }))

  return {
    materials: updatedMaterials,
    movements: [...existingMovements, ...newMovements],
  }
}

export function addInventory(
  materials: readonly Material[],
  existingMovements: readonly InventoryMovement[],
  materialId: string,
  qty: number,
  reason: string,
  at: string,
  movementId: string,
): InventoryUpdate {
  assertFiniteNonNegative(qty, 'Quantity')
  if (qty === 0) {
    throw new RangeError('Quantity must be greater than zero.')
  }
  if (!reason.trim() || !at.trim() || !movementId.trim()) {
    throw new Error('Reason, timestamp, and movement ID are required.')
  }
  const material = materials.find(item => item.id === materialId)
  if (!material) {
    throw new Error(`Material "${materialId}" was not found.`)
  }

  return {
    materials: materials.map(item =>
      item.id === materialId ? { ...item, stock: item.stock + qty } : item,
    ),
    movements: [
      ...existingMovements,
      { id: movementId, materialId, type: 'In', qty, reason, at },
    ],
  }
}

export function estimateMaterialYield(
  consumption: {
    materialPerUnit: number
    usableMaterialPerUnit: number
    consumptionPerPiece: number
  },
): MaterialYieldEstimate {
  const { materialPerUnit, usableMaterialPerUnit, consumptionPerPiece } = consumption
  if (
    !Number.isFinite(materialPerUnit) ||
    !Number.isFinite(usableMaterialPerUnit) ||
    !Number.isFinite(consumptionPerPiece) ||
    materialPerUnit <= 0 ||
    usableMaterialPerUnit < 0 ||
    usableMaterialPerUnit > materialPerUnit ||
    consumptionPerPiece <= 0
  ) {
    throw new RangeError('Material yield inputs must be finite and within valid positive ranges.')
  }

  return {
    yieldPerUnit: usableMaterialPerUnit / consumptionPerPiece,
    wastePercent: ((materialPerUnit - usableMaterialPerUnit) / materialPerUnit) * 100,
  }
}

export function generateRecommendations(
  materials: readonly Material[],
  targetStock: Readonly<Record<string, number>>,
  pricingSuggestions: readonly PricingSuggestionInput[],
  idPrefix = 'recommendation',
  movements: readonly InventoryMovement[] = [],
): Recommendation[] {
  const coveredMaterials = includePendingPurchases(materials, movements)
  const lowStockMaterials = coveredMaterials.filter(isLowStock)
  if (lowStockMaterials.length > 0) {
    return lowStockMaterials.map((material, index) => {
      const target = targetStock[material.id]
      if (!Number.isFinite(target) || target < material.stock) {
        throw new RangeError(`A valid reorder target is required for "${material.id}".`)
      }
      const qty = target - material.stock
      return {
        id: `${idPrefix}-${index + 1}`,
        kind: 'Reorder',
        subject: material.name,
        suggestion: `Reorder ${qty} ${material.unit}.`,
        basis: `Current stock ${material.stock} is at or below reorder point ${material.reorderPoint}; target stock is ${target}.`,
        status: 'Pending',
        materialId: material.id,
        reorderQty: qty,
      }
    })
  }

  return pricingSuggestions.map((suggestion, index) => ({
    id: `${idPrefix}-${index + 1}`,
    kind: 'Pricing',
    subject: suggestion.product,
    suggestion: `Change price from ${formatCurrency(suggestion.currentPrice)} to ${formatCurrency(suggestion.suggestedPrice)}.`,
    basis: suggestion.basis,
    status: 'Pending',
    pricingUpdate: { product: suggestion.product, price: suggestion.suggestedPrice },
  }))
}

export function createCommissionPayout(
  order: AdminOrder,
  at = new Date().toISOString(),
): CommissionPayout | null {
  assertFiniteNonNegative(order.amountPaid, 'Amount paid')
  if (!order.claimed || order.amountPaid < order.salePrice) {
    return null
  }
  if (!Number.isInteger(order.pieces) || order.pieces <= 0) {
    throw new RangeError('Order pieces must be a positive integer.')
  }

  return {
    id: `${order.id}-commission`,
    salesPersonId: order.salesPersonId,
    orderId: order.id,
    pieces: order.pieces,
    amount: order.pieces * commissionPerPiece,
    status: 'Unpaid',
    postedAt: at,
  }
}

export function calculateCostAndProfit(
  order: Pick<AdminOrder, 'salePrice' | 'materialCost' | 'laborCost'>,
  commission: number,
  otherExpenses = otherExpensesPerOrder,
): ProfitBreakdown {
  assertFiniteNonNegative(order.salePrice, 'Sale price')
  assertFiniteNonNegative(order.materialCost, 'Material cost')
  assertFiniteNonNegative(order.laborCost, 'Labor cost')
  assertFiniteNonNegative(commission, 'Commission')
  assertFiniteNonNegative(otherExpenses, 'Other expenses')

  const productionCost = order.materialCost + order.laborCost
  const grossProfit = order.salePrice - productionCost
  return {
    productionCost,
    grossProfit,
    netProfit: grossProfit - commission - otherExpenses,
  }
}

export function calculateMembershipPoints(paid: number): number {
  assertFiniteNonNegative(paid, 'Paid amount')
  return Math.floor(paid / pointsPer1000Paid)
}

export function validatePricingRules(rules: PricingRules): string[] {
  const errors: string[] = []
  for (const [product, price] of Object.entries(rules.productPrices)) {
    if (!Number.isFinite(price) || price < 0) {
      errors.push(`Price for "${product}" must be a finite number greater than or equal to zero.`)
    }
  }
  for (const [tier, percent] of Object.entries(rules.membershipDiscount)) {
    if (!isValidPercent(percent)) {
      errors.push(`Membership discount for ${tier} must be between 0 and 100.`)
    }
  }
  rules.volumeDiscounts.forEach((discount, index) => {
    if (!Number.isFinite(discount.minPieces) || discount.minPieces < 0) {
      errors.push(`Volume discount ${index + 1} minimum pieces must be greater than or equal to zero.`)
    }
    if (!isValidPercent(discount.percent)) {
      errors.push(`Volume discount ${index + 1} percent must be between 0 and 100.`)
    }
  })
  if (!isValidPercent(rules.rushPercent)) {
    errors.push('Rush percent must be between 0 and 100.')
  }
  for (const term of [15, 30] as const) {
    if (!isValidPercent(rules.creditCharge[term])) {
      errors.push(`Credit charge for ${term} days must be between 0 and 100.`)
    }
  }
  return errors
}

function isValidPercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100
}

export function validateEmployeeInput(
  input: EmployeeInput,
  existingEmployees: readonly Employee[],
): string[] {
  const errors: string[] = []
  const name = input.name.trim()
  if (!name) {
    errors.push('Employee name is required.')
  } else if (existingEmployees.some(employee => employee.name.trim().toLowerCase() === name.toLowerCase())) {
    errors.push('Employee name must be unique.')
  }
  if (!VALID_ROLES.includes(input.role)) {
    errors.push('A valid employee role is required.')
  }
  if (!input.team?.trim()) {
    errors.push('Employee team is required.')
  }
  if (input.schedule.length === 0) {
    errors.push('At least one schedule day is required.')
  } else if (
    input.schedule.some(day => !VALID_SCHEDULE_DAYS.has(day)) ||
    new Set(input.schedule).size !== input.schedule.length
  ) {
    errors.push('Schedule must contain unique, valid days of the week.')
  }
  return errors
}

export function createEmployee(
  id: string,
  input: EmployeeInput,
  existingEmployees: readonly Employee[],
): Employee {
  if (!id.trim()) {
    throw new Error('Employee ID is required.')
  }
  const errors = validateEmployeeInput(input, existingEmployees)
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }
  return {
    ...input,
    id,
    name: input.name.trim(),
    team: input.team?.trim(),
    schedule: [...input.schedule],
    status: 'Pending',
  }
}

export function exportToCsv(
  rows: readonly Record<string, string | number | boolean | null | undefined>[],
  headers?: readonly string[],
): string {
  const columns = headers ?? (rows.length > 0 ? Object.keys(rows[0]) : [])
  if (columns.length === 0) {
    return ''
  }
  const escapeCell = (value: string | number | boolean | null | undefined): string => {
    const text = value == null ? '' : String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [
    columns.map(escapeCell).join(','),
    ...rows.map(row => columns.map(column => escapeCell(row[column])).join(',')),
  ].join('\r\n')
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError('Currency amount must be a finite number.')
  }
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
