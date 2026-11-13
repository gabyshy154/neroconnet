import { useEffect, useState } from "react"
import { Header } from "./components/Header"
import { localToday } from "./components/billingView"
import { Commission } from "./screens/Commission"
import { Billing } from "./screens/Billing"
import { Claim } from "./screens/Claim"
import { Membership } from "./screens/Membership"
import { Orders } from "./screens/Orders"
import { Production } from "./screens/Production"
import { ProductionScan } from "./screens/ProductionScan"
import { SignIn } from "./screens/SignIn"
import { WalkIn } from "./screens/WalkIn"
import { useBillingStore } from "./store/billingStore"
import { isOrderOverdue, parseScanLink } from "./lib/billing"
import { getScanVia, navigateToProductionScan } from "./lib/production"

type Screen =
  | "walkin"
  | "membership"
  | "billing"
  | "production"
  | "commission"
  | "claim"
  | "orders"

const NAV: { id: Screen; label: string; number: string }[] = [
  { id: "walkin", label: "Walk-In Order", number: "01" },
  { id: "membership", label: "NPC Membership", number: "02" },
  { id: "billing", label: "Billing", number: "03" },
  { id: "production", label: "Production", number: "04" },
  { id: "commission", label: "Commission", number: "05" },
  { id: "claim", label: "Claim Method", number: "06" },
  { id: "orders", label: "Order Management", number: "07" },
]

const TITLES: Record<Screen, string> = {
  walkin: "Walk-In Order Entry",
  membership: "NPC Membership Lookup / Enrollment",
  billing: "Billing",
  production: "Order Lifecycle / Production Scan",
  commission: "Sales Person & Commission",
  claim: "Claim Method",
  orders: "Order Management / Search",
}

function currentScanRoute() {
  const orderId = parseScanLink(window.location.href)
  return orderId
    ? { orderId, via: getScanVia(window.location.hash) }
    : null
}

export default function App() {
  const data = useBillingStore((state) => state)
  const setOnline = useBillingStore((state) => state.setOnline)
  const resetDemoData = useBillingStore((state) => state.resetDemoData)
  const signIn = useBillingStore((state) => state.signIn)
  const signOut = useBillingStore((state) => state.signOut)
  const [screen, setScreen] = useState<Screen>("walkin")
  const [scanRoute, setScanRoute] = useState(currentScanRoute)
  const signedInStaff = data.staff.find(
    (staff) => staff.id === data.signedInStaffId,
  )

  useEffect(() => {
    const handleHashChange = () => setScanRoute(currentScanRoute())
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  if (!signedInStaff) {
    return <SignIn staff={data.staff} onSignIn={signIn} />
  }

  if (scanRoute) {
    return (
      <div className="scan-route-shell">
        <Header
          staffName={signedInStaff.name}
          online={data.isOnline}
          queuedCount={data.queuedActions.length}
          isSyncing={data.isSyncing}
          syncMessage={data.syncMessage}
          onSignOut={signOut}
        />
        <ProductionScan orderId={scanRoute.orderId} via={scanRoute.via} />
      </div>
    )
  }

  const overdue = data.orders.filter((order) =>
    isOrderOverdue(order, localToday()),
  ).length
  const activeOrders = data.orders.filter(
    (order) => order.status !== "Claimed",
  ).length

  return (
    <div className="app-shell">
      <Header
        staffName={signedInStaff.name}
        online={data.isOnline}
        queuedCount={data.queuedActions.length}
        isSyncing={data.isSyncing}
        syncMessage={data.syncMessage}
        onSignOut={signOut}
      />
      <div className="body-shell">
        <aside className="sidebar">
          <nav aria-label="Main navigation">
            {NAV.map((item) => (
              <button
                key={item.id}
                className={screen === item.id ? "active" : ""}
                onClick={() => setScreen(item.id)}
              >
                <span>{item.number}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-stats">
            <span>Today’s shop view</span>
            <div><strong>{activeOrders}</strong> Active</div>
            <div className={overdue ? "text-red-300" : ""}>
              <strong>{overdue}</strong> Overdue
            </div>
          </div>
          <details className="m-3 rounded-lg border border-stone-600 bg-[#252720] p-3 text-stone-100">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide">
              Dev menu
            </summary>
            <button
              type="button"
              className="mt-3 w-full rounded-md border border-stone-500 px-3 py-2 text-left text-xs font-bold hover:bg-stone-700"
              aria-pressed={!data.isOnline}
              disabled={data.isSyncing}
              onClick={() => {
                void setOnline(!data.isOnline)
              }}
            >
              {data.isOnline ? "Go Offline" : "Go Online"}
            </button>
            {data.syncMessage && (
              <p className="mt-2 text-xs" role="status">
                {data.syncMessage}
              </p>
            )}
            <button
              type="button"
              className="mt-3 w-full rounded-md border border-stone-500 px-3 py-2 text-left text-xs font-bold hover:bg-stone-700"
              disabled={!data.orders.length}
              onClick={() => {
                const demoOrder =
                  data.orders.find((order) => order.status === "In Production") ??
                  data.orders[0]
                if (!demoOrder) return
                navigateToProductionScan(demoOrder.id, "Phone scan")
              }}
            >
              Simulate scan
            </button>
            <button
              type="button"
              className="mt-2 w-full rounded-md border border-stone-500 px-3 py-2 text-left text-xs font-bold hover:bg-stone-700"
              onClick={resetDemoData}
            >
              Reset demo data
            </button>
          </details>
        </aside>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">Counter workspace</span>
              <h1>{TITLES[screen]}</h1>
            </div>
            <span className="location">Mandaue City, Cebu</span>
          </div>
          {screen === "walkin" && <WalkIn />}
          {screen === "membership" && <Membership />}
          {screen === "billing" && <Billing />}
          {screen === "production" && <Production />}
          {screen === "commission" && <Commission />}
          {screen === "claim" && <Claim />}
          {screen === "orders" && <Orders />}
        </main>
      </div>
    </div>
  )
}
