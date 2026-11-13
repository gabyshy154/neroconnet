import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency, isLowStock } from '../lib/admin'
import { getDailyOrderSales } from '../lib/reporting'
import { useAdminStore } from '../store/adminStore'
import { EmptyState, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'
import { DEMO_TODAY } from '../config'

export default function DashboardScreen() {
  const orders = useAdminStore(state => state.orders)
  const materials = useAdminStore(state => state.materials)
  const members = useAdminStore(state => state.members)
  const movements = useAdminStore(state => state.inventoryMovements)
  const lowStock = materials.filter(isLowStock)
  const activeOrders = orders.filter(order => order.stage && !order.claimed)
  const trend = useMemo(() => getDailyOrderSales(orders), [orders])
  const todaySales = trend.find(item => item.date === DEMO_TODAY)?.sales ?? 0
  const dataError = orders.some(order =>
    !Number.isFinite(order.amountPaid) || order.amountPaid < 0 ||
    !Number.isFinite(order.salePrice) || order.salePrice < 0,
  ) || materials.some(material =>
    !Number.isFinite(material.stock) || material.stock < 0 ||
    !Number.isFinite(material.reorderPoint) || material.reorderPoint < 0,
  )

  return (
    <div>
      <ScreenTitle title="Dashboard" subtitle="Current shop overview from the local demo data" />
      <ScreenFeedback
        error={dataError ? 'Dashboard data contains invalid order or stock values.' : ''}
        success={dataError ? '' : 'Dashboard data loaded from the local store.'}
      />
      {orders.length === 0 && materials.length === 0 && members.length === 0
        ? <EmptyState>No dashboard activity is available yet.</EmptyState>
        : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
              {[
                { label: "Today's sales", value: formatCurrency(todaySales), detail: `Paid amount for ${DEMO_TODAY}` },
                { label: 'Active orders', value: String(activeOrders.length), detail: 'Orders in production stages' },
                { label: 'Low-stock alerts', value: String(lowStock.length), detail: 'At or below reorder point' },
                { label: 'NPC members', value: String(members.length), detail: 'Membership records' },
              ].map(metric => (
                <ScreenCard key={metric.label}>
                  <p style={{ color: screenColors.muted, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{metric.label}</p>
                  <p style={{ color: screenColors.foreground, fontSize: 25, fontWeight: 700, marginTop: 9 }}>{metric.value}</p>
                  <p style={{ color: screenColors.muted, fontSize: 12, marginTop: 5 }}>{metric.detail}</p>
                </ScreenCard>
              ))}
            </div>
            {lowStock.length > 0 && (
              <ScreenCard style={{ marginBottom: 18, borderColor: '#E8C4B4', background: '#FBF0EB' }}>
                <h2 style={{ color: '#9B3526', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Low-stock alerts</h2>
                {lowStock.map(material => (
                  <p key={material.id} style={{ color: '#7D3225', fontSize: 13, marginTop: 4 }}>
                    {material.name}: {material.stock} {material.unit} remaining (reorder point {material.reorderPoint})
                  </p>
                ))}
              </ScreenCard>
            )}
            <ScreenCard style={{ marginBottom: 18 }}>
              <h2 style={{ color: screenColors.foreground, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Paid sales trend by order date</h2>
              {trend.length === 0 ? <EmptyState>No paid order data is available yet.</EmptyState> : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="dashboardPaidSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={screenColors.accent} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={screenColors.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={screenColors.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: screenColors.muted }} />
                    <YAxis tick={{ fontSize: 11, fill: screenColors.muted }} tickFormatter={value => formatCurrency(Number(value))} />
                    <Tooltip formatter={value => formatCurrency(Number(value ?? 0))} />
                    <Area dataKey="sales" name="Paid amount" type="monotone" stroke={screenColors.accent} fill="url(#dashboardPaidSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ScreenCard>
            <ScreenCard>
              <h2 style={{ color: screenColors.foreground, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Recent inventory movements</h2>
              {movements.length === 0
                ? <EmptyState>No inventory movements have been recorded.</EmptyState>
                : movements.slice(-5).reverse().map(movement => {
                    const material = materials.find(item => item.id === movement.materialId)
                    return (
                      <p key={movement.id} style={{ color: screenColors.muted, fontSize: 12, padding: '7px 0', borderBottom: `1px solid ${screenColors.border}` }}>
                        {movement.type} · {material?.name ?? movement.materialId} · {movement.qty} · {movement.reason}
                      </p>
                    )
                  })}
            </ScreenCard>
          </>
        )}
    </div>
  )
}
