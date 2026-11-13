import type {
  CommissionEntry,
  Customer,
  NpcMember,
  Order,
  OrderLine,
  Payment,
  ProductType,
  Stage,
  StageLogEntry,
  Staff,
} from "../types"

export const seedStaff: Staff[] = [
  { id: "staff-001", name: "Rina Flores", isSalesPerson: true },

  { id: "staff-002", name: "Mark Bautista", isSalesPerson: true },

  { id: "staff-003", name: "Jenny Tan", isSalesPerson: true },

  { id: "staff-004", name: "Roel Santos", isSalesPerson: true },

  { id: "staff-005", name: "Liza Mendoza", isSalesPerson: false },
]

export const seedCustomers: Customer[] = [
  {
    id: "customer-001",

    name: "Maria Santos",

    phone: "0917 123 4567",

    npcNumber: "NPC-000101",
  },

  {
    id: "customer-002",

    name: "Jose Reyes",

    phone: "0928 456 1132",

    npcNumber: "NPC-000102",
  },

  {
    id: "customer-003",

    name: "Ana Cruz",

    phone: "0935 820 1440",

    npcNumber: "NPC-000103",
  },

  {
    id: "customer-004",

    name: "Carlos Dela Rosa",

    phone: "0909 652 8190",

    npcNumber: "NPC-000104",
  },

  { id: "customer-005", name: "Paolo Lim", phone: "0918 234 5678" },

  { id: "customer-006", name: "Bea Navarro", phone: "0920 345 6789" },

  { id: "customer-007", name: "Miguel Garcia", phone: "0930 456 7890" },

  { id: "customer-008", name: "Sofia Villanueva", phone: "+639171234568" },
]

export const seedNpcMembers: NpcMember[] = [
  {
    npcNumber: "NPC-000101",

    customerId: "customer-001",

    tier: "Bronze",

    points: 12,

    joinedAt: "2025-03-12T09:00:00.000Z",
  },

  {
    npcNumber: "NPC-000102",

    customerId: "customer-002",

    tier: "Silver",

    points: 46,

    joinedAt: "2024-11-03T09:00:00.000Z",
  },

  {
    npcNumber: "NPC-000103",

    customerId: "customer-003",

    tier: "Gold",

    points: 128,

    joinedAt: "2023-08-22T09:00:00.000Z",
  },

  {
    npcNumber: "NPC-000104",

    customerId: "customer-004",

    tier: "Platinum",

    points: 305,

    joinedAt: "2022-05-17T09:00:00.000Z",
  },
]

export const seedProductTypes: ProductType[] = [
  {
    id: "product-001",

    name: "Sublimation Jersey",

    pricePerPiece: 420,

    isApparel: true,
  },

  {
    id: "product-002",

    name: "Sublimation Polo",

    pricePerPiece: 520,

    isApparel: true,
  },

  {
    id: "product-003",

    name: "Training Shorts",

    pricePerPiece: 280,

    isApparel: true,
  },

  {
    id: "product-004",

    name: "Jersey + Shorts Set",

    pricePerPiece: 580,

    isApparel: true,
  },

  {
    id: "product-005",

    name: "Custom T-Shirt",

    pricePerPiece: 350,

    isApparel: true,
  },

  {
    id: "product-006",

    name: "Printed Tote Bag",

    pricePerPiece: 180,

    isApparel: false,
  },
]

function apparelLine(
  productTypeId: string,

  pricePerPiece: number,

  sizes: Record<string, number>,

  printingType: OrderLine["printingType"] = "Full Sublimation",
): OrderLine {
  return {
    productTypeId,

    material: "Polyester",

    printingType,

    printLocation: "Front and back",

    colorsCount: 3,

    color: "Navy / Sage",

    sizes,

    pricePerPiece,
  }
}

function nonApparelLine(
  productTypeId: string,

  pricePerPiece: number,

  quantity: number,
): OrderLine {
  return {
    productTypeId,

    material: "Cotton",

    printingType: "Digital Print",

    printLocation: "Front",

    color: "Natural",

    sizes: { QTY: quantity },

    pricePerPiece,
  }
}

const payment = (
  id: string,

  orderId: string,

  amount: number,

  method: Payment["method"],

  recordedBy: string,

  recordedAt: string,

  receiptIssued: boolean,
): Payment => ({
  id,

  orderId,

  amount,

  method,

  recordedBy,

  recordedAt,

  receiptIssued,
})

export const seedPayments: Payment[] = [
  payment(
    "payment-001",

    "NPS-20261106-002",

    4000,

    "Cash",

    "staff-001",

    "2026-11-06T08:35:00.000Z",

    true,
  ),

  payment(
    "payment-002",

    "NPS-20261106-003",

    5000,

    "Bank Transfer",

    "staff-002",

    "2026-11-06T08:42:00.000Z",

    false,
  ),

  payment(
    "payment-003",

    "NPS-20261106-004",

    2000,

    "GCash",

    "staff-003",

    "2026-11-06T08:50:00.000Z",

    true,
  ),

  payment(
    "payment-004",

    "NPS-20261106-005",

    1000,

    "Cash",

    "staff-004",

    "2026-11-06T09:05:00.000Z",

    false,
  ),

  payment(
    "payment-005",

    "NPS-20261106-006",

    1800,

    "Cash",

    "staff-001",

    "2026-11-06T09:10:00.000Z",

    true,
  ),

  payment(
    "payment-006",

    "NPS-20261106-006",

    1800,

    "Bank Transfer",

    "staff-001",

    "2026-11-06T09:18:00.000Z",

    false,
  ),

  payment(
    "payment-007",

    "NPS-20261106-007",

    1890,

    "Cash",

    "staff-002",

    "2026-11-06T09:22:00.000Z",

    true,
  ),

  payment(
    "payment-008",

    "NPS-20261106-008",

    4784,

    "GCash",

    "staff-003",

    "2026-11-06T09:30:00.000Z",

    true,
  ),

  payment(
    "payment-009",

    "NPS-20261106-009",

    840,

    "Cash",

    "staff-001",

    "2026-11-04T12:00:00.000Z",

    true,
  ),

  payment(
    "payment-010",

    "NPS-20261106-010",

    840,

    "Bank Transfer",

    "staff-002",

    "2026-10-29T12:00:00.000Z",

    true,
  ),

  payment(
    "payment-011",

    "NPS-20261106-011",

    1400,

    "GCash",

    "staff-004",

    "2026-11-06T12:00:00.000Z",

    false,
  ),
]

function createSeedStageLog(
  orderId: string,
  stages: Stage[],
  staffId: string,
  firstAt: string,
  via: StageLogEntry["via"] = "Phone scan",
): StageLogEntry[] {
  const firstTimestamp = Date.parse(firstAt)
  return stages.map((stage, index) => ({
    orderId,
    stage,
    staffId,
    at: new Date(firstTimestamp + index * 60 * 60 * 1000).toISOString(),
    via,
  }))
}

export const seedOrders: Order[] = [
  {
    id: "NPS-20261106-001",

    customerId: "customer-005",

    salesPersonId: "staff-001",

    lines: [apparelLine("product-001", 420, { M: 2, L: 3 })],

    deadline: "2026-11-10",

    rush: false,

    status: "Pending Downpayment",

    payments: [],

    stageLog: [],

    createdAt: "2026-11-06T08:10:00.000Z",
  },

  {
    id: "NPS-20261106-002",

    customerId: "customer-001",

    salesPersonId: "staff-001",

    lines: [apparelLine("product-002", 520, { M: 5, L: 5 })],

    deadline: "2026-11-12",

    rush: false,

    stage: "Cutting",

    status: "In Production",

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-002",
    ),

    stageLog: [],

    createdAt: "2026-11-06T08:20:00.000Z",
  },

  {
    id: "NPS-20261106-003",

    customerId: "customer-002",

    salesPersonId: "staff-002",

    lines: [apparelLine("product-003", 280, { S: 10, M: 10 })],

    deadline: "2026-11-11",

    rush: true,

    stage: "Printing/Sewing",

    status: "In Production",

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-003",
    ),

    stageLog: createSeedStageLog(
      "NPS-20261106-003",
      ["Cutting"],
      "staff-002",
      "2026-11-06T08:30:00.000Z",
    ),

    createdAt: "2026-11-06T08:25:00.000Z",
  },

  {
    id: "NPS-20261106-004",

    customerId: "customer-003",

    salesPersonId: "staff-003",

    lines: [apparelLine("product-004", 580, { M: 8, L: 4 })],

    deadline: "2026-11-04",

    rush: false,

    stage: "Heat Press",

    status: "In Production",

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-004",
    ),

    stageLog: createSeedStageLog(
      "NPS-20261106-004",
      ["Cutting", "Printing/Sewing"],
      "staff-003",
      "2026-11-02T08:00:00.000Z",
    ),

    createdAt: "2026-11-01T10:00:00.000Z",
  },

  {
    id: "NPS-20261106-005",

    customerId: "customer-006",

    salesPersonId: "staff-004",

    lines: [apparelLine("product-005", 350, { S: 3, M: 3, L: 2 })],

    deadline: "2026-11-13",

    rush: false,

    stage: "Quality Control",

    status: "In Production",

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-005",
    ),

    stageLog: createSeedStageLog(
      "NPS-20261106-005",
      ["Cutting", "Printing/Sewing", "Heat Press"],
      "staff-004",
      "2026-11-04T08:00:00.000Z",
      "Manual entry",
    ),

    createdAt: "2026-11-03T11:00:00.000Z",
  },

  {
    id: "NPS-20261106-006",

    customerId: "customer-007",

    salesPersonId: "staff-001",

    lines: [nonApparelLine("product-006", 180, 20)],

    deadline: "2026-11-14",

    rush: false,

    creditTermDays: 15,

    stage: "Printing/Sewing",

    status: "In Production",

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-006",
    ),

    stageLog: createSeedStageLog(
      "NPS-20261106-006",
      ["Cutting"],
      "staff-001",
      "2026-11-06T08:00:00.000Z",
      "Manual entry",
    ),

    createdAt: "2026-11-05T13:15:00.000Z",
  },

  {
    id: "NPS-20261106-007",

    customerId: "customer-004",

    salesPersonId: "staff-002",

    lines: [apparelLine("product-001", 420, { M: 5 })],

    deadline: "2026-11-08",

    rush: false,

    stage: "Quality Control",

    status: "Ready for Claim",

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-007",
    ),

    stageLog: createSeedStageLog(
      "NPS-20261106-007",
      ["Cutting", "Printing/Sewing", "Heat Press", "Quality Control"],
      "staff-002",
      "2026-11-05T08:00:00.000Z",
    ),

    createdAt: "2026-11-04T14:00:00.000Z",
  },

  {
    id: "NPS-20261106-008",

    customerId: "customer-003",

    salesPersonId: "staff-003",

    lines: [apparelLine("product-002", 520, { M: 5, L: 5 })],

    deadline: "2026-11-05",

    rush: false,

    stage: "Quality Control",

    status: "Claimed",

    claim: {
      method: "Delivery",

      deliveryAddress: "Banilad, Mandaue City, Cebu",

      claimedAt: "2026-11-06T09:35:00.000Z",
    },

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-008",
    ),

    stageLog: createSeedStageLog(
      "NPS-20261106-008",
      ["Cutting", "Printing/Sewing", "Heat Press", "Quality Control"],
      "staff-003",
      "2026-11-03T08:00:00.000Z",
    ),

    createdAt: "2026-11-02T15:00:00.000Z",
  },

  {
    id: "NPS-20261106-009",

    customerId: "customer-005",

    salesPersonId: "staff-001",

    lines: [apparelLine("product-001", 420, { M: 2 })],

    deadline: "2026-11-12",

    rush: false,

    stage: "Quality Control",

    status: "Claimed",

    claim: {
      method: "Pick-up",

      claimedAt: "2026-11-04T12:00:00.000Z",
    },

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-009",
    ),

    stageLog: [],

    createdAt: "2026-11-04T10:00:00.000Z",
  },

  {
    id: "NPS-20261106-010",

    customerId: "customer-006",

    salesPersonId: "staff-002",

    lines: [apparelLine("product-003", 280, { S: 3 })],

    deadline: "2026-11-03",

    rush: false,

    stage: "Quality Control",

    status: "Claimed",

    claim: {
      method: "Delivery",

      deliveryAddress: "Centro, Mandaue City, Cebu",

      claimedAt: "2026-10-29T12:00:00.000Z",
    },

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-010",
    ),

    stageLog: [],

    createdAt: "2026-10-28T10:00:00.000Z",
  },

  {
    id: "NPS-20261106-011",

    customerId: "customer-008",

    salesPersonId: "staff-004",

    lines: [apparelLine("product-005", 350, { M: 4 })],

    deadline: "2026-11-14",

    rush: false,

    stage: "Quality Control",

    status: "Claimed",

    claim: {
      method: "Pick-up",

      claimedAt: "2026-11-06T12:00:00.000Z",
    },

    payments: seedPayments.filter(
      (item) => item.orderId === "NPS-20261106-011",
    ),

    stageLog: [],

    createdAt: "2026-11-06T10:00:00.000Z",
  },
]

export const seedCommissions: CommissionEntry[] = [
  {
    orderId: "NPS-20261106-008",

    salesPersonId: "staff-003",

    pieces: 10,

    amount: 200,

    postedAt: "2026-11-06T09:35:00.000Z",
  },

  {
    orderId: "NPS-20261106-009",

    salesPersonId: "staff-001",

    pieces: 2,

    amount: 40,

    postedAt: "2026-11-04T12:00:00.000Z",
  },

  {
    orderId: "NPS-20261106-010",

    salesPersonId: "staff-002",

    pieces: 3,

    amount: 60,

    postedAt: "2026-10-29T12:00:00.000Z",
  },

  {
    orderId: "NPS-20261106-011",

    salesPersonId: "staff-004",

    pieces: 4,

    amount: 80,

    postedAt: "2026-11-06T12:00:00.000Z",
  },
]
