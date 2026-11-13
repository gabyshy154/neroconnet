import { useMemo } from 'react'
import { sampleMaterialConsumption } from '../config'
import { estimateMaterialYield, isLowStock } from '../lib/admin'
import { useAdminStore } from '../store/adminStore'
import { EmptyState, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'

export default function InventoryScreen() {
  const materials = useAdminStore(state => state.materials)
  const movements = useAdminStore(state => state.inventoryMovements)
  const lowStock = materials.filter(isLowStock)
  const sizeColumns = useMemo(() => [...new Set(materials.flatMap(material => Object.keys(material.sizeStock ?? {})))].sort(), [materials])
  const dataError = materials.some(material =>
    !Number.isFinite(material.stock) || material.stock < 0 ||
    !Number.isFinite(material.reorderPoint) || material.reorderPoint < 0,
  ) || movements.some(movement => !Number.isFinite(movement.qty) || movement.qty <= 0)

  return (
    <div>
      <ScreenTitle title="Inventory" subtitle="Stock by size, yield estimates, and QR / number-based movement history" />
      <ScreenFeedback
        error={dataError ? 'Inventory data contains an invalid stock level or movement quantity.' : ''}
        success={dataError ? '' : 'Inventory data loaded from the local store.'}
      />
      {lowStock.map(material => (
        <div key={material.id} role="status" style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          background: '#FBF0EB',
          border: '1px solid #E8C4B4',
          borderRadius: 6,
          padding: '10px 14px',
          marginBottom: 8,
          color: '#8D3928',
          fontSize: 13,
        }}>
          <strong>Low stock: {material.name}</strong>
          <span>{material.stock} {material.unit} remaining · reorder point {material.reorderPoint}</span>
        </div>
      ))}
      <ScreenCard style={{ marginBottom: 18, overflowX: 'auto' }}>
        <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Size-by-quantity stock matrix</h2>
        {materials.length === 0
          ? <EmptyState>No materials are in inventory.</EmptyState>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: '#ECEAE3', textAlign: 'left' }}>
                  {['Material', ...sizeColumns, 'Stock', 'Reorder point', 'Status'].map(column => (
                    <th key={column} scope="col" style={{ padding: 10, color: screenColors.muted, fontSize: 11, textTransform: 'uppercase' }}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materials.map(material => {
                  const low = isLowStock(material)
                  return (
                    <tr key={material.id} style={{ borderBottom: `1px solid ${screenColors.border}` }}>
                      <th scope="row" style={{ padding: 10, textAlign: 'left', color: screenColors.foreground, fontSize: 13, fontWeight: 500 }}>{material.name}</th>
                      {sizeColumns.map(size => (
                        <td key={size} style={{ padding: 10, color: screenColors.foreground, fontSize: 13 }}>
                          {material.sizeStock?.[size] ?? '—'}
                        </td>
                      ))}
                      <td style={{ padding: 10, color: low ? '#9B3526' : screenColors.foreground, fontSize: 13 }}>{material.stock} {material.unit}</td>
                      <td style={{ padding: 10, color: screenColors.muted, fontSize: 13 }}>{material.reorderPoint} {material.unit}</td>
                      <td style={{ padding: 10, color: low ? '#9B3526' : '#276749', fontSize: 12, fontWeight: 600 }}>{low ? 'Low stock' : 'OK'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </ScreenCard>
      <ScreenCard style={{ marginBottom: 18 }}>
        <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Material yield estimates</h2>
        {materials.filter(material => sampleMaterialConsumption[material.id]).length === 0
          ? <EmptyState>No sample material-consumption estimates are configured.</EmptyState>
          : materials.filter(material => sampleMaterialConsumption[material.id]).map(material => {
              const estimate = estimateMaterialYield(sampleMaterialConsumption[material.id])
              return (
                <div key={material.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${screenColors.border}` }}>
                  <span style={{ color: screenColors.foreground, fontSize: 13 }}>{material.name}</span>
                  <span style={{ color: screenColors.muted, fontSize: 12 }}>
                    ~{Math.floor(estimate.yieldPerUnit * material.stock).toLocaleString()} pieces from stock · {estimate.wastePercent.toFixed(1)}% estimated waste
                  </span>
                </div>
              )
            })}
      </ScreenCard>
      <ScreenCard style={{ overflowX: 'auto' }}>
        <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>In/out movement log</h2>
        {movements.length === 0
          ? <EmptyState>No inventory movements have been recorded.</EmptyState>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#ECEAE3', textAlign: 'left' }}>
                  {['Date', 'Type', 'Material', 'Quantity', 'QR Code / Number', 'Reason'].map(column => (
                    <th key={column} scope="col" style={{ padding: 10, color: screenColors.muted, fontSize: 11, textTransform: 'uppercase' }}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.slice().reverse().map(movement => (
                  <tr key={movement.id} style={{ borderBottom: `1px solid ${screenColors.border}` }}>
                    <td style={{ padding: 10, color: screenColors.muted, fontSize: 12 }}>{movement.at}</td>
                    <td style={{ padding: 10, color: movement.type === 'In' ? '#276749' : '#9B3526', fontSize: 12, fontWeight: 600 }}>{movement.type}</td>
                    <td style={{ padding: 10, color: screenColors.foreground, fontSize: 13 }}>
                      {materials.find(material => material.id === movement.materialId)?.name ?? movement.materialId}
                    </td>
                    <td style={{ padding: 10, color: screenColors.foreground, fontSize: 13 }}>{movement.qty}</td>
                    <td style={{ padding: 10, color: screenColors.muted, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{movement.orderId ?? '—'}</td>
                    <td style={{ padding: 10, color: screenColors.muted, fontSize: 12 }}>{movement.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </ScreenCard>
    </div>
  )
}
