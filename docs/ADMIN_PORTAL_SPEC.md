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
Sage/olive accent, near-black text, off-white background. Left sidebar: Dashboard, Inventory, Recommendations, Reports & Analytics, User Management, Cost & Profit, Commission, Membership, plus Design Review and Pricing Rules. Status colors: green = ok, amber = warning, red = alert. Every screen has empty, error, and success states. Accessible: labels, focus states, color never the only signal.

## 3. Data model (TypeScript)
```ts
type ViewAs = 'Admin' | `employee:${string}`
type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
type Stage = 'Cutting' | 'Printing/Sewing' | 'Heat Press' | 'Quality Control'
interface Material { id: string; name: string; unit: string; stock: number; reorderPoint: number; unitCost: number; sizeStock?: Record<string, number> }
interface InventoryMovement { id: string; materialId: string; type: 'In' | 'Out'; qty: number; reason: string; orderId?: string; reference?: string; at: string }
interface ProductCost { materialCost: number; laborCost: number; overheadCost: number; markupPercent: number }   // Formula 2
interface PricingRules {
  productCosts: Record<string, ProductCost>  // selling price = (material + labor + overhead) x (1 + markup)
  membershipDiscount: Record<Tier, number>   // 3, 5, 8, 10 %
  volumeDiscounts: { minPieces: number; percent: number }[]   // placeholder
  rushPercent: number                         // 15 % (SRS REQ-4.9-04)
  creditCharge: { 15: number; 30: number }    // 20, 30 %
  screenPrint: { setupFeePerColor: number; perColorPerPiece: number; perSquareInchPerPiece: number }   // placeholder
  storageFee: { graceDays: number; percentPerWeek: number }   // 7 days, 5 %/week
  latePaymentPenalty: { percentPer30Days: number }            // 2.5 %
}
interface Employee { id: string; name: string; jobTitle?: string /* free text, label only */; team?: string; schedule: string[]; status: 'Pending' | 'Active' | 'Inactive'; account?: UserAccount }
interface UserAccount { email: string; contactNumber: string; credential: 'Invite' | 'Password'; accountRole: 'Employee' | 'Admin'; tags: ('Sales' | 'Production')[]; permissions: Record<ModuleId, 'none' | 'view' | 'edit'>; updatedAt: string }
interface DesignSubmission { id: string; orderRef: string; customer: string; front: string; back?: string; status: 'Under Review' | 'Revision Required' | 'Approved'; note?: string }
interface AdminOrder { id: string; customer: string; npcNumber?: string; product: string; pieces: number; salesPersonId: string; createdAt: string; teamId?: string; deadline: string; stage?: Stage; claimMethod?: 'Pick-up' | 'Delivery'; readyAt?: string; salePrice: number; amountPaid: number; materialCost: number; laborCost: number; claimed: boolean; completedAt?: string }
// Order status: Awaiting Release -> In Production -> Ready for Pickup / Ready for Delivery -> Claimed. Order IDs are NPS-<created YYYYMMDD>-<daily sequence>.
interface CommissionPayout { id: string; salesPersonId: string; orderId: string; pieces: number; amount: number; status: 'Unpaid' | 'Paid'; paidAt?: string }
interface Member { npcNumber: string; name: string; tier: Tier; points: number; joinedAt: string }   // NPC-P-###### (Customer Portal) or NPC-B-###### (Billing System)
interface MembershipPointsAdjustment { id: string; npcNumber: string; fromPoints: number; toPoints: number; reason: string; at: string }
interface Recommendation { id: string; kind: 'Reorder' | 'Pricing'; subject: string; suggestion: string; basis: string; status: 'Pending' | 'Reviewed'; reviewedAt?: string; materialId?: string; reorderQty?: number; pricingUpdate?: { product: string; markupPercent: number } }
```

## 4. Business logic (pure functions in src/lib, rates in src/config.ts, with Vitest tests)
- **Inventory:** materials are deducted only when an order is released for production (BR-07), which requires every design for the order to be Approved (BR-03) and a recorded downpayment; release moves the order to Cutting. Every deduction/addition writes an InventoryMovement. The Inventory screen records manual stock in/out (supplier deliveries, damage, count corrections) with a reason and an optional QR Code / Number (REQ-4.12-04). Low stock = stock <= reorderPoint, which raises a banner and a dashboard alert.
- **Material yield (estimate):** yield = usable material per unit / consumption per piece; waste % shown. Use sample consumption values from config (placeholder).
- **Recommendations (module logic, Figure 8 step 5):** generate Reorder alerts for low-stock materials and Pricing alerts in every case. Reorder qty = ceil(average weekly stock-out over the last 28 days × 2 weeks) + reorder point − stock; with no usage history, target stock − stock. Pricing suggestions come from pieces sold in the last 30 days (paid orders): ≥ 20 pieces raises markup 5 points, ≤ 5 pieces lowers it 5 points (sample thresholds in config). All recommendations are alerts only (BR-11): they never change stock or prices and are only marked Reviewed. If the admin agrees, they record the delivery in Inventory (stock in) or adjust prices in Pricing Rules (scheduled). Low-stock notifications include the suggested reorder quantity; pricing alerts also appear in Notifications. Generating again skips anything still waiting for review.
- **Reports (REQ-4.16):** Sales, Inventory, Production, Membership, and Commission reports; Daily / Weekly / Monthly or a custom From–To date range; viewed on screen (no CSV download). The Sales report includes a "Demand by product" table (pieces sold, orders, share of pieces per product, from orders with a payment recorded), labeled "input-based estimate from past sales, not predictive forecasting". It uses the same rule as the pricing alerts, so both agree.
- **Cost & Profit:** only completed orders (claimed and paid in full, REQ-4.17), grouped Daily / Weekly / Monthly by completedAt. Production cost = materialCost + laborCost. Gross profit = salePrice − production cost (REQ-4.17). No net profit: it would need overhead (rent, utilities) the system does not track. Commission is shown for reference. Roll up per order and in total.
- **Commission:** ₱20 per piece, created when an order is claimed and fully paid. Per Sales Person totals, Today / This Week, "Mark as paid" sets status Paid with timestamp.
- **Membership (oversight only, no enrollment):** list with tier, points, join date, search, manual tier correction and manual points adjustment with a required reason (both logged, REQ-4.8-08). Points are credited by the order's NPC number, never by name: each payment adds the whole ₱1,000 marks it newly crosses for that order. Tiers are reached by points (REQ-4.8-06): Silver 20, Gold 50, Platinum 100 (sample thresholds in `tierPointThresholds`; Gold at 50 matches the Customer Portal wireframe). Reaching a threshold upgrades the member automatically and logs it as "Points threshold reached"; tiers never drop automatically. The Membership list shows points needed for the next tier.
- **User Management:** one User Management screen (sidebar) with tabs for Staff, Customers, and Order Assignment. **Staff** merges the staff list and user accounts: name, role and tags, team, schedule, status, last updated; Add User, Edit, Activate (Pending), Deactivate/Reactivate. **Customers** lists customer records (USERS with user_type = customer): portal accounts and walk-ins, contact details, NPC tier and number or "Not enrolled", orders, total paid, last order, and order history. It is view-only except deactivating/reactivating a portal login with a required, logged reason (data-privacy requests); customers edit their own details in the Customer Portal and NPC enrollment stays in the Customer Portal and Billing System. For data-privacy requests, portal accounts are Deactivated (login disabled) and walk-in customers are Blocked (record not used for new orders or NPC lookups); both need a logged reason and can be reversed. Records are kept for retention. Members carry a sample `openingPoints` balance (points earned before the demo's order history); points = openingPoints + 1 per full ₱1,000 paid on each order shown. A live system starts at 0. **Order Assignment** (Fig 7 step 2) assigns a production team to each active order; the order's deadline is its schedule (TASKS.due_date), so there is no start time. Membership remains its own screen. Staff have an optional free-text **job title** (40 characters max, a label only; Sales Persons are found by the Sales tag, never by title). Staff user management has a user list (name, role, status, last updated; Add User, Edit, Deactivate/Reactivate) and Add/Edit User pages sharing one layout: full name, email, contact number, invite or password (never stored), role (Employee, Admin), optional tags (Sales, Production), work schedule, production team (required when tagged Production), and a module permissions grid (No access / View only / View and edit) for Order Entry/Billing System, Quotation & Billing, Payment Recording, NPC Membership, Pricing Rules, Order Lifecycle Tracking, Design Review, Inventory, User Management, Sales Commission, Reports & Analytics, Business Recommendations. Role and tags pre-fill defaults the admin can change. Admin accounts are always View and edit on every module and cannot be restricted; the last active Admin cannot be deactivated or demoted. New users go Pending, then Active from Staff List. Screen access follows these permissions: Dashboard, Reports & Analytics, and Cost & Profit use Reports & Analytics; Commission uses Sales Commission; Membership uses NPC Membership.
- **My Schedule:** when viewing as a seeded employee, show that employee's shifts, team, and assigned orders with deadlines, stages, and an Overdue label. This view is read-only.
- **Notifications:** derive rule-based notifications from store state, by module access (REQ-4.13-08). Low-stock (with the suggested reorder quantity) goes to anyone with Inventory access; designs under review to Design Review access; pricing alerts to Business Recommendations access; overdue orders and pending employees to User Management access. The Admin gets all of them. Employees also get their own team assignments and assigned-order deadlines. Store read state persistently; support marking one or all as read. No email, SMS, or push.
- **Dev menu / View as:** provide the Admin and every seeded employee as selectable views. Persist the selection. There is no Manager role: a manager is an Employee with a free-text job title and wider module access. An employee's sidebar shows My Schedule, Notifications, and every admin screen whose module they can access; View only shows the screen with a banner and every action button disabled (view and download buttons stay enabled). An employee viewing Commission sees only their own commission.
- **Design Review:** queue of submitted T-shirt designs with front/back preview. Approve or Request Revision (note required). Applies to every order with a custom design (Default).
- **Order lifecycle:** an order in Quality Control is marked ready (User Management → Order Assignment) and becomes Ready for Pickup or Ready for Delivery (REQ-4.11-06). An order can be claimed only when ready; it is completed (completedAt) once it is both claimed and paid in full, which also creates the commission.
- **Pricing Rules:** edit Formula 2 inputs per product (material, labor, overhead, markup %) with the computed selling price; add a new product by name (unique, 40 characters max), which starts with empty costs and goes live only through the scheduled change (only products not yet in effect can be removed; a ₱0.00 price is rejected); screen-print charges (setup per color, per color per piece, per square inch per piece) with a job preview, membership discounts, volume discounts, rush %, credit-term %, storage fee (grace days, % per week), and late-payment penalty (% per 30 days). The computed prices are the source of the Billing System's locked prices. Validate: numbers >= 0, percents <= 100, grace days a whole number.
- **Scheduled price changes:** a pricing change never applies immediately. Saving schedules it with an effective time, by default the start of the next day and never less than 10 minutes ahead (`pricingChangeLeadMinutes`, longer than the 5-minute API Bridge sync). Only one change is pending; further edits join it. A quotation or order is priced with the rules in effect when it is created (`pricingRulesAt`) and keeps that price. The admin can cancel a pending change. Every applied change is kept in a price change history with what it changed.

## 5. Screens
1. Dashboard: today's sales, active orders, low-stock alerts, total NPC members, sales trend chart.
2. Inventory: size-by-quantity stock matrix, low-stock banners, yield estimate, in/out log ("QR / number-based").
3. Recommendations: Reorder alerts and Pricing alerts, each marked as reviewed.
4. Reports & Analytics: report type tabs, period toggle or custom range, tables, sales chart, demand by product.
5. User Management: tabs for Staff (Add User, Edit User), Customers, and Order Assignment.
6. Cost & Profit.
7. Commission.
8. Membership.
9. My Schedule (employee view only).
10. Notifications.
11. Design Review.
12. Pricing Rules.

## 6. Seed data (src/data/seed.ts)
8 materials (2 below reorder point), ~20 inventory movements, 10 employees, 12 orders across stages and dates (some claimed, some overdue, some awaiting release), 6 design submissions across Under Review, Revision Required, and Approved (drafts stay in the Customer Portal, REQ-4.3-07; only orders awaiting release have non-approved designs), 10 members across tiers (customers never share a name with staff), commission entries across this week and last week, pricing rules matching the Billing System, and a few recommendations. Sample values only.

## 7. How to build
1. Audit existing code vs this spec, report, wait for go-ahead.
2. Order: types + config, admin.ts logic + tests, seed + store (localStorage), then screens in groups, then final checklist.
3. After each step run typecheck, tests, build.
4. No backend, no real payments.

## 8. Acceptance checklist
- [ ] Sidebar says "Recommendations"; no "AI", "POS", "Loyalty", barcode, camera, scanner, VAT.
- [ ] Reorder alerts when stock is low and pricing alerts in every case; review only, never change stock or prices.
- [ ] Inventory deduction only on release for production (approved design + downpayment), with movement log and low-stock banner; manual stock in/out recorded.
- [ ] Commission exactly ₱20 per piece; "Mark as paid" works.
- [ ] Cost & Profit covers completed orders only, by period, and its math is consistent with sale price and commission.
- [ ] Reports cover sales, inventory, production, membership, and commission with a custom date range.
- [ ] Design Review Approve / Request Revision (note required) updates status.
- [ ] Pricing Rules validated and used by Recommendations.
- [ ] Add User follows create, assign, validate, store, activate; Edit User changes role/permissions without recreating; Admin access cannot be restricted.
- [ ] Membership has no enrollment, with logged manual tier correction and points adjustment.

## 9. Still to confirm
Real price list and material costs, volume/rush percentages, credit-term percentages (+20% / +30%) with Mr. Losaynon, other-expense assumptions, and whether design approval applies to all orders or only T-shirts.