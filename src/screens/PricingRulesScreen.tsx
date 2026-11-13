import { useEffect, useState } from 'react'
import type { PricingRules, Tier } from '../types'
import { formatCurrency } from '../lib/admin'
import { useAdminStore } from '../store/adminStore'
import { EmptyState, ScreenButton, ScreenCard, ScreenFeedback, ScreenTitle, screenColors } from '../components/ScreenUI'

const tiers: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum']

export default function PricingRulesScreen() {
  const rules = useAdminStore(state => state.pricingRules)
  const updatePricingRules = useAdminStore(state => state.updatePricingRules)
  const [draft, setDraft] = useState<PricingRules>(rules)
  const [success, setSuccess] = useState('Pricing rules loaded from the local store.')
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(structuredClone(rules))
  }, [rules])

  const setNumeric = (value: string): number => value.trim() === '' ? Number.NaN : Number(value)
  const save = () => {
    setSuccess('')
    setError('')
    try {
      updatePricingRules(draft)
      setSuccess('Pricing rules saved successfully.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Pricing rules could not be saved.')
    }
  }
  const setProductPrice = (product: string, value: string) => {
    setDraft(current => ({
      ...current,
      productPrices: { ...current.productPrices, [product]: setNumeric(value) },
    }))
  }
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
      <ScreenTitle title="Pricing Rules" subtitle="Edit product prices, discounts, rush, and credit-term percentages." />
      <ScreenFeedback success={success} error={error} />
      {Object.keys(draft.productPrices).length === 0
        ? <EmptyState>No pricing rules have been configured.</EmptyState>
        : (
          <>
            <ScreenCard style={{ marginBottom: 18 }}>
              <h2 style={{ color: screenColors.foreground, fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Product prices (₱ per piece)</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                {Object.entries(draft.productPrices).map(([product, price]) => (
                  <label key={product} style={labelStyle}>
                    {product} — {Number.isFinite(price) ? formatCurrency(price) : 'Invalid price'}
                    <input type="number" min="0" step="0.01" value={Number.isNaN(price) ? '' : price} onChange={event => setProductPrice(product, event.target.value)} style={fieldStyle} />
                  </label>
                ))}
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
            <ScreenButton onClick={save}>Validate and save pricing rules</ScreenButton>
          </>
        )}
    </div>
  )
}
