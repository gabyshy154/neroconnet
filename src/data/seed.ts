import { pricingPlaceholders } from '../config'
import { defaultPermissions } from '../lib/userAccess'
import type {
  AccountRole,
  AdminOrder,
  CommissionPayout,
  Customer,
  DesignSubmission,
  Employee,
  InventoryMovement,
  Material,
  Member,
  MembershipPointsAdjustment,
  MembershipTierCorrection,
  ModulePermissions,
  PricingHistoryEntry,
  PricingRules,
  Recommendation,
  ScheduledPricingChange,
  UserTag,
} from '../types'

export interface AdminSeedData {
  materials: Material[]
  inventoryMovements: InventoryMovement[]
  employees: Employee[]
  customers: Customer[]
  orders: AdminOrder[]
  designSubmissions: DesignSubmission[]
  members: Member[]
  commissionPayouts: CommissionPayout[]
  pricingRules: PricingRules
  scheduledPricing: ScheduledPricingChange | null
  pricingHistory: PricingHistoryEntry[]
  recommendations: Recommendation[]
  membershipTierCorrections: MembershipTierCorrection[]
  membershipPointsAdjustments: MembershipPointsAdjustment[]
  releasedOrderIds: string[]
}

// Sample contact details only.
const sampleContacts: Record<string, [email: string, contact: string, updatedAt: string]> = {
  'staff-001': ['rina.flores@neroconnect.local', '0917 555 0101', '2026-11-02T09:00:00.000Z'],
  'staff-002': ['mark.bautista@neroconnect.local', '0917 555 0102', '2026-10-28T10:30:00.000Z'],
  'staff-003': ['jenny.tan@neroconnect.local', '0917 555 0103', '2026-10-30T14:10:00.000Z'],
  'staff-004': ['roel.santos@neroconnect.local', '0917 555 0104', '2026-11-03T08:45:00.000Z'],
  'EMP-001': ['maria.santos@neroconnect.local', '0918 555 0201', '2026-11-01T08:00:00.000Z'],
  'EMP-002': ['ramon.reyes@neroconnect.local', '0918 555 0202', '2026-10-25T16:20:00.000Z'],
  'EMP-004': ['jose.flores@neroconnect.local', '0918 555 0204', '2026-11-04T11:15:00.000Z'],
  'EMP-005': ['nina.cruz@neroconnect.local', '0919 555 0305', '2026-11-05T09:40:00.000Z'],
  'EMP-006': ['leo.villanueva@neroconnect.local', '0918 555 0206', '2026-10-20T13:00:00.000Z'],
  'EMP-010': ['paolo.lim@neroconnect.local', '0919 555 0310', '2026-11-05T17:05:00.000Z'],
}

type StaffSeed = Omit<Employee, 'account'> & {
  accountRole: AccountRole
  tags: UserTag[]
  /** Module access beyond the defaults for the role and tags. */
  extraAccess?: Partial<ModulePermissions>
}

function withSampleAccounts(staff: StaffSeed[]): Employee[] {
  return staff.map(({ accountRole, tags, extraAccess, ...employee }) => {
    const [email, contactNumber, updatedAt] = sampleContacts[employee.id]
    return {
      ...employee,
      account: {
        email,
        contactNumber,
        credential: 'Password',
        accountRole,
        tags,
        permissions: { ...defaultPermissions(accountRole, tags), ...extraAccess },
        updatedAt,
      },
    }
  })
}

export const seedData: AdminSeedData = {
  materials: [
    {
      id: 'jersey-fabric-white',
      name: 'White Polyester Jersey Fabric',
      unit: 'pcs',
      stock: 22,
      reorderPoint: 30,
      unitCost: 180,
      sizeStock: { XL: 22 },
    },
    {
      id: 'polo-blanks',
      name: 'Sublimation Polo Blanks',
      unit: 'pcs',
      stock: 18,
      reorderPoint: 30,
      unitCost: 175,
      sizeStock: { M: 18 },
    },
    {
      id: 'shorts-fabric',
      name: 'Polyester Shorts Fabric',
      unit: 'meters',
      stock: 8,
      reorderPoint: 5,
      unitCost: 220,
    },
    {
      id: 'sublimation-paper',
      name: 'Sublimation Paper',
      unit: 'sheets',
      stock: 140,
      reorderPoint: 100,
      unitCost: 12,
    },
    {
      id: 'sublimation-ink-cyan',
      name: 'Sublimation Ink (Cyan)',
      unit: 'bottles',
      stock: 7,
      reorderPoint: 3,
      unitCost: 480,
    },
    {
      id: 'sublimation-ink-magenta',
      name: 'Sublimation Ink (Magenta)',
      unit: 'bottles',
      stock: 6,
      reorderPoint: 3,
      unitCost: 480,
    },
    {
      id: 'tote-blanks',
      name: 'Printed Tote Bag Blanks',
      unit: 'pcs',
      stock: 39,
      reorderPoint: 20,
      unitCost: 90,
    },
    {
      id: 'heat-tape-roll',
      name: 'Heat Press Tape Roll',
      unit: 'rolls',
      stock: 6,
      reorderPoint: 4,
      unitCost: 80,
    },
  ],
  // Order-linked stock-outs only reference orders that were released for production
  // (approved design and downpayment recorded), dated on or after the order was created.
  inventoryMovements: [
    { id: 'MOV-001', materialId: 'jersey-fabric-white', type: 'In', qty: 40, reason: 'Opening stock', at: '2026-10-12T08:00:00.000Z' },
    { id: 'MOV-002', materialId: 'jersey-fabric-white', type: 'Out', qty: 13, reason: 'Released for production', orderId: 'NPS-20261101-001', at: '2026-11-01T11:00:00.000Z' },
    { id: 'MOV-003', materialId: 'polo-blanks', type: 'In', qty: 30, reason: 'Opening stock', at: '2026-10-12T08:05:00.000Z' },
    { id: 'MOV-004', materialId: 'polo-blanks', type: 'Out', qty: 8, reason: 'Released for production', orderId: 'NPS-20261103-001', at: '2026-11-03T12:00:00.000Z' },
    { id: 'MOV-005', materialId: 'shorts-fabric', type: 'In', qty: 20, reason: 'Supplier delivery received', reference: 'DR-1020', at: '2026-10-20T08:30:00.000Z' },
    { id: 'MOV-006', materialId: 'shorts-fabric', type: 'Out', qty: 12, reason: 'Released for production', orderId: 'NPS-20261101-001', at: '2026-11-01T11:05:00.000Z' },
    { id: 'MOV-007', materialId: 'sublimation-paper', type: 'In', qty: 100, reason: 'Opening stock', at: '2026-10-12T08:10:00.000Z' },
    { id: 'MOV-008', materialId: 'sublimation-paper', type: 'Out', qty: 60, reason: 'Production use', orderId: 'NPS-20261102-001', at: '2026-11-02T16:00:00.000Z' },
    { id: 'MOV-009', materialId: 'sublimation-ink-cyan', type: 'In', qty: 8, reason: 'Supplier delivery received', reference: 'DR-1013', at: '2026-10-13T08:30:00.000Z' },
    { id: 'MOV-010', materialId: 'sublimation-ink-cyan', type: 'Out', qty: 1, reason: 'Production use', orderId: 'NPS-20261106-002', at: '2026-11-06T09:00:00.000Z' },
    { id: 'MOV-011', materialId: 'sublimation-ink-magenta', type: 'In', qty: 8, reason: 'Opening stock', at: '2026-10-13T08:45:00.000Z' },
    { id: 'MOV-012', materialId: 'sublimation-ink-magenta', type: 'Out', qty: 2, reason: 'Production use', orderId: 'NPS-20261106-003', at: '2026-11-06T09:05:00.000Z' },
    { id: 'MOV-013', materialId: 'tote-blanks', type: 'In', qty: 45, reason: 'Supplier delivery received', reference: 'DR-1014', at: '2026-10-14T08:15:00.000Z' },
    { id: 'MOV-014', materialId: 'tote-blanks', type: 'Out', qty: 2, reason: 'Production use', orderId: 'NPS-20261104-002', at: '2026-11-04T15:00:00.000Z' },
    { id: 'MOV-015', materialId: 'heat-tape-roll', type: 'In', qty: 10, reason: 'Opening stock', at: '2026-10-12T08:20:00.000Z' },
    { id: 'MOV-016', materialId: 'heat-tape-roll', type: 'Out', qty: 4, reason: 'Production use', orderId: 'NPS-20261104-001', at: '2026-11-04T10:30:00.000Z' },
    { id: 'MOV-017', materialId: 'jersey-fabric-white', type: 'Out', qty: 5, reason: 'Released for production', orderId: 'NPS-20261106-004', at: '2026-11-06T10:15:00.000Z' },
    { id: 'MOV-018', materialId: 'polo-blanks', type: 'Out', qty: 4, reason: 'Released for production', orderId: 'NPS-20261028-001', at: '2026-10-28T11:00:00.000Z' },
    { id: 'MOV-019', materialId: 'tote-blanks', type: 'Out', qty: 4, reason: 'Released for production', orderId: 'NPS-20261106-004', at: '2026-11-06T10:20:00.000Z' },
    { id: 'MOV-020', materialId: 'sublimation-paper', type: 'In', qty: 100, reason: 'Supplier delivery received', reference: 'DR-1105', at: '2026-11-05T08:30:00.000Z' },
  ],
  employees: withSampleAccounts([
    { id: 'staff-001', name: 'Rina Flores', jobTitle: 'Sales Associate', accountRole: 'Employee', tags: ['Sales'], schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], status: 'Active' },
    { id: 'staff-002', name: 'Mark Bautista', jobTitle: 'Sales Associate', accountRole: 'Employee', tags: ['Sales'], schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], status: 'Active' },
    { id: 'staff-003', name: 'Jenny Tan', jobTitle: 'Sales Associate', accountRole: 'Employee', tags: ['Sales'], schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], status: 'Active' },
    { id: 'staff-004', name: 'Roel Santos', jobTitle: 'Sales Associate', accountRole: 'Employee', tags: ['Sales'], schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], status: 'Active' },
    { id: 'EMP-001', name: 'Maria Santos', jobTitle: 'Production Staff', accountRole: 'Employee', tags: ['Production'], team: 'Team A', schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], status: 'Active' },
    { id: 'EMP-002', name: 'Ramon Reyes', jobTitle: 'Production Staff', accountRole: 'Employee', tags: ['Production'], team: 'Team A', schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], status: 'Active' },
    { id: 'EMP-004', name: 'Jose Flores', jobTitle: 'Production Staff', accountRole: 'Employee', tags: ['Production'], team: 'Team B', schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], status: 'Active' },
    { id: 'EMP-005', name: 'Nina Cruz', jobTitle: 'Manager', accountRole: 'Employee', tags: [], extraAccess: { inventory: 'edit', 'reports-analytics': 'view', 'business-recommendations': 'view', 'npc-membership': 'view', 'design-review': 'edit' }, schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], status: 'Active' },
    { id: 'EMP-006', name: 'Leo Villanueva', jobTitle: 'Production Staff', accountRole: 'Employee', tags: ['Production'], team: 'Team B', schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], status: 'Inactive' },
    { id: 'EMP-010', name: 'Paolo Lim', jobTitle: 'Owner', accountRole: 'Admin', tags: [], schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], status: 'Active' },
  ]),
  // Customers (USERS with user_type = customer). Walk-in customers have no portal login and no email;
  // NPC-P members enrolled through the Customer Portal, so they always have a portal account.
  customers: [
    { id: 'CUS-001', name: 'Kevin Ong', contactNumber: '0917 555 1101', email: 'kevin.ong@example.com', type: 'Portal account', npcNumber: 'NPC-P-000101', registeredAt: '2025-03-12', status: 'Active', accountLog: [] },
    { id: 'CUS-002', name: 'Liza Mercado', contactNumber: '0918 555 1102', type: 'Walk-in', npcNumber: 'NPC-B-000102', registeredAt: '2024-11-03', status: 'Active', accountLog: [] },
    { id: 'CUS-003', name: 'Arnel Dizon', contactNumber: '0917 555 1103', email: 'arnel.dizon@example.com', type: 'Portal account', npcNumber: 'NPC-P-000103', registeredAt: '2023-08-22', status: 'Active', accountLog: [] },
    { id: 'CUS-004', name: 'Ana Cruz', contactNumber: '0919 555 1104', type: 'Walk-in', npcNumber: 'NPC-B-000104', registeredAt: '2022-05-17', status: 'Active', accountLog: [] },
    { id: 'CUS-005', name: 'Bea Navarro', contactNumber: '0920 555 1105', type: 'Walk-in', registeredAt: '2026-10-28', status: 'Active', accountLog: [] },
    { id: 'CUS-006', name: 'Miguel Garcia', contactNumber: '0917 555 1106', email: 'miguel.garcia@example.com', type: 'Portal account', registeredAt: '2026-11-05', status: 'Active', accountLog: [] },
    { id: 'CUS-007', name: 'Carlos Dela Rosa', contactNumber: '0918 555 1107', type: 'Walk-in', registeredAt: '2026-11-04', status: 'Active', accountLog: [] },
    { id: 'CUS-008', name: 'Sofia Villanueva', contactNumber: '0917 555 1108', email: 'sofia.villanueva@example.com', type: 'Portal account', registeredAt: '2026-11-06', status: 'Active', accountLog: [] },
    { id: 'CUS-009', name: 'Grace Tan', contactNumber: '0917 555 1109', email: 'grace.tan@example.com', type: 'Portal account', npcNumber: 'NPC-P-000107', registeredAt: '2023-02-14', status: 'Active', accountLog: [] },
    { id: 'CUS-010', name: 'Mia Fernandez', contactNumber: '0917 555 1110', email: 'mia.fernandez@example.com', type: 'Portal account', npcNumber: 'NPC-P-000105', registeredAt: '2024-02-28', status: 'Active', accountLog: [] },
    { id: 'CUS-011', name: 'Renz Dimacali', contactNumber: '0918 555 1111', type: 'Walk-in', npcNumber: 'NPC-B-000106', registeredAt: '2023-08-08', status: 'Active', accountLog: [] },
    { id: 'CUS-012', name: 'Noel Santiago', contactNumber: '0919 555 1112', type: 'Walk-in', npcNumber: 'NPC-B-000108', registeredAt: '2024-05-21', status: 'Active', accountLog: [] },
    { id: 'CUS-013', name: 'Ivy Ramos', contactNumber: '0917 555 1113', email: 'ivy.ramos@example.com', type: 'Portal account', npcNumber: 'NPC-P-000109', registeredAt: '2024-08-03', status: 'Active', accountLog: [] },
    { id: 'CUS-014', name: 'Marco Villanueva', contactNumber: '0918 555 1114', type: 'Walk-in', npcNumber: 'NPC-B-000110', registeredAt: '2023-12-10', status: 'Active', accountLog: [] },
  ],
  // Order IDs are NPS-<created date>-<sequence for that day>. Customers are not staff members.
  // Orders without a stage are awaiting release (design approval and/or downpayment pending).
  orders: [
    { id: 'NPS-20261106-001', customerId: 'CUS-001', customer: 'Kevin Ong', npcNumber: 'NPC-P-000101', product: 'Sublimation Jersey', pieces: 5, salesPersonId: 'staff-001', createdAt: '2026-11-06T08:10:00.000Z', deadline: '2026-11-10', claimMethod: 'Pick-up', salePrice: 2100, amountPaid: 1050, materialCost: 900, laborCost: 250, claimed: false },
    { id: 'NPS-20261106-002', customerId: 'CUS-002', customer: 'Liza Mercado', npcNumber: 'NPC-B-000102', product: 'Sublimation Polo', pieces: 10, salesPersonId: 'staff-002', createdAt: '2026-11-06T08:20:00.000Z', deadline: '2026-11-12', stage: 'Cutting', claimMethod: 'Pick-up', salePrice: 5200, amountPaid: 2600, materialCost: 1800, laborCost: 500, claimed: false },
    { id: 'NPS-20261106-003', customerId: 'CUS-003', customer: 'Arnel Dizon', npcNumber: 'NPC-P-000103', product: 'Training Shorts', pieces: 20, salesPersonId: 'staff-003', createdAt: '2026-11-06T08:25:00.000Z', deadline: '2026-11-11', stage: 'Printing/Sewing', claimMethod: 'Delivery', salePrice: 6440, amountPaid: 3220, materialCost: 2400, laborCost: 800, claimed: false },
    { id: 'NPS-20261101-001', customerId: 'CUS-004', customer: 'Ana Cruz', npcNumber: 'NPC-B-000104', product: 'Jersey + Shorts Set', pieces: 12, salesPersonId: 'staff-004', createdAt: '2026-11-01T10:00:00.000Z', deadline: '2026-11-04', stage: 'Heat Press', claimMethod: 'Pick-up', salePrice: 6960, amountPaid: 3480, materialCost: 2100, laborCost: 600, claimed: false },
    { id: 'NPS-20261103-001', customerId: 'CUS-005', customer: 'Bea Navarro', product: 'Custom T-Shirt', pieces: 8, salesPersonId: 'staff-001', createdAt: '2026-11-03T11:00:00.000Z', deadline: '2026-11-13', stage: 'Quality Control', claimMethod: 'Pick-up', salePrice: 2800, amountPaid: 1400, materialCost: 1200, laborCost: 400, claimed: false },
    { id: 'NPS-20261105-001', customerId: 'CUS-006', customer: 'Miguel Garcia', product: 'Printed Tote Bag', pieces: 20, salesPersonId: 'staff-002', createdAt: '2026-11-05T13:15:00.000Z', deadline: '2026-11-14', claimMethod: 'Delivery', salePrice: 4320, amountPaid: 0, materialCost: 1600, laborCost: 600, claimed: false },
    { id: 'NPS-20261104-002', customerId: 'CUS-007', customer: 'Carlos Dela Rosa', product: 'Sublimation Jersey', pieces: 5, salesPersonId: 'staff-003', createdAt: '2026-11-04T14:00:00.000Z', deadline: '2026-11-08', stage: 'Quality Control', claimMethod: 'Pick-up', readyAt: '2026-11-06T09:00:00.000Z', salePrice: 2100, amountPaid: 2100, materialCost: 900, laborCost: 250, claimed: false },
    { id: 'NPS-20261102-001', customerId: 'CUS-004', customer: 'Ana Cruz', npcNumber: 'NPC-B-000104', product: 'Sublimation Polo', pieces: 10, salesPersonId: 'staff-003', createdAt: '2026-11-02T15:00:00.000Z', deadline: '2026-11-05', stage: 'Quality Control', claimMethod: 'Delivery', readyAt: '2026-11-05T16:00:00.000Z', salePrice: 5200, amountPaid: 5200, materialCost: 1800, laborCost: 500, claimed: true, completedAt: '2026-11-06T09:30:00.000Z' },
    { id: 'NPS-20261104-001', customerId: 'CUS-001', customer: 'Kevin Ong', npcNumber: 'NPC-P-000101', product: 'Sublimation Jersey', pieces: 2, salesPersonId: 'staff-001', createdAt: '2026-11-04T10:00:00.000Z', deadline: '2026-11-12', stage: 'Quality Control', claimMethod: 'Pick-up', readyAt: '2026-11-04T11:30:00.000Z', salePrice: 840, amountPaid: 840, materialCost: 360, laborCost: 100, claimed: true, completedAt: '2026-11-04T11:55:00.000Z' },
    { id: 'NPS-20261028-001', customerId: 'CUS-005', customer: 'Bea Navarro', product: 'Training Shorts', pieces: 3, salesPersonId: 'staff-002', createdAt: '2026-10-28T10:00:00.000Z', deadline: '2026-11-03', stage: 'Quality Control', claimMethod: 'Delivery', readyAt: '2026-10-29T10:00:00.000Z', salePrice: 840, amountPaid: 840, materialCost: 360, laborCost: 120, claimed: true, completedAt: '2026-10-29T11:55:00.000Z' },
    { id: 'NPS-20261106-004', customerId: 'CUS-008', customer: 'Sofia Villanueva', product: 'Custom T-Shirt', pieces: 4, salesPersonId: 'staff-004', createdAt: '2026-11-06T10:00:00.000Z', deadline: '2026-11-14', stage: 'Quality Control', claimMethod: 'Pick-up', readyAt: '2026-11-06T11:30:00.000Z', salePrice: 1400, amountPaid: 1400, materialCost: 600, laborCost: 200, claimed: true, completedAt: '2026-11-06T11:55:00.000Z' },
    { id: 'NPS-20261106-005', customerId: 'CUS-009', customer: 'Grace Tan', npcNumber: 'NPC-P-000107', product: 'Custom T-Shirt', pieces: 15, salesPersonId: 'staff-004', createdAt: '2026-11-06T11:00:00.000Z', deadline: '2026-11-16', claimMethod: 'Pick-up', salePrice: 5250, amountPaid: 2625, materialCost: 2250, laborCost: 600, claimed: false },
  ],
  // Every order in a production stage has an approved design (BR-03). The other statuses
  // belong to orders still awaiting release.
  designSubmissions: [
    { id: 'DS-001', orderRef: 'NPS-20261106-001', customer: 'Kevin Ong', front: 'designs/DS-001-front.png', back: 'designs/DS-001-back.png', status: 'Under Review' },
    { id: 'DS-002', orderRef: 'NPS-20261106-005', customer: 'Grace Tan', front: 'designs/DS-002-front.png', back: 'designs/DS-002-back.png', status: 'Under Review' },
    { id: 'DS-003', orderRef: 'NPS-20261105-001', customer: 'Miguel Garcia', front: 'designs/DS-003-front.png', status: 'Revision Required', note: 'Please enlarge the front emblem.' },
    { id: 'DS-004', orderRef: 'NPS-20261106-003', customer: 'Arnel Dizon', front: 'designs/DS-004-front.png', back: 'designs/DS-004-back.png', status: 'Approved', note: 'Approved by customer.' },
    { id: 'DS-005', orderRef: 'NPS-20261102-001', customer: 'Ana Cruz', front: 'designs/DS-005-front.png', status: 'Approved' },
    { id: 'DS-006', orderRef: 'NPS-20261106-004', customer: 'Sofia Villanueva', front: 'designs/DS-006-front.png', back: 'designs/DS-006-back.png', status: 'Approved' },
  ],
  // NPC-P = enrolled through the Customer Portal; NPC-B = enrolled at the Billing System counter.
  // Each tier matches the points thresholds in config (Silver 20, Gold 50, Platinum 100).
  // Sample data: openingPoints are points earned before the order history in this demo, so every tier
  // can be shown. points = openingPoints + 1 per full ₱1,000 paid on each order shown. A live system starts at 0.
  members: [
    { npcNumber: 'NPC-P-000101', name: 'Kevin Ong', tier: 'Bronze', points: 12, openingPoints: 11, joinedAt: '2025-03-12' },
    { npcNumber: 'NPC-B-000102', name: 'Liza Mercado', tier: 'Silver', points: 46, openingPoints: 44, joinedAt: '2024-11-03' },
    { npcNumber: 'NPC-P-000103', name: 'Arnel Dizon', tier: 'Gold', points: 78, openingPoints: 75, joinedAt: '2023-08-22' },
    { npcNumber: 'NPC-B-000104', name: 'Ana Cruz', tier: 'Platinum', points: 305, openingPoints: 297, joinedAt: '2022-05-17' },
    { npcNumber: 'NPC-P-000105', name: 'Mia Fernandez', tier: 'Silver', points: 32, openingPoints: 32, joinedAt: '2024-02-28' },
    { npcNumber: 'NPC-B-000106', name: 'Renz Dimacali', tier: 'Gold', points: 64, openingPoints: 64, joinedAt: '2023-08-08' },
    { npcNumber: 'NPC-P-000107', name: 'Grace Tan', tier: 'Platinum', points: 190, openingPoints: 188, joinedAt: '2023-02-14' },
    { npcNumber: 'NPC-B-000108', name: 'Noel Santiago', tier: 'Bronze', points: 8, openingPoints: 8, joinedAt: '2024-05-21' },
    { npcNumber: 'NPC-P-000109', name: 'Ivy Ramos', tier: 'Silver', points: 27, openingPoints: 27, joinedAt: '2024-08-03' },
    { npcNumber: 'NPC-B-000110', name: 'Marco Villanueva', tier: 'Gold', points: 91, openingPoints: 91, joinedAt: '2023-12-10' },
  ],
  commissionPayouts: [
    { id: 'COM-008', salesPersonId: 'staff-003', orderId: 'NPS-20261102-001', pieces: 10, amount: 200, status: 'Unpaid', postedAt: '2026-11-06T09:35:00.000Z' },
    { id: 'COM-009', salesPersonId: 'staff-001', orderId: 'NPS-20261104-001', pieces: 2, amount: 40, status: 'Unpaid', postedAt: '2026-11-04T12:00:00.000Z' },
    { id: 'COM-010', salesPersonId: 'staff-002', orderId: 'NPS-20261028-001', pieces: 3, amount: 60, status: 'Unpaid', postedAt: '2026-10-29T12:00:00.000Z' },
    { id: 'COM-011', salesPersonId: 'staff-004', orderId: 'NPS-20261106-004', pieces: 4, amount: 80, status: 'Unpaid', postedAt: '2026-11-06T12:00:00.000Z' },
  ],
  pricingRules: structuredClone(pricingPlaceholders),
  scheduledPricing: null,
  pricingHistory: [],
  recommendations: [
    {
      id: 'REC-001',
      kind: 'Reorder',
      subject: 'White Polyester Jersey Fabric',
      suggestion: 'Reorder 17 pcs.',
      basis: 'Current stock 22 is at or below reorder point 30; typical usage is 4.5 pcs per week over the last 28 days, reordered to cover 2 weeks above the reorder point.',
      status: 'Pending',
      materialId: 'jersey-fabric-white',
      reorderQty: 17,
    },
    {
      id: 'REC-002',
      kind: 'Reorder',
      subject: 'Sublimation Polo Blanks',
      suggestion: 'Reorder 18 pcs.',
      basis: 'Current stock 18 is at or below reorder point 30; typical usage is 3 pcs per week over the last 28 days, reordered to cover 2 weeks above the reorder point.',
      status: 'Pending',
      materialId: 'polo-blanks',
      reorderQty: 18,
    },
    {
      id: 'REC-003',
      kind: 'Pricing',
      subject: 'Custom T-Shirt',
      suggestion: 'Change markup from 40% to 45% (price ₱350.00 → ₱362.50).',
      basis: 'High demand: 27 pieces sold in the last 30 days (threshold 20).',
      status: 'Pending',
      pricingUpdate: { product: 'Custom T-Shirt', markupPercent: 45 },
    },
  ],
  membershipTierCorrections: [],
  membershipPointsAdjustments: [],
  releasedOrderIds: [
    'NPS-20261106-002',
    'NPS-20261106-003',
    'NPS-20261101-001',
    'NPS-20261103-001',
    'NPS-20261104-002',
    'NPS-20261102-001',
    'NPS-20261104-001',
    'NPS-20261028-001',
    'NPS-20261106-004',
  ],
}
