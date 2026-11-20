export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum"

export type Stage = "Cutting" | "Printing/Sewing" | "Heat Press" | "Quality Control"

export type PaymentMethod = "Cash" | "GCash" | "Bank Transfer"

export type PaymentStatus = "Unpaid" | "Partially Paid" | "Paid in Full"

// Same lifecycle as the Admin Portal (REQ-4.11-06): an order is released for production only
// with an approved design and a recorded downpayment (BR-07, BR-03).
export type OrderStatus =
  | "Awaiting Release"
  | "In Production"
  | "Ready for Pickup"
  | "Ready for Delivery"
  | "Claimed"

// Set by the Admin Portal's Design Review (REQ-4.3-04).
export type DesignStatus = "Under Review" | "Revision Required" | "Approved"

export type ClaimMethod = "Pick-up" | "Delivery"

/** The price breakdown saved when the order is created; later tier or price changes never alter it. */
export interface LockedPricing {
  tier?: Tier

  totalPieces: number

  subtotal: number

  discounts: { label: string; amount: number }[]

  totalDiscount: number

  rushSurcharge: number

  creditCharge: number

  grandTotal: number
}

export interface StageLogEntry {
  orderId: string

  stage: Stage

  staffId: string

  at: string

  via: "Phone scan" | "Manual entry"
}

export interface Customer {
  id: string

  name: string

  phone: string

  npcNumber?: string
}

export interface Staff {
  id: string

  name: string

  /** Same staff account email as the Admin Portal's User Management. */
  email: string

  isSalesPerson: boolean
}

export interface NpcMember {
  npcNumber: string

  customerId: string

  tier: Tier

  points: number

  joinedAt: string
}

export interface ProductType {
  id: string

  name: string

  pricePerPiece: number

  isApparel: boolean
}

export interface OrderLine {
  productTypeId: string

  material?: "Cotton" | "Polyester" | "Drift" | "Mixed"

  printingType: "Full Sublimation" | "Screen Print" | "Digital Print" | "Vinyl"

  printLocation: string

  colorsCount?: number

  color?: string

  sizes: Record<string, number>

  pricePerPiece: number
}

export interface Payment {
  id: string

  orderId: string

  method: PaymentMethod

  amount: number

  recordedBy: string

  recordedAt: string

  /** GCash / bank reference code (REQ-4.6-03, REQ-4.7-03); optional for cash. */
  referenceCode?: string

  /** Non-VAT Sales Invoice issued for this payment (REQ-4.7-03). */
  receiptIssued: boolean
}

export interface Order {
  id: string

  customerId: string

  salesPersonId: string

  lines: OrderLine[]

  deadline: string

  rush: boolean

  creditTermDays?: 15 | 30

  stage?: Stage

  status: OrderStatus

  designStatus: DesignStatus

  /** Chosen when the order is confirmed (REQ-4.7-04); claimedAt is set on release. */
  claim: {
    method: ClaimMethod

    deliveryAddress?: string

    claimedAt?: string
  }

  pricing: LockedPricing

  payments: Payment[]

  stageLog: StageLogEntry[]

  createdAt: string
}

export interface CommissionEntry {
  orderId: string

  salesPersonId: string

  pieces: number

  amount: number

  postedAt: string
}

export interface QueuedAction {
  id: string

  type: string

  payload: unknown

  queuedAt: string
}
