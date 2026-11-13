export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum"

export type Stage = "Cutting" | "Printing/Sewing" | "Heat Press" | "Quality Control"

export type PaymentMethod = "Cash" | "GCash" | "Bank Transfer"

export type PaymentStatus = "Unpaid" | "Partially Paid" | "Paid in Full"

export type OrderStatus = "Pending Downpayment" | "In Production" | "Ready for Claim" | "Claimed"

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

  claim?: {
    method: "Pick-up" | "Delivery"

    deliveryAddress?: string

    claimedAt?: string
  }

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
