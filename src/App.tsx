import { useState } from 'react'
import {
  BarChart2,
  Bell,
  ChevronDown,
  ChevronRight,
  Crown,
  DollarSign,
  LayoutDashboard,
  Package,
  Palette,
  Printer,
  Receipt,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react'
import { generateNotifications } from './lib/notifications'
import { useAdminStore } from './store/adminStore'
import type { ViewAs } from './types'
import CommissionScreen from './screens/CommissionScreen'
import CostProfitScreen from './screens/CostProfitScreen'
import DashboardScreen from './screens/DashboardScreen'
import DesignReviewScreen from './screens/DesignReviewScreen'
import EmployeesScreen from './screens/EmployeesScreen'
import InventoryScreen from './screens/InventoryScreen'
import MembershipScreen from './screens/MembershipScreen'
import MyScheduleScreen from './screens/MyScheduleScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import PricingRulesScreen from './screens/PricingRulesScreen'
import RecommendationsScreen from './screens/RecommendationsScreen'
import ReportsScreen from './screens/ReportsScreen'

const colors = {
  background: '#F4F3EE',
  card: '#FAFAF7',
  border: '#D8D5CC',
  foreground: '#1C1C18',
  muted: '#7A7A6E',
  accent: '#6B7C5A',
  sidebar: '#1C1C18',
  sidebarForeground: '#C8C8B8',
}

type ScreenId =
  | 'overview'
  | 'inventory'
  | 'recommendations'
  | 'reports'
  | 'employees'
  | 'schedule'
  | 'notifications'
  | 'cost'
  | 'commission'
  | 'membership'
  | 'design'
  | 'pricing'

const navigation = [
  { id: 'overview', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', Icon: Package },
  { id: 'recommendations', label: 'Recommendations', Icon: Sparkles },
  { id: 'reports', label: 'Reports & Analytics', Icon: BarChart2 },
  { id: 'employees', label: 'Employees', Icon: Users },
  { id: 'cost', label: 'Cost & Profit', Icon: DollarSign },
  { id: 'commission', label: 'Commission', Icon: Receipt },
  { id: 'membership', label: 'Membership', Icon: Crown },
  { id: 'design', label: 'Design Review', Icon: Palette },
  { id: 'pricing', label: 'Pricing Rules', Icon: SlidersHorizontal },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
] as const satisfies readonly {
  id: ScreenId
  label: string
  Icon: typeof LayoutDashboard
}[]

const employeeNavigation = [
  { id: 'schedule', label: 'My Schedule', Icon: LayoutDashboard },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
] as const satisfies readonly {
  id: ScreenId
  label: string
  Icon: typeof LayoutDashboard
}[]

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const viewAs = useAdminStore(state => state.viewAs)
  const employees = useAdminStore(state => state.employees)
  const materials = useAdminStore(state => state.materials)
  const inventoryMovements = useAdminStore(state => state.inventoryMovements)
  const designSubmissions = useAdminStore(state => state.designSubmissions)
  const orders = useAdminStore(state => state.orders)
  const assignmentEvents = useAdminStore(state => state.assignmentEvents)
  const readNotificationIds = useAdminStore(state => state.readNotificationIds)
  const setViewAs = useAdminStore(state => state.setViewAs)
  const resetDemoData = useAdminStore(state => state.resetDemoData)
  const employeeView = viewAs.startsWith('employee:')
  const visibleNavigation = employeeView ? employeeNavigation : navigation
  const visibleScreen = visibleNavigation.some(item => item.id === activeScreen)
    ? activeScreen
    : employeeView ? 'schedule' : 'overview'
  const currentNavigation = visibleNavigation.find(item => item.id === visibleScreen)!
  const sidebarWidth = sidebarCollapsed ? 60 : 224
  const unreadCount = generateNotifications({
    viewAs,
    materials,
    inventoryMovements,
    designSubmissions,
    orders,
    employees,
    assignmentEvents,
  }).filter(item => !readNotificationIds.includes(item.id)).length
  const selectedEmployeeId = viewAs.startsWith('employee:')
    ? viewAs.slice('employee:'.length)
    : ''

  const handleViewAs = (nextView: string) => {
    let next: ViewAs
    if (nextView === 'Admin' || nextView === 'Manager') {
      next = nextView
    } else if (nextView.startsWith('employee:')) {
      next = `employee:${nextView.slice('employee:'.length)}`
    } else {
      return
    }
    setViewAs(next)
    setActiveScreen(next.startsWith('employee:') ? 'schedule' : 'overview')
  }

  const resetDemo = () => {
    resetDemoData()
    setActiveScreen('overview')
  }

  const screenContent = {
    overview: <DashboardScreen />,
    inventory: <InventoryScreen />,
    recommendations: <RecommendationsScreen />,
    reports: <ReportsScreen />,
    employees: <EmployeesScreen />,
    schedule: <MyScheduleScreen />,
    notifications: <NotificationsScreen />,
    cost: <CostProfitScreen />,
    commission: <CommissionScreen />,
    membership: <MembershipScreen />,
    design: <DesignReviewScreen />,
    pricing: <PricingRulesScreen />,
  }[visibleScreen]

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.background, overflow: 'hidden' }}>
      <aside style={{
        width: sidebarWidth,
        flexShrink: 0,
        background: colors.sidebar,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: sidebarCollapsed ? '20px 0' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 30,
            height: 30,
            background: colors.accent,
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Printer size={16} color="#fff" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>NeroConnect</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
                {employeeView ? employees.find(item => item.id === selectedEmployeeId)?.name ?? 'EMPLOYEE' : viewAs.toUpperCase()}
              </p>
            </div>
          )}
        </div>

        <nav aria-label="Main navigation" style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {visibleNavigation.map(({ id, label, Icon }) => {
            const active = visibleScreen === id
            const badge = id === 'notifications' && unreadCount > 0
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setActiveScreen(id)}
                title={sidebarCollapsed ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: sidebarCollapsed ? 0 : 10,
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  width: '100%',
                  padding: sidebarCollapsed ? '10px 0' : '9px 10px',
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: active ? 'rgba(107,124,90,0.25)' : 'transparent',
                }}
              >
                <Icon size={16} color={active ? colors.accent : colors.sidebarForeground} />
                {!sidebarCollapsed && (
                  <span style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#fff' : colors.sidebarForeground,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>{label}</span>
                )}
                {!sidebarCollapsed && badge && (
                  <span aria-label={`${unreadCount} unread`} style={{
                    marginLeft: 'auto',
                    minWidth: 18,
                    padding: '2px 5px',
                    borderRadius: 10,
                    background: '#B85C38',
                    color: '#fff',
                    fontSize: 10,
                    textAlign: 'center',
                  }}>{unreadCount}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            type="button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed(previous => !previous)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              borderRadius: 7,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: colors.sidebarForeground,
            }}
          >
            {sidebarCollapsed
              ? <ChevronRight size={14} />
              : <><ChevronDown size={14} /><span style={{ fontSize: 12 }}>Collapse</span></>}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          height: 56,
          background: colors.card,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <span style={{ fontSize: 12, color: colors.muted }}>NeroConnect</span>
            <ChevronRight size={12} color={colors.border} />
            <span style={{ fontSize: 13, fontWeight: 500, color: colors.foreground }}>{currentNavigation.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color={colors.muted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                aria-label="Quick search"
                placeholder="Quick search…"
                style={{
                  padding: '6px 12px 6px 30px',
                  width: 200,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  fontSize: 12,
                  background: colors.background,
                  color: colors.foreground,
                }}
              />
            </div>
            <button
              type="button"
              aria-label={`Notifications, ${unreadCount} unread`}
              onClick={() => setActiveScreen('notifications')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: colors.foreground }}
            >
              <Bell size={16} color={colors.muted} />
              <span style={{ fontSize: 11, fontWeight: 600, color: unreadCount ? '#9B3526' : colors.muted }}>{unreadCount}</span>
            </button>
            <details style={{ position: 'relative' }}>
              <summary style={{
                listStyle: 'none',
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                padding: '6px 9px',
                color: colors.foreground,
                background: colors.card,
                fontSize: 12,
                cursor: 'pointer',
              }}>Dev menu</summary>
              <div style={{
                position: 'absolute',
                zIndex: 5,
                right: 0,
                top: 'calc(100% + 6px)',
                width: 250,
                padding: 12,
                border: `1px solid ${colors.border}`,
                borderRadius: 7,
                background: colors.card,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}>
                <label style={{ display: 'block', marginBottom: 10, color: colors.muted, fontSize: 11 }}>
                  View as
                  <select aria-label="View as" value={viewAs} onChange={event => handleViewAs(event.target.value)} style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 5,
                    padding: 7,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 5,
                    background: '#fff',
                    color: colors.foreground,
                    fontSize: 12,
                  }}>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={`employee:${employee.id}`}>{employee.name} ({employee.role})</option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={resetDemo} style={{
                  width: '100%',
                  padding: '7px 9px',
                  border: '1px solid #E8C4B4',
                  borderRadius: 5,
                  background: '#FBF0EB',
                  color: '#9B3526',
                  fontSize: 12,
                  cursor: 'pointer',
                }}>Reset demo data</button>
              </div>
            </details>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 28px' }}>
          {screenContent}
        </main>
      </div>
    </div>
  )
}
