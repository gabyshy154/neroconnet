import { useEffect, useState } from "react"

export function Header({
  staffName,
  online,
  queuedCount,
  isSyncing,
  syncMessage,
  onSignOut,
}: {
  staffName: string
  online: boolean
  queuedCount: number
  isSyncing: boolean
  syncMessage: string
  onSignOut: () => void
}) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <header className="topbar">
      <div className="brand-mark">N</div>
      <div className="brand">
        <strong>NeroConnect</strong>
        <span>Nero Printing Services · Mandaue City</span>
      </div>
      <div
        className={`network-badge ${online ? "online" : "offline"}`}
        role="status"
        aria-label={`${online ? "Online" : "Offline"} connection status`}
      >
        <span className="status-dot" />
        <span>
          <strong>{online ? "Online" : "Offline"}</strong>
          {!online && (
            <small>
              {queuedCount} transactions queued, will sync when reconnected
            </small>
          )}
          {isSyncing && <small>{syncMessage}</small>}
          {!isSyncing && online && syncMessage && (
            <small>{syncMessage}</small>
          )}
        </span>
      </div>
      <div className="staff-info">
        <span>
          {now.toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <button className="staff-signout" onClick={onSignOut}>
          <strong>{staffName}</strong>
          <small>Sign out</small>
        </button>
      </div>
    </header>
  )
}
