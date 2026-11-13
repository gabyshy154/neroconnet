# NeroConnect Admin Portal: Build Spec

Back-office dashboard for Nero Printing Services and Trading. Front-end mockup only: no backend, no real payments. State lives in a client store with seed data. It runs on the shop's local network (left sidebar, data-dense layout).

## 1. Hard rules (never break these)
- Brand is "NeroConnect". Never write "POS".
- Payments are recorded by staff only. No GCash/bank/card processing UI.
- No VAT, no service fee.
- QR codes only. No camera, scanner, barcode, or face recognition. Code fields are labeled "QR Code / Number".
- Wording: "NPC = Nero Privilege Card" and "Membership". Never "Loyalty".
- Sidebar item is "Recommendations" (never "AI Recommendations"). Recommendations are rule-based and labeled "input-based estimates, not predictive forecasting."
- Currency is ₱, formatted like ₱1,250.00. Single shop. Web app.
- Production stages: 1 Cutting, 2 Printing/Sewing, 3 Heat Press, 4 Quality Control. (Default: "Finishing" in the module text = "Heat Press".)

## 2. Look and feel
Sage/olive accent, near-black text, off-white background. Left sidebar: Dashboard, Inventory, Recommendations, Reports & Analytics, Employees, Cost & Profit, Commission, Membership, plus Design Review and Pricing Rules. Status colors: green = ok, amber = warning, red = alert. Every screen has empty, error, and success states. Accessible: labels, focus states, color never the only signal.

## 3. Data model (TypeScript)
```ts
type Role = 'Admin' | 'Manager' | 'Sales Person' | 'Production Staff'
type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
type Stage = 'Cutting' | 'Printing/Sewing' | 'Heat Press' | 'Quality Control'
interface Material { id: string; name: string; unit: string; stock: number; reorderPoint: number; unitCost: number; sizeStock?: Record<string, number> }
interface InventoryMovement { id: string; materialId: string; type: 'In' | 'Out'; qty: number; reason: string; orderId?: string; at: string }
interface PricingRules {
  productPrices: Record<string, number>
  membershipDiscount: Record<Tier, number>   // 3, 5, 8, 10 %
  volumeDiscounts: { minPieces: number; percent: number }[]   // placeholder
  rushPercent: number                         // placeholder
  creditCharge: { 15: number; 30: number }    // 20, 30 %
}
interface Employee { id: string; name: string; role: Role; team?: string; schedule: string[]; status: 'Pending' | 'Active' | 'Inactive' }
interface DesignSubmission { id: string; orderRef: string; customer: string; source: 'Client Design' | 'Nero Design'; front: string; back?: string; status: 'Draft' | 'Under Review' | 'Revision Required' | 'Approved'; note?: string }
interface AdminOrder { id: string; customer: string; pieces: number; salesPersonId: string; teamId?: string; scheduleStart?: string; deadline: string; stage?: Stage; salePrice: number; materialCost: number; laborCost: number; claimed: boolean }
interface CommissionPayout { id: string; salesPersonId: string; orderId: string; pieces: number; amount: number; status: 'Unpaid' | 'Paid'; paidAt?: string }
interface Member { npcNumber: string; name: string; tier: Tier; points: number; joinedAt: string }
interface Recommendation { id: string; kind: 'Reorder' | 'Pricing'; subject: string; suggestion: string; basis: string; status: 'Pending' | 'Approved' | 'Rejected' }
```

## 4. Business logic (pure functions in src/lib, rates in src/config.ts, with Vitest tests)
- **Inventory:** confirming an order deducts required materials. Every deduction/addition writes an InventoryMovement. Low stock = stock <= reorderPoint, which raises a banner and a dashboard alert.
- **Material yield (estimate):** yield = usable material per unit / consumption per piece; waste % shown. Use sample consumption values from config (placeholder).
- **Recommendations (module logic):** if any material is low, generate Reorder suggestions (reorder qty = target stock − current stock). Otherwise generate Pricing suggestions. Admin must Approve or Reject each. Approving a pricing suggestion updates Pricing Rules. Approving a reorder logs an "In" movement as pending purchase (mock).
- **Reports:** daily/weekly/monthly sales aggregation, exportable to CSV. Include a "Demand estimate" section labeled "input-based estimate from past sales, not predictive forecasting." (Default: keep the module's term "demand estimate".)
- **Cost & Profit:** production cost = materialCost + laborCost. Gross profit = salePrice − production cost. Net profit = gross profit − commission − other expenses (placeholder config). Roll up per order and in total.
- **Commission:** ₱20 per piece, created when an order is claimed and fully paid. Per Sales Person totals, Today / This Week, "Mark as paid" sets status Paid with timestamp.
- **Membership (oversight only, no enrollment):** list with tier, points, join date, search, manual tier correction (logged). Points = floor(paid / 1000).
- **Employees / Create Employee flow:** one Employees screen with tabs for Staff List, Schedule, Order Assignment, Roles & Permissions, and Create Employee. Create account, assign role, team, and schedule, validate (required fields, unique name, valid schedule), store, then activate. Status goes Pending then Active. Roles: Admin, Manager, Sales Person, Production Staff only.
- **My Schedule:** when viewing as a seeded employee, show that employee's shifts, team, and assigned orders with deadlines, stages, and an Overdue label. This view is read-only.
- **Notifications:** derive rule-based notifications from store state. Admin/Manager receive low-stock, designs under review, overdue-order, and pending-employee notifications. Employees receive new team/schedule assignment notifications and notifications for deadlines on their assigned orders. Store read state persistently; support marking one or all as read. No email, SMS, or push.
- **Dev menu / View as:** provide Admin, Manager, and every seeded employee as selectable views. Persist the selection. An employee sees only My Schedule and Notifications in the sidebar; Admin and Manager use the full admin navigation.
- **Design Review:** queue of submitted T-shirt designs with front/back preview. Approve or Request Revision (note required). Applies to every order with a custom design (Default).
- **Pricing Rules:** edit product prices, membership discounts, volume discounts, rush %, credit-term %. This is the source of the Billing System's locked prices. Validate: numbers >= 0, percents <= 100.

## 5. Screens
1. Dashboard: today's sales, active orders, low-stock alerts, total NPC members, sales trend chart.
2. Inventory: size-by-quantity stock matrix, low-stock banners, yield estimate, in/out log ("QR / number-based").
3. Recommendations: Reorder / Pricing lists with Approve / Reject.
4. Reports & Analytics: period toggle, sales table + chart, demand estimate, CSV export.
5. Employees: tabs for Staff List, Schedule, Order Assignment, Roles & Permissions, and Create Employee.
6. Cost & Profit.
7. Commission.
8. Membership.
9. My Schedule (employee view only).
10. Notifications.
11. Design Review.
12. Pricing Rules.

## 6. Seed data (src/data/seed.ts)
8 materials (2 below reorder point), ~20 inventory movements, 10 employees, 12 orders across stages and dates (some claimed, some overdue), 6 design submissions across all statuses, 10 members across tiers, commission entries across this week and last week, pricing rules matching the Billing System, and a few recommendations. Sample values only.

## 7. How to build
1. Audit existing code vs this spec, report, wait for go-ahead.
2. Order: types + config, admin.ts logic + tests, seed + store (localStorage), then screens in groups, then final checklist.
3. After each step run typecheck, tests, build.
4. No backend, no real payments.

## 8. Acceptance checklist
- [ ] Sidebar says "Recommendations"; no "AI", "POS", "Loyalty", barcode, camera, scanner, VAT.
- [ ] Reorder suggestions only when stock is low; pricing suggestions otherwise; each needs Approve.
- [ ] Inventory deduction on order confirm, with movement log and low-stock banner.
- [ ] Commission exactly ₱20 per piece; "Mark as paid" works.
- [ ] Cost & Profit math is consistent with sale price and commission.
- [ ] Design Review Approve / Request Revision (note required) updates status.
- [ ] Pricing Rules validated and used by Recommendations.
- [ ] Create Employee follows create, assign, validate, store, activate.
- [ ] Membership has no enrollment, with logged manual tier correction.

## 9. Still to confirm
Real price list and material costs, volume/rush percentages, credit-term percentages (+20% / +30%) with Mr. Losaynon, other-expense assumptions, and whether design approval applies to all orders or only T-shirts.