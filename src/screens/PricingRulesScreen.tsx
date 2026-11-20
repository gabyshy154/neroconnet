import { useEffect, useState } from 'react'
import type { PricingRules, ProductCost, Tier } from '../types'
import { formatCurrency } from '../lib/admin'
import { addProduct, defaultEffectiveAt, describePricingChanges, maxProductNameLength, productPriceList, screenPrintCharge, sellingPrice } from '../lib/pricing'
import { useAdminStore } from '../store/adminStore'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'

const tiers: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum']
const costFields: (keyof ProductCost)[] = ['materialCost', 'laborCost', 'overheadCost', 'markupPercent']
const screenPrintFields: [keyof PricingRules['screenPrint'], string][] = [
  ['setupFeePerColor', 'Setup fee per color (per job)'],
  ['perColorPerPiece', 'Charge per color per piece'],
  ['perSquareInchPerPiece', 'Charge per square inch per piece'],
]

/** ISO timestamp → value for a datetime-local input, in the browser's (Philippine) local time. */
function toLocalInput(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function PricingRulesScreen() {
  const rules = useAdminStore(state => state.pricingRules)
  const scheduled = useAdminStore(state => state.scheduledPricing)
  const history = useAdminStore(state => state.pricingHistory)
  const schedulePricingRules = useAdminStore(state => state.schedulePricingRules)
  const cancelScheduledPricing = useAdminStore(state => state.cancelScheduledPricing)
  // Edits start from the scheduled version when one exists, so a second edit adds to it.
  const baseRules = scheduled?.rules ?? rules
  const [draft, setDraft] = useState<PricingRules>(baseRules)
  const [effectiveAt, setEffectiveAt] = useState(() => toLocalInput(scheduled?.effectiveAt ?? defaultEffectiveAt(new Date().toISOString())))
  const [success, setSuccess] = useState('Pricing rules loaded from the local store.')
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(structuredClone(baseRules))
    setEffectiveAt(toLocalInput(scheduled?.effectiveAt ?? defaultEffectiveAt(new Date().toISOString())))
  }, [baseRules, scheduled?.effectiveAt])

  const setNumeric = (value: string): number => value.trim() === '' ? Number.NaN : Number(value)
  const save = () => {
    setSuccess('')
    setError('')
    try {
      const at = new Date(effectiveAt).toISOString()
      schedulePricingRules(draft, at)
      setSuccess(`Price change scheduled for ${formatDateTime(at)}. Quotations and orders created before then keep their current prices.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Pricing rules could not be saved.')
    }
  }
  const cancel = () => {
    setSuccess('')
    setError('')
    try {
      cancelScheduledPricing()
      setSuccess('Scheduled price change cancelled. The current prices stay in effect.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The scheduled change could not be cancelled.')
    }
  }
  const draftChanges = (() => {
    try {
      return describePricingChanges(rules, draft)
    } catch {
      return []
    }
  })()
  const currentPrices = productPriceList(rules)
  const setProductCost = (product: string, field: keyof ProductCost, value: string) => {
    setDraft(current => ({
      ...current,
      productCosts: {
        ...current.productCosts,
        [product]: { ...current.productCosts[product], [field]: setNumeric(value) },
      },
    }))
  }
  const [newProduct, setNewProduct] = useState('')
  const addNewProduct = () => {
    setSuccess('')
    setError('')
    try {
      const next = addProduct(draft, newProduct)
      const added = Object.keys(next.productCosts).find(name => !(name in draft.productCosts))!
      setDraft(next)
      setNewProduct('')
      setSuccess(`${added} added to the draft. Enter its costs and markup, then schedule the change.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The product could not be added.')
    }
  }
  // Only products not yet in effect can be removed; existing ones are referenced by past orders.
  const removeNewProduct = (product: string) => {
    setDraft(current => {
      const productCosts = { ...current.productCosts }
      delete productCosts[product]
      return { ...current, productCosts }
    })
    setSuccess(`${product} removed from the draft.`)
    setError('')
  }
  const priceFor = (cost: ProductCost): string => {
    try {
      return formatCurrency(sellingPrice(cost))
    } catch {
      return 'Invalid inputs'
    }
  }
  const [job, setJob] = useState({ pieces: '20', colors: '2', printAreaSqIn: '80' })
  const screenPrintPreview = (() => {
    try {
      return formatCurrency(screenPrintCharge(draft, {
        pieces: Number(job.pieces),
        colors: Number(job.colors),
        printAreaSqIn: Number(job.printAreaSqIn),
      }))
    } catch (reason) {
      return reason instanceof Error ? reason.message : 'Invalid job details.'
    }
  })()
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${screenColors.border}`,
    borderRadius: 5,
    padding: '7px 9px',
    color: screenColors.foreground,
    background: '#fff',
    font: '13px Inter, sans-serif',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: screenColors.muted,
    fontSize: 12,
    marginBottom: 5,
  }

  return (
    <div>
      <ScreenTitle title="Pricing Rules" subtitle="Edit product costs and markup, screen-print charges, discounts, rush, credit terms, storage fees, and late-payment penalties." />
      <ScreenFeedback success={success} error={error} />
      {scheduled && (
        <ScreenCard style={{ marginBottom: 18, background: '#FFF8E6', border: '1px solid #E9D49A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ color: '#7A5A10', fontSize: 14, fontWeight: 600 }}>Scheduled price change · takes effect {formatDateTime(scheduled.effectiveAt)}</h2>
              <p style={{ color: '#7A5A10', fontSize: 12, marginTop: 4 }}>From {scheduled.source}. Current prices stay in effect until then.</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: screenColors.foreground, fontSize: 12, lineHeight: 1.7 }}>
                {describePricingChanges(rules, scheduled.rules).map(change => <li key={change}>{change}</li>)}
              </ul>
            </div>
            <div><ScreenButton variant="danger" onClick={cancel}>Cancel scheduled change</ScreenButton></div>
          </div>
        </ScreenCard>
      )}
      {Object.keys(draft.productCosts).length === 0
        ? <EmptyState>No pricing rules have been configured.</EmptyState>
        : (
          <>
            <ScreenCard style={{ marginBottom: 18, overflowX: 'auto' }}>
              <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Product selling prices (₱ per piece)</h2>
              <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 14 }}>
                Selling Price = (Material Cost + Labor Cost + Overhead Cost) × (1 + Markup). The Billing System locks these prices.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    {['Product', 'Material', 'Labor', 'Overhead', 'Markup %', 'Current price', 'New price', ''].map(column => (
                      <th key={column} scope="col" style={{ color: screenColors.muted, fontSize: 12, textAlign: 'left', padding: '0 6px 6px 0', fontWeight: 600 }}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(draft.productCosts).map(([product, cost]) => (
                    <tr key={product}>
                      <th scope="row" style={{ color: screenColors.foreground, fontSize: 13, fontWeight: 500, textAlign: 'left', padding: '4px 6px 4px 0' }}>{product}</th>
                      {costFields.map(field => (
                        <td key={field} style={{ padding: '4px 6px 4px 0' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            aria-label={`${product} ${field === 'markupPercent' ? 'markup percent' : field.replace('Cost', ' cost')}`}
                            value={Number.isNaN(cost[field]) ? '' : cost[field]}
                            onChange={event => setProductCost(product, field, event.target.value)}
                            style={fieldStyle}
                          />
                        </td>
                      ))}
                      <td style={{ color: screenColors.muted, fontSize: 13, whiteSpace: 'nowrap', paddingRight: 10 }}>{currentPrices[product] === undefined ? '—' : formatCurrency(currentPrices[product])}</td>
                      <td style={{ color: screenColors.foreground, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', paddingRight: 10 }}>{priceFor(cost)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {currentPrices[product] === undefined && (
                          <ScreenButton variant="secondary" onClick={() => removeNewProduct(product)}>Remove</ScreenButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <form
                onSubmit={event => {
                  event.preventDefault()
                  addNewProduct()
                }}
                style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 14 }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  New product name
                  <input
                    type="text"
                    maxLength={maxProductNameLength}
                    placeholder="e.g. Hoodie"
                    value={newProduct}
                    onChange={event => setNewProduct(event.target.value)}
                    style={{ ...fieldStyle, marginTop: 5, width: 240 }}
                  />
                </label>
                <ScreenButton type="submit">Add product</ScreenButton>
              </form>
              <p style={{ color: screenColors.muted, fontSize: 12, marginTop: 8 }}>
                A new product is added to the draft only. It reaches the Billing System and Customer Portal when the scheduled change takes effect.
              </p>
            </ScreenCard>
            <ScreenCard style={{ marginBottom: 18 }}>
              <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Screen-print charges (₱)</h2>
              <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 14 }}>
                Charge = setup fee × colors + pieces × (colors × per-color charge + print area × per-square-inch charge).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
                {screenPrintFields.map(([field, label]) => (
                  <label key={field} style={labelStyle}>
                    {label}
                    <input type="number" min="0" step="0.01" value={Number.isNaN(draft.screenPrint[field]) ? '' : draft.screenPrint[field]} onChange={event => setDraft(current => ({ ...current, screenPrint: { ...current.screenPrint, [field]: setNumeric(event.target.value) } }))} style={fieldStyle} />
                  </label>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) minmax(0, 1.2fr)', gap: 12, alignItems: 'end' }}>
                {([['pieces', 'Preview: pieces'], ['colors', 'Preview: colors'], ['printAreaSqIn', 'Preview: print area (sq in)']] as const).map(([field, label]) => (
                  <label key={field} style={labelStyle}>
                    {label}
                    <input type="number" min="1" value={job[field]} onChange={event => setJob(current => ({ ...current, [field]: event.target.value }))} style={fieldStyle} />
                  </label>
                ))}
                <p role="status" style={{ color: screenColors.foreground, fontSize: 13, fontWeight: 600, paddingBottom: 8 }}>Job charge: {screenPrintPreview}</p>
              </div>
            </ScreenCard>
            <ScreenCard style={{ marginBottom: 18 }}>
              <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Membership discounts (%)</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                {tiers.map(tier => (
                  <label key={tier} style={labelStyle}>
                    {tier}
                    <input type="number" min="0" max="100" step="0.1" value={Number.isNaN(draft.membershipDiscount[tier]) ? '' : draft.membershipDiscount[tier]} onChange={event => setDraft(current => ({ ...current, membershipDiscount: { ...current.membershipDiscount, [tier]: setNumeric(event.target.value) } }))} style={fieldStyle} />
                  </label>
                ))}
              </div>
            </ScreenCard>
            <ScreenCard style={{ marginBottom: 18 }}>
              <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Volume discounts (%)</h2>
              {draft.volumeDiscounts.length === 0
                ? <EmptyState>No volume discounts are configured.</EmptyState>
                : draft.volumeDiscounts.map((discount, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                      <label style={labelStyle}>
                        Minimum pieces
                        <input type="number" min="0" value={Number.isNaN(discount.minPieces) ? '' : discount.minPieces} onChange={event => setDraft(current => ({ ...current, volumeDiscounts: current.volumeDiscounts.map((item, itemIndex) => itemIndex === index ? { ...item, minPieces: setNumeric(event.target.value) } : item) }))} style={fieldStyle} />
                      </label>
                      <label style={labelStyle}>
                        Percent
                        <input type="number" min="0" max="100" step="0.1" value={Number.isNaN(discount.percent) ? '' : discount.percent} onChange={event => setDraft(current => ({ ...current, volumeDiscounts: current.volumeDiscounts.map((item, itemIndex) => itemIndex === index ? { ...item, percent: setNumeric(event.target.value) } : item) }))} style={fieldStyle} />
                      </label>
                    </div>
                  ))}
            </ScreenCard>
            <ScreenCard style={{ marginBottom: 18 }}>
              <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Rush and credit terms (%)</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                <label style={labelStyle}>
                  Rush
                  <input type="number" min="0" max="100" step="0.1" value={Number.isNaN(draft.rushPercent) ? '' : draft.rushPercent} onChange={event => setDraft(current => ({ ...current, rushPercent: setNumeric(event.target.value) }))} style={fieldStyle} />
                </label>
                <label style={labelStyle}>
                  15-day credit charge
                  <input type="number" min="0" max="100" step="0.1" value={Number.isNaN(draft.creditCharge[15]) ? '' : draft.creditCharge[15]} onChange={event => setDraft(current => ({ ...current, creditCharge: { ...current.creditCharge, 15: setNumeric(event.target.value) } }))} style={fieldStyle} />
                </label>
                <label style={labelStyle}>
                  30-day credit charge
                  <input type="number" min="0" max="100" step="0.1" value={Number.isNaN(draft.creditCharge[30]) ? '' : draft.creditCharge[30]} onChange={event => setDraft(current => ({ ...current, creditCharge: { ...current.creditCharge, 30: setNumeric(event.target.value) } }))} style={fieldStyle} />
                </label>
              </div>
            </ScreenCard>
            <ScreenCard style={{ marginBottom: 18 }}>
              <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Storage fees and late-payment penalties</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                <label style={labelStyle}>
                  Free storage after ready (days)
                  <input type="number" min="0" step="1" value={Number.isNaN(draft.storageFee.graceDays) ? '' : draft.storageFee.graceDays} onChange={event => setDraft(current => ({ ...current, storageFee: { ...current.storageFee, graceDays: setNumeric(event.target.value) } }))} style={fieldStyle} />
                </label>
                <label style={labelStyle}>
                  Storage fee per week (% of order total)
                  <input type="number" min="0" max="100" step="0.1" value={Number.isNaN(draft.storageFee.percentPerWeek) ? '' : draft.storageFee.percentPerWeek} onChange={event => setDraft(current => ({ ...current, storageFee: { ...current.storageFee, percentPerWeek: setNumeric(event.target.value) } }))} style={fieldStyle} />
                </label>
                <label style={labelStyle}>
                  Late-payment penalty per 30 days (% of amount due)
                  <input type="number" min="0" max="100" step="0.1" value={Number.isNaN(draft.latePaymentPenalty.percentPer30Days) ? '' : draft.latePaymentPenalty.percentPer30Days} onChange={event => setDraft(current => ({ ...current, latePaymentPenalty: { percentPer30Days: setNumeric(event.target.value) } }))} style={fieldStyle} />
                </label>
              </div>
            </ScreenCard>
            <ScreenCard style={{ marginBottom: 18 }}>
              <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Schedule the change</h2>
              <p style={{ color: screenColors.muted, fontSize: 12, marginBottom: 12 }}>
                New prices never apply immediately. Quotations and orders created before the effective time keep the prices they were given.
                The earliest allowed time is 10 minutes from now, so the Billing System and Customer Portal both receive the new prices before they apply.
              </p>
              {draftChanges.length > 0 && (
                <ul style={{ margin: '0 0 12px', paddingLeft: 18, color: screenColors.foreground, fontSize: 12, lineHeight: 1.7 }}>
                  {draftChanges.map(change => <li key={change}>{change}</li>)}
                </ul>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Takes effect at
                  <input type="datetime-local" value={effectiveAt} onChange={event => setEffectiveAt(event.target.value)} style={{ ...fieldStyle, marginTop: 5, width: 230 }} />
                </label>
                <ScreenButton onClick={save} disabled={draftChanges.length === 0}>
                  {scheduled ? 'Update scheduled change' : 'Validate and schedule change'}
                </ScreenButton>
              </div>
            </ScreenCard>
            <ScreenCard>
              <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Price change history</h2>
              {history.length === 0
                ? <EmptyState>No price changes have taken effect yet.</EmptyState>
                : [...history].reverse().map(entry => (
                    <div key={entry.id} style={{ padding: '8px 0', borderBottom: `1px solid ${screenColors.border}` }}>
                      <p style={{ color: screenColors.foreground, fontSize: 13, fontWeight: 600 }}>{entry.id} · effective {formatDateTime(entry.effectiveAt)}</p>
                      <p style={{ color: screenColors.muted, fontSize: 12 }}>{entry.source} · scheduled {formatDateTime(entry.scheduledAt)}</p>
                      <p style={{ color: screenColors.foreground, fontSize: 12, marginTop: 3 }}>{entry.changes.join('; ')}</p>
                    </div>
                  ))}
            </ScreenCard>
          </>
        )}
    </div>
  )
}
