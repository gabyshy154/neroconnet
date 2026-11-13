export type Role = 'Admin' | 'Manager' | 'Sales Person' | 'Production Staff'
export type ViewAs = 'Admin' | 'Manager' | `employee:${string}`
export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
export type Stage = 'Cutting' | 'Printing/Sewing' | 'Heat Press' | 'Quality Control'

export interface OrderAssignmentEvent {
  id: string
  orderId: string
  teamId: string
  scheduleStart: string
  at: string
}

export interface Material {
  id: string
  name: string
  unit: string
  stock: number
  reorderPoint: number
  unitCost: number
  sizeStock?: Record<string, number>
}

export interface InventoryMovement {
  id: string
  materialId: string
  type: 'In' | 'Out'
  qty: number
  reason: string
  orderId?: string
  at: string
}

export interface PricingRules {
  productPrices: Record<string, number>
  membershipDiscount: Record<Tier, number>
  volumeDiscounts: { minPieces: number; percent: number }[]
  rushPercent: number
  creditCharge: { 15: number; 30: number }
}

export interface Employee {
  id: string
  name: string
  role: Role
  team?: string
  schedule: string[]
  status: 'Pending' | 'Active' | 'Inactive'
}

export interface DesignSubmission {
  id: string
  orderRef: string
  customer: string
  source: 'Client Design' | 'Nero Design'
  front: string
  back?: string
  status: 'Draft' | 'Under Review' | 'Revision Required' | 'Approved'
  note?: string
}

export interface AdminOrder {
  id: string
  customer: string
  pieces: number
  salesPersonId: string
  createdAt: string
  teamId?: string
  scheduleStart?: string
  deadline: string
  stage?: Stage
  salePrice: number
  amountPaid: number
  materialCost: number
  laborCost: number
  claimed: boolean
}

export interface CommissionPayout {
  id: string
  salesPersonId: string
  orderId: string
  pieces: number
  amount: number
  status: 'Unpaid' | 'Paid'
  postedAt: string
  paidAt?: string
}

export interface MembershipTierCorrection {
  id: string
  npcNumber: string
  fromTier: Tier
  toTier: Tier
  at: string
}

export interface Member {
  npcNumber: string
  name: string
  tier: Tier
  points: number
  joinedAt: string
}

export interface Recommendation {
  id: string
  kind: 'Reorder' | 'Pricing'
  subject: string
  suggestion: string
  basis: string
  status: 'Pending' | 'Approved' | 'Rejected'
  materialId?: string
  reorderQty?: number
  pricingUpdate?: { product: string; price: number }
}
