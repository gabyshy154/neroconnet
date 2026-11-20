# NeroConnect Billing System: Build Spec

Staff-facing, counter-friendly system for Nero Printing Services and Trading (Mandaue City, Cebu). This is a front-end mockup: no backend, no real payments. State lives in a client store with seed data so every flow can be demonstrated end to end.

Save this file in the project root (as `CLAUDE.md` or `docs/BILLING_SYSTEM_SPEC.md`) so Claude Code reads it on every task.

**Changed in this version:** Production Scan no longer uses an in-page camera or a scanning library. Each order's QR code encodes a link. Staff scan it with the phone's own camera app, the phone opens the link in its browser, and the NeroConnect scan page shows the order. See sections 1, 4.3, 4.4, 5, 6, 9 and 10.

**Aligned with the paper and the Admin Portal (Nov 2026):** orders are released for production only with an approved design and a downpayment (BR-07, BR-03); statuses match the Admin Portal (Awaiting Release, In Production, Ready for Pickup / Ready for Delivery, Claimed); the claim method is chosen at order entry; each order keeps the price breakdown from when it was confirmed; NPC tiers upgrade by points; counter NPC numbers use the `NPC-B` prefix; payments record a reference code; the receipt toggle is the Non-VAT Sales Invoice; staff sign in with their User Management email (or name) and password.

---

## 1. Hard rules (never break these)

- App name in the header is **"NeroConnect"**. Never write "POS".
- Payments are **recorded only**. No GCash, bank, or card processing, no gateway UI, no "Pay now" buttons.
- **No VAT** and **no service fee** anywhere (the business is non-VAT registered).
- **No in-page camera and no QR scanning library anywhere in the app.** Do not use `getUserMedia`, `html5-qrcode`, `@zxing/browser`, `qr-scanner` or similar. No face recognition.
- **Production status is updated by scanning the order's QR code with the staff member's own phone camera app.** The QR code encodes a link to the scan page. The phone opens the link in its browser. A manual **"QR Code / Number"** field stays available as fallback and for handheld scanners.
- **NPC Lookup and walk-in Enrollment are manual entry only.** Staff type the NPC number into "QR Code / Number". No camera, no scanner.
- **Price Per Piece is read-only.** It is set by Product Type and cannot be edited by staff.
- NPC enrollment here is **walk-in only**, done by staff at the counter.
- Claim Method has **no courier name and no tracking number.** Delivery uses a delivery address. The **Order ID** is shown instead. The claim method is chosen when the order is created.
- The receipt toggle is **"Non-VAT Sales Invoice: Issued / Not Issued"** (the shop is not VAT-registered). Never write "Official Receipt".
- Currency is Philippine peso (₱), formatted like `₱1,250.00`.
- **Data privacy (RA 10173):** never show a customer's full mobile number on screen. Lists, cards, the order drawer, the Claim screen and NPC lookup show only the last four digits (`••• ••• 4567`, `maskPhone`). Staff can still search by the full number they type, and the New Customer form shows what is being typed.
- Single shop location. Web app, not native. No separate mobile app: the scan page is a normal page of this web app, opened in the phone's browser.

## 2. Look and feel

- Same palette as the customer portal: sage/olive accent, near-black text, off-white background. Denser and more utilitarian than the portal.
- Large tap targets (minimum 44 px), minimal scrolling, single-window layout readable at a glance while a customer stands at the counter.
- The **scan page is designed phone-first** (narrow screen, one column, buttons at least 56 px tall). The rest of the app is counter-first.
- Status colors: green = complete, amber = in progress, red = alert or overdue.
- Header on every screen: "NeroConnect", signed-in staff name, and an **Online / Offline badge** (see section 6).
- Every screen needs: empty state, validation error state, and a clear success confirmation.

## 3. Data model (TypeScript)

```ts
type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
type Stage = 'Cutting' | 'Printing/Sewing' | 'Heat Press' | 'Quality Control'
type PaymentMethod = 'Cash' | 'GCash' | 'Bank Transfer' // recorded labels only
type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid in Full'
type OrderStatus =
  | 'Awaiting Release' | 'In Production' | 'Ready for Pickup' | 'Ready for Delivery' | 'Claimed'
type DesignStatus = 'Under Review' | 'Revision Required' | 'Approved' // set by Admin Portal Design Review

interface Staff { id: string; name: string; email: string; isSalesPerson: boolean } // email = User Management account
interface Customer { id: string; name: string; phone: string; npcNumber?: string }
interface NpcMember { npcNumber: string; customerId: string; tier: Tier; points: number; joinedAt: string }

interface ProductType { id: string; name: string; pricePerPiece: number; isApparel: boolean }

interface OrderLine {
  productTypeId: string
  material?: 'Cotton' | 'Polyester' | 'Drift' | 'Mixed'
  printingType: 'Full Sublimation' | 'Screen Print' | 'Digital Print' | 'Vinyl'
  printLocation: string
  colorsCount?: number
  color?: string
  sizes: Record<string, number>   // e.g. { M: 3, L: 5 }; non-apparel uses { QTY: n }
  pricePerPiece: number           // copied from ProductType at creation, locked
}

interface Payment {
  id: string; orderId: string; method: PaymentMethod
  amount: number; recordedBy: string; recordedAt: string
  referenceCode?: string           // required for GCash / Bank Transfer (REQ-4.6-03)
  receiptIssued: boolean           // Non-VAT Sales Invoice issued
}

interface LockedPricing {          // saved when the order is created; never recalculated
  tier?: Tier; totalPieces: number; subtotal: number
  discounts: { label: string; amount: number }[]; totalDiscount: number
  rushSurcharge: number; creditCharge: number; grandTotal: number
}

interface StageLogEntry {
  orderId: string
  stage: Stage                     // the stage that was completed
  staffId: string
  at: string                       // ISO timestamp
  via: 'Phone scan' | 'Manual entry' // how the order was opened
}

interface Order {
  id: string                       // Order ID, also the QR Code / Number
  customerId: string
  salesPersonId: string
  lines: OrderLine[]
  deadline: string
  rush: boolean
  creditTermDays?: 15 | 30
  stage?: Stage                    // undefined until production starts
  status: OrderStatus
  designStatus: DesignStatus
  claim: { method: 'Pick-up' | 'Delivery'; deliveryAddress?: string; claimedAt?: string } // chosen at entry
  pricing: LockedPricing
  payments: Payment[]
  stageLog: StageLogEntry[]
  createdAt: string
}

interface CommissionEntry { orderId: string; salesPersonId: string; pieces: number; amount: number; postedAt: string }

interface QueuedAction { id: string; type: string; payload: unknown; queuedAt: string }
```

## 4. Business logic (the "intelligence")

Put all of this in pure functions in `src/lib/billing.ts` so it is easy to test. Keep rates and the scan base URL in one `src/config.ts`.

### 4.1 Pricing
- `totalPieces = sum of all size quantities across lines`.
- `lineTotal = pricePerPiece * pieces`. `subtotal = sum(lineTotal)`.
- **Discounts** (apply only when they apply, show each as its own row):
  - Membership discount by tier: **Bronze 3%, Silver 5%, Gold 8%, Platinum 10%**, applied to the subtotal.
  - Volume discount: configurable thresholds in `config.ts`. **Placeholder values, confirm against the SRS pricing rules.**
- **Rush surcharge**: configurable percentage in `config.ts`, only when `rush` is true. **Placeholder, confirm.**
- **Credit term charge**: 15 days adds 20% of the total order, 30 days adds 30%.
- `grandTotal = subtotal - discounts + rush + creditCharge`. Round to 2 decimals. No VAT.
- Show an itemized breakdown on the Billing screen. Product prices in the seed data are **sample values only**, to be replaced with Nero's real price list.
- **Lock the breakdown when the order is created** (`lockPricing`, stored in `Order.pricing`, including the NPC tier used). Billing, balances, commission and the order drawer always use the locked breakdown, so a later enrollment, tier upgrade or price change never changes what an existing order owes.

### 4.2 Payments and balance
- Default downpayment suggestion is **50% of grandTotal**. Staff can type another amount, but it must be greater than 0 and not exceed the remaining balance.
- `remainingBalance = grandTotal - sum(payments)`, recalculated live.
- `PaymentStatus`: Unpaid (no payments), Partially Paid (some), Paid in Full (balance is 0).
- Each recorded payment stores method, amount, staff, time, a **reference code** (required for GCash and Bank Transfer, optional for Cash, 40 characters max), and the **Non-VAT Sales Invoice: Issued / Not Issued** toggle.
- Cash payments show a confirm step: "Cash received and verified by [staff]". GCash and Bank Transfer are labeled "Recorded as received. Not processed here."
- Label on the screen: **"Record payment method. Payments are not processed here."**

### 4.3 Order ID and QR codes
- Order ID format: `NPS-YYYYMMDD-NNN`, with NNN a per-day sequence starting at 001. This ID is also the order's "QR Code / Number".
- **One QR code per order, created when the order is confirmed.** It never changes. Only the order's stage changes as it moves through production.
- **The QR code encodes a link to the order's scan page, not just the ID.**
  - Real system: `https://neroconnect.local/scan/NPS-20261106-002`
  - Mockup: `<SCAN_BASE_URL>#/scan/NPS-20261106-002`, using hash routing so it works without a server. `SCAN_BASE_URL` lives in `config.ts` (default: `window.location.origin`).
  - Pure function `buildScanLink(orderId)` and `parseScanLink(urlOrText)` in `billing.ts`. `parseScanLink` also accepts a bare Order ID (from the manual field or a handheld scanner that types the ID).
- Generate the QR image with `qrcode.react` (generation only). Show it on the order card and in the detail drawer, with the readable Order ID beside it and a **"Print QR tag"** button that opens a print-friendly view (QR, Order ID, customer, pieces, deadline).
- Staff can also type the Order ID or number into the **"QR Code / Number"** field to find the order.
- NPC number format: `NPC-B-NNNNNN` for members enrolled at the counter, `NPC-P-NNNNNN` for members enrolled in the Customer Portal (separate prefixes so numbers issued offline never collide, REQ-4.8-03). Counter numbers continue from the highest existing `NPC-B` number.

### 4.4 Production lifecycle
- Stages in strict order: **1 Cutting, 2 Printing/Sewing, 3 Heat Press, 4 Quality Control.** Each order is in exactly one column on the Order Lifecycle board.
- `advanceStage(orderId, staffId, via)` moves forward **one stage only**. No skipping, no moving backward.
- New orders start as **Awaiting Release** with design status **Under Review**: walk-in designs go to the Admin Portal's Design Review like online ones (BR-07).
- An order is **released for production** (status In Production, current stage Cutting) only when **both** the design is Approved and a downpayment is recorded (`releaseIfReady`). Until then show what is missing: "The design must be approved in the Admin Portal (Design Review) before production starts." and/or "Record the downpayment before starting production."
- Inventory is deducted at release, never at order creation (BR-03). Show "Released for production. Materials deducted from inventory." at that moment.
- Mockup only: the order drawer has a **"Simulate Admin design approval (demo)"** button, because the Admin Portal's approval is not shared with this mockup.
- Completing Quality Control sets status to **Ready for Pickup** or **Ready for Delivery**, from the claim method (REQ-4.11-06).
- An order is **overdue (red)** when `deadline < today` and it is not Claimed.
- Each card shows Order ID, customer, items and quantity, deadline, sales person, a QR image, and a four-step progress tracker (done = green, current = amber, remaining = gray).

#### 4.4a Production Scan flow (phone camera app plus scan page)

How a stage gets updated:

1. Staff point the **phone's normal camera app** at the order's QR code. The phone offers to open the link.
2. The link opens the **NeroConnect scan page** (`/scan/<OrderID>`) in the phone's browser. If the staff member is not signed in on that phone, show the sign-in (email or name and password, mock), then return to the same scan page automatically.
3. The scan page shows the **order card**: Order ID, customer, pieces, deadline, current stage, and the progress tracker.
4. The page knows **who** (the signed-in staff member) and **which station** (see below), and **verifies the order is waiting at that station**.
5. If it matches, show one large button: **"Mark [stage] done and move to [next stage]"**. The staff member taps it. The system records the staff member, the completed stage and the time, and advances the order one stage.
6. Show a clear success screen ("Cutting done. Moved to Printing/Sewing.") with a "Scan next order" hint. The Order Lifecycle board and the Customer Portal's Order Tracking show the new stage.

Station selection:
- A **station picker** (Cutting, Printing/Sewing, Heat Press, Quality Control) appears at the top of the scan page and is **remembered on that phone**. Staff choose it once at the start of a shift.
- Show the selected station and the signed-in staff member on every scan result.
- (Optional, if the Admin Portal team assignment is shared later: default the station from the employee's team.)

Blocking rules (button disabled, with a clear message, nothing changes):
- **Unknown order:** "Order not found. Check the QR code or enter the Order ID."
- **Wrong station:** "This order is at [current stage]. Switch to the [current stage] station to update it."
- **Not released:** the design-approval or downpayment message above.
- **Ready for Pickup, Ready for Delivery or Claimed:** "This order has finished production."
- **Not signed in:** sign in first, then continue (do not lose the scanned link).
- A second tap or a repeated scan of the same completed step must not advance the order twice (the stage match check prevents this).

Fallbacks and demo:
- **"QR Code / Number" field** on the scan page and on the Order Lifecycle board opens the same scan page for that Order ID. This also works with a handheld QR scanner that types the ID into the field.
- **"Update stage"** button on each order card (and "Update stage (demo)" in the Dev menu): opens `#/scan/<OrderID>`, the same page a phone opens after scanning, in the current tab. It does not edit the order; it only opens the stage update, so the flow also works on a laptop with no phone.
- Every transition is stored in `Order.stageLog` and shown in the **order detail drawer** history: staff name, completed stage, time, and how it was opened (Phone scan or Manual entry).

Limits to state in the paper (mockup only):
- The mockup keeps data in each browser's `localStorage`, so a stage update made on a phone changes only that phone's copy. In the real system the shop's local server and the API Bridge keep one shared record, and the board and the Customer Portal update from it.
- The phone must be on the shop's network to open the link, because the Billing System runs on the local network.
- The scan link and the page work with the phone's built-in camera app, so no app install, camera permission prompt, or HTTPS-for-camera setup is needed in the page.

### 4.4b Inventory link (display only for this mockup)
- When an order is **released for production** (approved design + downpayment), show "Released for production. Materials deducted from inventory." Never show it when the order is created (BR-03). Real deduction and low-stock alerts belong to the Admin Portal.

### 4.5 Claim
- The claim method (Pick-up or Delivery, with the delivery address) is chosen at **Walk-in Order Entry** (REQ-4.7-04, Transaction Flow step 5).
- The Claim screen is the **release (hand-over) step**. The left list groups orders into **Ready for Pickup** and **Ready for Delivery**, each showing "Fully paid", "₱x due" or "₱x on credit".
- The selected order shows three steps: **1. Payment** (total, paid, balance; if a balance is due without a credit term, release is blocked and a "Record payment in Billing" button opens Billing on that order; a credit-term balance shows an amber note that it is due within the term), **2. Hand-over** (the method chosen at entry and the delivery address; a "Customer asked to switch…" link changes the method, which also moves the order between Ready for Pickup and Ready for Delivery), **3. Confirm** ("Confirm picked up" or "Confirm delivered", which marks the order Claimed).
- Staff check the Order ID with the customer before releasing.
- **Block release if the balance is greater than 0**: "Remaining balance must be settled before release." (Unless a credit term was approved.)
- Delivery requires a delivery address. Pick-up needs nothing extra. Show the Order ID on the card for both.
- Marking as **Claimed** completes the sale and triggers 4.6 and 4.7.

### 4.6 Commission
- Flat **₱20 per piece**: `amount = totalPieces * 20`, posted to the order's Sales Person when the order is **Claimed and fully paid**.
- Summary view: Today / This Week toggle, a table per staff member (pieces, commission), and a total.
- Sales Person is **required** on every order (dropdown of staff).

### 4.7 NPC membership
- Lookup by typing the NPC number into "QR Code / Number" and pressing "Look Up". **Manual entry only, no camera.** Result card: name, tier, discount %, points.
- **Points: 1 point per full ₱1,000 paid on each order** (`Math.floor(orderPaidTotal / 1000)`), credited to the NPC number when the order becomes Paid in Full.
- **Tier upgrades by points (REQ-4.8-06):** Silver at 20, Gold at 50, Platinum at 100 points (sample thresholds, the same as the Admin Portal, in `config.ts`). When credited points reach a threshold, the tier upgrades automatically and Billing shows "NPC tier upgraded from X to Y." Tiers never go down automatically.
- Walk-in enrollment: only for customers with no NPC number. Staff ask the customer face to face; there is no Yes/No toggle on screen. If the customer agrees, staff select them and press **Enroll as Bronze**, which creates a **Bronze (free)** member with an `NPC-B` number. If they decline, staff simply continue the order as a regular customer.
- Tier reference strip: Bronze (on enrollment, 3%), Silver (20 points, 5%), Gold (50 points, 8%), Platinum (100 points, 10%). The lookup card shows how many points remain to the next tier. Points redemption is not offered.

### 4.8 Customer lookup
- Search by name or phone, case-insensitive "contains", results as you type.
- "New Customer" quick-add: name and phone. Validate PH mobile format (`09XX XXX XXXX` or `+639...`). Warn on duplicate phone numbers instead of silently creating a duplicate.

### 4.9 Order Management
- Searchable table: Order ID, Customer, Items/Qty, Sales Person, Production Stage, Payment Status, Claim Method, Deadline.
- Search by Order ID, customer name, phone, or NPC number. Filters: status, customer, date range. Sortable columns. Empty state: "No orders match your filters."

## 5. Screens to finish (checklist)

1. Walk-in Order Entry (customer lookup, locked price, size grid XS to 5XL, total quantity, line total, sales person, claim method and delivery address)
2. NPC Lookup / Walk-in Enrollment (manual entry only; no camera)
3. Billing (payment method, reference code, downpayment, remaining balance, Non-VAT Sales Invoice toggle, itemized totals from the locked breakdown)
4. Order Lifecycle board (an "Awaiting release" row listing what each order still needs, four numbered columns, QR image and "Update stage" on each card, "QR Code / Number" field, printable QR tag)
5. **Production Scan page** (route `/scan/<OrderID>`, phone-first: station picker, signed-in staff, order card, verification message, "Mark done" button, success and blocked states)
6. Sales Person and Commission summary
7. Claim Method (orders Ready for Pickup / Ready for Delivery, Order ID, method chosen at entry, delivery address)
8. Order Management / Search

Also needed to make it feel complete: a staff sign-in screen with a **text field for the staff email or full name** (no dropdown, so it scales to many employees) and a **password** (at least 8 characters, the same rule as the Admin Portal; mock accepts any valid-length password) that **returns to the scanned link after sign-in**, and an **order detail drawer** that opens from any order row showing everything about it, including payment history and the production stage history.

## 6. Offline mode (simulate it)

- The header badge has two states: **Online** (green) and **Offline** (amber, "N transactions queued, will sync when reconnected").
- Provide a small toggle (visible in a dev menu) to switch connectivity.
- While offline, every write (new order, payment, design approval received, stage advance from a scan, enrollment, claim) still works locally and is pushed to a `QueuedAction[]` list with a timestamp.
- When switched back online, show "Syncing..." and replay the queue in order, then show "All transactions synced" and clear the badge count.
- Offline NPC lookups use the local cache and show: "Offline: tier and points will update after sync."
- Opening a scan link while offline still works from the local copy and shows the same offline notice.

## 7. Seed data

Provide `src/data/seed.ts` with: 5 staff (including sales people, with the same emails as the Admin Portal), 8 customers, 4 NPC members (one per tier, points inside each tier's threshold band, both `NPC-P` and `NPC-B` numbers), 6 product types with **sample** prices matching the Admin Portal's Pricing Rules, and orders spread across every status and stage (include one overdue, one unpaid awaiting release, one paid but awaiting design approval, one ready for pickup, one ready for delivery). GCash and bank payments carry reference codes. The demo should look alive on first load. Include a few `stageLog` entries on in-production and finished orders so the detail drawer history is not empty.

## 8. How to build this with Claude Code

1. Read the existing code and list what is already built vs. missing against sections 4 to 6. Report this first and wait for my go-ahead.
2. Build in this order: types and config, `billing.ts` logic with unit tests (including `buildScanLink`, `parseScanLink` and the station-matching and blocking rules), store with persistence, then screens, then the scan page, then the offline queue.
3. Do not add a backend or real payment processing. **Do not add an in-page camera or any QR scanning library.** QR generation only (`qrcode.react`).
4. After each step run the type check, lint and build, then run the app and confirm it loads without console errors. Check that `react` and `react-dom` have identical versions after any dependency change.
5. Keep components small, strongly typed, and accessible (labels, focus states, keyboard use, color not the only status signal).

## 9. Acceptance checklist

- [ ] Header shows "NeroConnect" and a working Online / Offline badge.
- [ ] Price Per Piece is locked and fills from Product Type.
- [ ] Discounts, rush, and credit charge only show when they apply. No VAT.
- [ ] Remaining balance updates live and cannot go negative.
- [ ] Production cannot start without an approved design **and** a downpayment, and cannot skip stages.
- [ ] Statuses are Awaiting Release, In Production, Ready for Pickup / Ready for Delivery, Claimed.
- [ ] An order's total never changes after creation (locked breakdown).
- [ ] GCash and Bank Transfer payments require a reference code; the toggle reads "Non-VAT Sales Invoice".
- [ ] NPC tiers upgrade automatically at 20 / 50 / 100 points.
- [ ] Each order's QR code encodes a scan link (`/scan/<OrderID>`) and shows the readable Order ID.
- [ ] Opening the scan link shows the order card, the signed-in staff member and the selected station.
- [ ] "Mark done" is enabled only when the station matches the order's current stage, and moves the order one stage forward.
- [ ] Wrong station, unknown order, not started, and finished orders are blocked with a clear message.
- [ ] Each transition records staff, completed stage and time, and appears in the order detail drawer.
- [ ] A signed-out phone signs in and returns to the same scan page.
- [ ] "QR Code / Number" fallback and "Update stage" both open the scan page.
- [ ] No `getUserMedia`, camera permission prompt, or scanning library anywhere in the code.
- [ ] NPC Lookup and Enrollment remain manual entry and never request camera access.
- [ ] Release is blocked while a balance remains.
- [ ] Commission is exactly ₱20 per piece, posted only when claimed and fully paid.
- [ ] Walk-in enrollment creates a Bronze member with an `NPC-B` number.
- [ ] Staff sign in by typing their email or name and a password.
- [ ] No courier or tracking fields. Order ID appears in Claim Method.
- [ ] Offline queue and sync work as described, including stage advances.

## 10. Still to confirm with the shop or your SRS

- Real price list per product type
- Volume discount thresholds and rush surcharge percentage
- Point thresholds per tier (sample 20 / 50 / 100) and whether points can be redeemed
- Whether "Finishing" in your module text is the same step as "Heat Press"
- Whether each production station is fixed to an employee's team or chosen on the phone each shift
- Whether staff phones are on the shop Wi-Fi (the scan link opens only on the local network) and the local hostname to use (for example `neroconnect.local`)