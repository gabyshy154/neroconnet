# NeroConnect

A capstone project for **Nero Printing Services and Trading** (Mandaue City, Cebu): a custom apparel printing system made of three connected web interfaces. All three are **front-end mockups**. There is no backend and no real payment processing. Each keeps its state in a client store with seed data, and synchronization between them is simulated.

*Design summary last updated: November 18, 2026.*

## Repository layout

This repository has one branch per system. Each branch is a separate project with its own history.

| Branch | System | Where it runs |
|---|---|---|
| `customer-portal` | Customer Portal | Cloud-hosted |
| `billing-system` | Billing System (counter and production floor) | Shop's local network |
| `admin-portal` | Admin Portal (back office) | Shop's local network |

`main` contains only this README.

### Run a system locally

```
git clone https://github.com/gabyshy154/neroconnet.git
cd neroconnet
git checkout admin-portal        # or billing-system, customer-portal
corepack pnpm install
npm run dev                      # opens on http://localhost:8443
```

Tests and checks: `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm build`. The projects use pnpm lockfiles, so use `pnpm` for installs. After any dependency change, make sure `react` and `react-dom` have identical versions.

## How the three systems connect

The Customer Portal is cloud-hosted. The Billing System and Admin Portal run on the shop's local network and sync with the portal through the **API Bridge**, so the shop keeps working during an internet outage and queues transactions until the connection returns. In the mockups the bridge is simulated.

| From | To | What |
|---|---|---|
| Portal Customization | Portal Quotation | Item specs and quantity |
| Portal 3D Mockup | Admin Design Review | Submitted designs |
| Admin Design Review | Portal 3D Mockup | Approved or Revision Required |
| Admin Pricing Rules | Portal Quotation and Billing | Prices and discounts |
| Portal Quotation (confirmed) | Billing System, Admin | Order and Order ID |
| Billing payment | Portal Membership | Points and tier progress |
| Billing production scan or board | Portal Order Tracking | Current production stage |
| Order confirmed | Admin Inventory | Material deduction and low-stock alert |
| Completed sale (claimed and fully paid) | Admin Commission, Cost & Profit | ₱20 per piece and profit |

## Shared rules

These apply to all three interfaces.

- **Payments are recorded by staff and never processed online.** GCash and Bank Transfer appear only as recorded payment-method labels. There is no gateway integration.
- **No VAT and no service fee.**
- **Pricing** is shown as ₱ per piece plus an estimated total, with no base price line. Currency is formatted like `₱1,250.00`.
- **QR codes only, no barcodes.** Camera use is limited to production scanning, described below.
  - **NPC membership** lookup and walk-in enrollment are **manual entry only**. Staff type the number into a "QR Code / Number" field. No camera and no scanner.
  - **Order Lifecycle Tracking** uses each order's QR code with the **staff member's own phone camera app** (see Billing System). The web app has no in-page camera and no scanning library.
- The 3D preview is **T-shirts only**, with no AR.
- Web app, single shop location.
- Wording: **NPC = Nero Privilege Card** and "Membership" (never "Loyalty"). The Billing System is called **"NeroConnect"** (never "POS").
- Recommendations and demand estimates are **rule-based**, not AI or predictive, and are labeled "input-based estimates, not predictive forecasting."
- Production stages, in order: **Cutting, Printing/Sewing, Heat Press, Quality Control.** "Finishing" in the original module text means Heat Press.
- Brand look: minimal and warm-neutral, with a sage/olive accent, near-black text, and an off-white background. The portal is airy, the Billing System is denser with large tap targets, and the Admin Portal is a data-dense dashboard with a left sidebar.

## 1. Customer Portal (cloud)

**Branch:** `customer-portal`

**Stack:** React 19, Vite, TypeScript, Tailwind v4, `three` and `@react-three/fiber`. State is held in React state in `App.tsx` (no store, no persistence). Pricing, discount, validity, and membership sample values live in `src/config.ts`, and no component keeps its own copy of them.

**Pages:** Home, Login/Register, All Items, Size Guide, Customization, 3D Mockup, Quotation, Order Tracking, Membership, About, Contact, and the Octavia chatbot.

- **Browse, Customization, Size Guide:** customers pick a product, material, printing type, print zone, and sizes. In the Zone / Quantity step, sizes are chosen from one size dropdown with a quantity field and an "Add size" button. Added sizes appear in a size breakdown list (adding a size that is already listed increases its quantity) with a running total of pieces. "Add to Quotation" requires login.
- **3D Mockup:** T-shirt only, with front and back previews and separate designs per side. Logged-out users can preview but not submit. "Submit for Quotation" sends the design to Nero. Review states are Draft, Under Review, Revision Required, and Approved, with a Design Source badge (Client Design or Nero Design). Before the first submission, a logged-in customer must save contact and address details (see Contact & Address below). When a design reaches Approved, customers who are not yet NPC members are offered enrollment before they continue to the quotation (see Membership). Needs `three` and `@react-three/fiber` (version 8 for React 18, version 9 for React 19).
- **Quotation:** the pricing engine applies the membership discount, volume discount, and rush surcharge only where they apply, using the rates in `src/config.ts`. Unit prices show the amount only, with no "per piece" suffix, and every numeric column and summary line is right-aligned. It includes Schedule/Deadline (the production deadline), Claim Method, and Payment Terms (50/50, full payment, or 15/30-day credit with 20% and 30% added). Two separate dates are shown: **Quotation valid until** (issue date plus `QUOTATION_VALIDITY_DAYS`) and **Payment due by** (based on the selected terms; for 15/30-day credit the balance is due after the claim date). A Billing Statement preview before the downpayment shows these same dates and uses one numbering style: a numbered "No." column for line items, numbered sections, and one order-reference format (`NPS-YYYYMMDD-NNN`) generated by a single helper. For NPC members it also shows the NPC number, tier, valid-until date, and the discount applied. An expired card shows "Membership expired" and no member discount. Terms and Conditions are included. If the customer has not yet saved contact details, the form appears before the order can be confirmed. For Delivery, the saved address is shown and can be edited there. The customer reviews the quotation and confirms the order. The final screen is "Order Confirmed" with a PDF invoice.
  - **There is no e-signature and no admin approval step on the quotation.** The only admin approval in the portal flow is Design Review.
- **Order Tracking:** shows production stage, claim method, deadline, and payment terms. Past orders have Reorder / Clone.
- **Membership:** tier and discount (Bronze free 3%, Silver ₱50 5%, Gold ₱80 8%, Platinum ₱100 10%), a points balance (1 point per ₱1,000), and a downloadable QR code that encodes only the customer's NPC number. The card shows the NPC number, tier, and a valid-until date (12 months from enrollment). Customers who are not yet members see the enrollment offer instead of a card and QR. Everyone starts at Bronze with a generated `NPC-NNNNNN` number, whether they enroll from the offer after design approval or later from this page. Declining the offer continues the order as a regular customer with no member discount. The demo login is a Silver member (`NPC-000101`, enrolled March 1, 2026, valid until March 1, 2027). Newly registered users start as non-members. Membership is held on the user object in `App.tsx`, and the Quotation and Membership pages both read it from there.
- **Octavia:** a "New here? Let Octavia help" trigger for first-time customers. Returning customers see "Welcome back."

- **Contact & Address:** a reusable form (full name, mobile, email, street, barangay, city or municipality, and an optional province) with inline validation for Philippine mobile formats (`09XXXXXXXXX` or `+639XXXXXXXXX`) and email. It is required once, before the first design submission or order confirmation, then prefilled and editable from a small summary. Pick-up does not need an address.
- **Contact page:** contact form, shop info, and opening hours. The map was removed.

**Remaining portal gaps:** none known against the module list. Octavia, the Order Confirmed PDF invoice, and Order Tracking remain mockup-level.

## 2. Billing System (local, counter and production floor)

**Branch:** `billing-system`

**Stack:** React, Vite, Tailwind v4, Zustand (localStorage persistence), Vitest, and `qrcode.react` (QR generation only). Business rules live in `src/lib/billing.ts`, rates in `src/config.ts`, and demo data in `src/data/seed.ts`. The full spec is `docs/BILLING_SYSTEM_SPEC.md`.

**Screens:**
1. **Walk-in Order Entry:** customer lookup with quick-add (PH phone validation, duplicate-phone warning). Price Per Piece is locked from Product Type. Rush and 15/30-day credit options, a live itemized pricing breakdown, and a required Sales Person. New orders start at "Pending Downpayment."
2. **NPC Lookup / Enrollment:** one "QR Code / Number" field, manual entry only. Enrollment is for customers with no NPC number only (Yes/No, auto-Bronze, `NPC-NNNNNN`). An offline notice appears when offline.
3. **Billing:** 50% downpayment suggestion, invalid amounts rejected, a cash confirm step, payment history, an Official Receipt toggle, and a live balance and payment status.
4. **Order Lifecycle board:** four numbered columns, plus a "Waiting for downpayment" list. One stage at a time, a QR image on each card, and a red "Overdue" label.
5. **Production Scan page** (route `/scan/<OrderID>`, phone-first): see below.
6. **Commission:** ₱20 per piece, only for orders that are Claimed and Paid in Full, with a Today / This Week toggle.
7. **Claim Method:** Pick-up or Delivery, Order ID shown, delivery address required for delivery. Release is blocked while a balance remains unless a credit term applies.
8. **Order Management:** search by Order ID, name, phone, or NPC number. Filters, sortable columns, and a detail drawer with payment and production history.

**Production Scan (phone camera app and scan link):**
1. Each confirmed order gets **one QR code** that encodes a link to the order's scan page, for example `https://neroconnect.local/scan/NPS-20261106-002`. The code never changes. Only the stage changes.
2. Staff point their **phone's normal camera** at the QR. The phone offers to open the link.
3. The link opens the NeroConnect scan page in the phone's browser and shows the order. Staff sign in first if needed, then return to the same page. The staff member's station (Cutting, Printing/Sewing, Heat Press, or Quality Control) is chosen once and remembered on the phone.
4. The system verifies that the order is **waiting at that station**, records the **staff member and time**, and the staff member taps **"Mark done"** to advance the order one stage.
5. Blocked with a clear message: wrong station, unknown order, downpayment not recorded, and finished orders.
6. Fallbacks and demo: a manual "QR Code / Number" field (also works with a handheld scanner that types into it) and a "Simulate scan" button that opens the scan page without a phone.

**Other behavior:** a Dev menu holds the Online/Offline toggle and "Reset demo data." Offline writes, including stage advances, are queued, persisted, and replayed in order on reconnect. The seed has 11 orders (`NPS-20261106-001` to `011`), including 3 to 4 claimed orders so the commission toggle shows different results.

**Status:** all screens except the Production Scan page were built and passed their acceptance checklist against the earlier spec. The Production Scan page is being updated to the phone-camera-app design above, which removes any in-page camera scanner. Check the branch's `docs/BILLING_SYSTEM_SPEC.md` acceptance checklist for current status.

**Limits to state in the paper:**
- The mockup stores data in each browser's `localStorage`, so a stage update made on a phone changes only that phone's copy. In the real system, the shop's local server and the API Bridge keep one shared record.
- The phone must be on the shop's network to open the scan link, because the Billing System runs locally.

## 3. Admin Portal (local, back office)

**Branch:** `admin-portal`

**Stack:** React, Vite, Tailwind v4, Zustand (localStorage persistence), Vitest. Types in `src/types.ts`, rates and sample values in `src/config.ts`, pure business logic in `src/lib/admin.ts`, `reporting.ts`, `notifications.ts` and `permissions.ts`, the store in `src/store`, demo data in `src/data/seed.ts`, and screens in `src/screens`. The full spec is `docs/ADMIN_PORTAL_SPEC.md`.

**Sidebar:** Dashboard, Inventory, Recommendations, Reports & Analytics, Employees, Cost & Profit, Commission, Membership, Design Review, Pricing Rules, and Notifications. Which items appear depends on the role's permissions.

**Screens:**
1. **Dashboard:** today's sales, active orders, low-stock alerts, total NPC members, and a sales trend chart based on order dates.
2. **Inventory:** size-by-quantity matrix, low-stock banners, material-yield estimate with waste %, and an in/out movement log labeled "QR / number-based."
3. **Recommendations (rule-based):** if any material is at or below its reorder point, generate Reorder suggestions (suggested quantity = target stock − current stock). Otherwise generate Pricing suggestions. The admin approves or rejects each one. Approving a pricing suggestion updates Pricing Rules. An approved reorder is logged as a pending "In" movement and counts toward the shortfall, so Pricing suggestions appear once reorders are approved.
4. **Reports & Analytics:** Daily, Weekly, and Monthly sales that change the table, chart, and demand estimate, CSV export, and a demand estimate labeled "input-based estimate from past sales, not predictive forecasting."
5. **Employees (merged with user management):** one screen with tabs for Staff List, Schedule, Order Assignment, Roles & Permissions, and Create Employee.
   - Roles: Admin, Manager, Sales Person, Production Staff (no Guest). Role names are fixed.
   - **Roles & Permissions** is an editable matrix. Rows are permissions, grouped into Screen access and Actions, and columns are the four roles. Only an Admin can change and save it. A Manager sees it read-only. Admin's column is locked so an Admin can never lose access, including "Manage roles & permissions." My Schedule and Notifications are always available to every role and are not in the matrix. The defaults match the original behavior: Admin and Manager see every screen, and Sales Person and Production Staff see only My Schedule and Notifications. The tab has Save changes, Reset to defaults, an "Unsaved changes" indicator, and a "Last updated" timestamp. Permissions are enforced in the sidebar, in disabled or hidden action buttons (with a "Your role does not have permission" tooltip), and inside the store action that saves permissions. They persist in the browser, and "Reset demo data" restores the defaults.
   - Create Employee flow: create the account, assign the role, assign the team, set the schedule, validate, store, then activate (Pending to Active).
   - Production team and schedule assignment per active order.
6. **My Schedule and Notifications:** a "View as" selector in the Dev menu switches between Admin, Manager, and any employee. By default an employee sees only **My Schedule** (their shifts, team, and assigned orders with deadlines and stages, read-only) and **Notifications**, and an Admin can grant a role more screens in Roles & Permissions. "View as" uses the viewed person's role permissions. Notifications are rule-based and derived from existing data, with an unread count and "Mark as read." They are not pushed by email, SMS, or a real-time service.
   - Admin and Manager: low-stock materials, designs under review, overdue orders, employees pending activation.
   - Employee: new team or schedule assignments and deadlines on assigned orders.
7. **Cost & Profit:** production cost = material + labor. Gross profit = sale price − production cost. Net profit = gross profit − commission, per order and in total. Commission is the only deduction the modules define, so no other overhead is invented. Overhead such as utilities and rent would be added when the shop supplies real figures.
   - Only **completed sales** count: orders that are Claimed and Paid in Full, the same trigger that creates a commission payout. They are grouped by the date the commission payout was posted, which is the date the order was claimed and paid in full.
   - A Daily / Weekly / Monthly toggle uses the same period logic as Reports & Analytics (with the pinned demo date).
   - Summary cards show completed sales, production cost, gross profit, commission, and net profit. A bar chart shows Sales, Production Cost, and Net Profit by date, and a per-order table with a totals row uses the same calculation helpers as the cards and chart.
   - A "Data sources" caption states where each figure comes from, with links to Reports and Commission. A reconciliation line checks that the commission total matches the Commission screen for Daily and Weekly. Monthly is marked unavailable because Commission only offers Today and This Week.
   - Three sales definitions are labeled on purpose so they do not look contradictory: the **Dashboard** shows paid sales (cumulative amount paid), **Reports & Analytics** shows booked sales (sale price), and **Cost & Profit** shows completed sales (claimed and paid in full).
8. **Commission:** ₱20 per piece per Sales Person, Today / This Week, and "Mark as paid" with a timestamp that cannot be reversed.
9. **Membership:** oversight only (no enrollment), all four tiers, "NPC = Nero Privilege Card" spelled out, search, and a logged manual tier correction.
10. **Design Review:** submitted T-shirt designs with front and back preview. Approve, or Request Revision with a required note. Design approval applies to every order with a custom design.
11. **Pricing Rules:** product prices, membership discounts, volume discounts, rush surcharge, and credit-term percentages, with validation. This is the source of the Billing System's locked prices.

**Demo data:** the seed uses the same Sales People, order IDs (`NPS-20261106-001` to `011`), commission entries, and NPC members (`NPC-000101` to `104`) as the Billing System, so a record seen in one system can be found in the other. "Today" is pinned to **2026-11-06** (`DEMO_TODAY` in `src/config.ts`) so reports and commission periods show data regardless of the real date. The Admin Portal has 11 orders, not 12, because it matches the Billing System seed.

**Limits to state in the paper:**
- In the mockup, Cost & Profit reads the Admin Portal's own store, which uses the same order IDs and commission data as the Billing System. It is not a live link between the two projects. In the real system, the shop's local server and the API Bridge keep one shared record.
- Each order stores a cumulative amount paid, not a payment history. Per-payment history would come with the real backend.
- Permissions cover screen access and key Admin Portal actions. Production-floor actions (scanning, marking a stage done, recording a payment) are controlled in the Billing System.

## Sample values (placeholders, not confirmed business values)

State these as sample values in the paper.

| Item | Sample value |
|---|---|
| Product prices (₱ per piece) | Sublimation Jersey 420, Sublimation Polo 520, Training Shorts 280, Jersey + Shorts Set 580, Custom T-Shirt 350, Printed Tote Bag 180 |
| Membership discounts | Bronze 3%, Silver 5%, Gold 8%, Platinum 10% |
| Volume discount | 5% at 25 pieces, 10% at 50 pieces |
| Rush surcharge | 15% |
| Credit-term charge | 15-day +20%, 30-day +30% (to be confirmed with Mr. Losaynon) |
| Quotation validity | 7 days from the issue date |
| NPC membership validity | 12 months from enrollment |
| Commission | ₱20 per piece |
| Points | 1 point per ₱1,000 paid, awarded on full payment |
| Materials, unit costs, stock levels, reorder points and targets, material consumption | Sample values in the Admin Portal's `config.ts` and `seed.ts` |
| Seed dates | Order, movement, member, and commission timestamps in `seed.ts`; only some deadlines come from the Billing System |
| Demo date | 2026-11-06 |

## Decisions

| # | Question | Status |
|---|---|---|
| 1 | Does design approval apply to every order or only T-shirts? | **Default:** every order with a custom design |
| 2 | Is "Finishing" the same as "Heat Press"? | **Default:** yes, use "Heat Press" everywhere |
| 3 | Keep or rename "demand estimate"? | **Open:** kept, with the "not predictive forecasting" label |
| 4 | Scanning and digital payment verification in the module text | **Decided:** NPC lookup is manual entry. Production uses the staff phone's camera app and a scan link. Payments are recorded by staff, not verified digitally. Update the paper to match. |
| 5 | Confirm credit-term percentages (+20% / +30%) with Mr. Losaynon | **Open** |
| 6 | Confirm the new Admin screens (Design Review, Pricing Rules, merged Employees, editable Roles & Permissions, My Schedule, Notifications, Cost & Profit graph) | **Open:** My Schedule, Notifications, and editable permissions go beyond the written modules, so tell the adviser and add them to the module text |
| 7 | Real price list, volume discount thresholds, rush percentage | **Open** (placeholders in use) |
| 8 | When points are awarded, and tier upgrade and redemption rules | **Open:** points are awarded on full payment for now, and no upgrade rules are invented |
| 9 | Commission trigger | **Default:** posted when the order is claimed and fully paid |
| 10 | E-signature or admin approval on the quotation | **Decided:** removed. The customer reviews the quotation and Terms and Conditions, then confirms. |
| 11 | Is each production station fixed to an employee's team or chosen on the phone each shift? | **Open** |
| 12 | Are staff phones on the shop Wi-Fi, and what local hostname is used for scan links? | **Open** |
| 13 | Who edits Roles & Permissions, and what is editable? | **Decided:** only an Admin edits. Role names stay fixed and only permissions change. Admin keeps every permission. My Schedule and Notifications are always on. A Manager sees the matrix read-only. |
| 14 | Which orders count in Cost & Profit? | **Decided:** completed sales only (Claimed and Paid in Full), grouped by the date the commission payout was posted. |
| 15 | Quotation validity (7 days) and NPC validity (12 months) | **Open:** sample values, to confirm with the adviser and Mr. Losaynon |
| 16 | When is the contact and address form required? | **Decided:** once, before the first design submission or order confirmation. It stays editable afterwards, and the Delivery address is editable in the Quotation. |
| 17 | Does Cost & Profit need per-payment history? | **Decided:** out of scope for the mockup. The order stores a cumulative amount paid. |

## Module text to update in the paper

- Change "loyalty point" to "NPC point" or "membership point."
- Change membership "scans" to "enters the QR Code / Number."
- Change "GCash/bank verified digitally" to "recorded by staff."
- Change "finishing" to "heat press," or note that they are the same step.
- Rewrite the Order Lifecycle Tracking wording: each order has one QR code that encodes a link to its scan page. Staff scan it with their own smartphone camera, the system verifies the order is waiting at that station, records the staff member and time, and advances the order. No browser-based scanning library is used.
- Remove the e-signature and quotation approval wording, and remove "QR code checklist."
- Add the Contact & Address step to the customer flow, before the design is submitted.
- Add the NPC enrollment offer after design approval: customers not yet enrolled can enroll online (starting at Bronze) or continue as regular customers.
- Add the quotation's "valid until" date and "payment due by" date, and the NPC card's validity date.
- Describe Cost & Profit as counting completed sales only (claimed and paid in full), with a period toggle and a graph.
- Describe Roles & Permissions as editable by an Admin, with fixed role names.
- Make reorder versus pricing suggestions either/or, as in the Recommendations logic above.
- Add Employees and Users as one merged screen, and add My Schedule and Notifications if they stay in scope.
- State that the Billing System and Admin Portal are front-end mockups with simulated sync and per-browser data.

## Development workflow

1. Read the system's spec in `docs/` before every task (`BILLING_SYSTEM_SPEC.md` or `ADMIN_PORTAL_SPEC.md`).
2. Work in steps: foundation and tests, then the store and seed, then the screens in groups, then the acceptance checklist.
3. After every step run typecheck, tests, and build, then start the app and confirm it loads without console errors.
4. Commit after each step.
