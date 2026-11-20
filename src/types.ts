/** Who the demo is viewed as: the Admin, or one employee whose module permissions decide what they see. */
export type ViewAs = 'Admin' | `employee:${string}`
export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
export type Stage = 'Cutting' | 'Printing/Sewing' | 'Heat Press' | 'Quality Control'

export interface OrderAssignmentEvent {
  id: string
  orderId: string
  teamId: string
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
  /** QR Code / Number of a non-order movement, such as a supplier delivery receipt. */
  reference?: string
  at: string
}

/** Formula 2 inputs: Selling Price = (Material + Labor + Overhead) × (1 + Markup). */
export interface ProductCost {
  materialCost: number
  laborCost: number
  overheadCost: number
  markupPercent: number
}

export interface PricingRules {
  productCosts: Record<string, ProductCost>
  membershipDiscount: Record<Tier, number>
  volumeDiscounts: { minPieces: number; percent: number }[]
  rushPercent: number
  creditCharge: { 15: number; 30: number }
  /** Labor-based screen-print charge from color count and print area. */
  screenPrint: { setupFeePerColor: number; perColorPerPiece: number; perSquareInchPerPiece: number }
  storageFee: { graceDays: number; percentPerWeek: number }
  latePaymentPenalty: { percentPer30Days: number }
}

/** A saved price change waiting for its effective time. Only one can be pending. */
export interface ScheduledPricingChange {
  id: string
  rules: PricingRules
  effectiveAt: string
  scheduledAt: string
  source: string
}

/** Every price change that took effect, kept so each computed price can be traced to its rules. */
export interface PricingHistoryEntry {
  id: string
  effectiveAt: string
  scheduledAt: string
  source: string
  changes: string[]
}

export type AccountRole ='Employee' | 'Admin'
export type UserTag = 'Sales' | 'Production'
export type AccessLevel = 'none' | 'view' | 'edit'
export type ModuleId =
  | 'order-entry'
  | 'quotation-billing'
  | 'payment-recording'
  | 'npc-membership'
  | 'pricing-rules'
  | 'order-lifecycle'
  | 'design-review'
  | 'inventory'
  | 'user-management'
  | 'sales-commission'
  | 'reports-analytics'
  | 'business-recommendations'
export type ModulePermissions = Record<ModuleId, AccessLevel>

export interface UserAccount {
  email: string
  contactNumber: string
  credential: 'Invite' | 'Password'
  accountRole: AccountRole
  tags: UserTag[]
  permissions: ModulePermissions
  updatedAt: string
}

export interface Employee {
  id: string
  name: string
  /** Free-text job title (e.g. "Manager", "Cashier"). A label only: access comes from the account role and module permissions. */
  jobTitle?: string
  team?: string
  schedule: string[]
  status: 'Pending' | 'Active' | 'Inactive'
  account?: UserAccount
}

export interface DesignSubmission {
  id: string
  orderRef: string
  customer: string
  front: string
  back?: string
  /** REQ-4.3-04. Drafts stay in the Customer Portal: a design is saved only once submitted (REQ-4.3-07). */
  status: 'Under Review' | 'Revision Required' | 'Approved'
  note?: string
}

/**
 * A customer record (USERS with user_type = customer in the ERD). Portal customers have a
 * login; walk-in customers are recorded by the Billing System by name and phone only.
 * NPC membership is separate: a customer may or may not be enrolled.
 */
export interface Customer {
  id: string
  name: string
  contactNumber: string
  email?: string
  type: 'Portal account' | 'Walk-in'
  npcNumber?: string
  registeredAt: string
  /** Deactivated: portal login disabled. Blocked: walk-in record blocked on a data-privacy request. */
  status: 'Active' | 'Deactivated' | 'Blocked'
  /** Deactivations and reactivations, with the reason (e.g. a data-privacy request). */
  accountLog: { action: 'Deactivated' | 'Reactivated' | 'Blocked' | 'Unblocked'; reason: string; at: string }[]
}

export interface AdminOrder {
  id: string
  customerId: string
  customer: string
  /** NPC number of the customer's membership, when enrolled. */
  npcNumber?: string
  product: string
  pieces: number
  salesPersonId: string
  createdAt: string
  teamId?: string
  deadline: string
  stage?: Stage
  claimMethod?: 'Pick-up' | 'Delivery'
  /** Set when Quality Control is done and the order is Ready for Pickup / Delivery. */
  readyAt?: string
  salePrice: number
  amountPaid: number
  materialCost: number
  laborCost: number
  claimed: boolean
  /** Set when the order is both claimed and paid in full. */
  completedAt?: string
}

export type OrderStatus =
  | 'Awaiting Release'
  | 'In Production'
  | 'Ready for Pickup'
  | 'Ready for Delivery'
  | 'Claimed'

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
  /** Automatic upgrades happen when points reach a tier threshold; corrections are manual. */
  reason: 'Manual correction' | 'Points threshold reached'
  at: string
}

export interface MembershipPointsAdjustment {
  id: string
  npcNumber: string
  fromPoints: number
  toPoints: number
  reason: string
  at: string
}

export interface Member {
  npcNumber: string
  name: string
  tier: Tier
  points: number
  /** Sample opening balance: points earned before the order history shown in the demo. */
  openingPoints: number
  joinedAt: string
}

export interface Recommendation {
  id: string
  kind: 'Reorder' | 'Pricing'
  subject: string
  suggestion: string
  basis: string
  /** Alerts only (BR-11): Pending until the admin marks it Reviewed. */
  status: 'Pending' | 'Reviewed'
  reviewedAt?: string
  materialId?: string
  reorderQty?: number
  pricingUpdate?: { product: string; markupPercent: number }
}
