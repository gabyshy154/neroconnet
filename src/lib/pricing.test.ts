import { describe, expect, it } from 'vitest'
import { pricingPlaceholders } from '../config'
import { seedData } from '../data/seed'
import {
  addProduct,
  buildPricingSuggestions,
  defaultEffectiveAt,
  describePricingChanges,
  pricingRulesAt,
  productPriceList,
  screenPrintCharge,
  sellingPrice,
  validateEffectiveAt,
} from './pricing'
import { validatePricingRules } from './admin'

describe('Formula 2 selling price', () => {
  it('computes (material + labor + overhead) × (1 + markup)', () => {
    expect(sellingPrice({ materialCost: 150, laborCost: 80, overheadCost: 20, markupPercent: 40 })).toBe(350)
    expect(sellingPrice({ materialCost: 150, laborCost: 80, overheadCost: 20, markupPercent: 40 }, 45)).toBe(362.5)
  })

  it('rejects negative costs or markup', () => {
    expect(() => sellingPrice({ materialCost: -1, laborCost: 0, overheadCost: 0, markupPercent: 0 })).toThrow(/greater than or equal to zero/)
  })

  it('derives the Billing System price list from the cost inputs', () => {
    expect(productPriceList(pricingPlaceholders)['Sublimation Jersey']).toBe(420)
  })
})

describe('scheduled price changes', () => {
  const later = {
    ...pricingPlaceholders,
    rushPercent: 20,
    productCosts: {
      ...pricingPlaceholders.productCosts,
      'Sublimation Jersey': { ...pricingPlaceholders.productCosts['Sublimation Jersey'], materialCost: 190 },
    },
  }

  it('defaults to the start of the next day, but never sooner than the lead time', () => {
    const now = new Date(2026, 10, 6, 14, 30).toISOString()
    expect(defaultEffectiveAt(now)).toBe(new Date(2026, 10, 7, 0, 0).toISOString())
    const lateNight = new Date(2026, 10, 6, 23, 55).toISOString()
    expect(defaultEffectiveAt(lateNight)).toBe(new Date(2026, 10, 7, 0, 5).toISOString())
  })

  it('rejects effective times inside the lead time or invalid dates', () => {
    const now = '2026-11-06T05:00:00.000Z'
    expect(() => validateEffectiveAt('2026-11-06T05:09:00.000Z', now)).toThrow(/at least 10 minutes/)
    expect(() => validateEffectiveAt('not a date', now)).toThrow(/valid date/)
    expect(() => validateEffectiveAt('2026-11-06T05:10:00.000Z', now)).not.toThrow()
  })

  it('prices a quotation with the rules in effect when it is created', () => {
    const scheduled = { rules: later, effectiveAt: '2026-11-07T00:00:00.000Z' }
    expect(pricingRulesAt(pricingPlaceholders, scheduled, '2026-11-06T23:59:59.000Z').rushPercent).toBe(15)
    expect(pricingRulesAt(pricingPlaceholders, scheduled, '2026-11-07T00:00:00.000Z').rushPercent).toBe(20)
    expect(pricingRulesAt(pricingPlaceholders, null, '2026-12-01T00:00:00.000Z').rushPercent).toBe(15)
  })

  it('describes what a change does', () => {
    expect(describePricingChanges(pricingPlaceholders, later)).toEqual([
      'Sublimation Jersey: ₱420.00 → ₱434.00',
      'Rush surcharge: 15% → 20%',
    ])
  })
})

describe('screen-print charge', () => {
  it('prices a job from color count and print area', () => {
    // 2 screens × ₱150 + 20 pieces × (2 colors × ₱10 + 80 sq in × ₱0.50)
    expect(screenPrintCharge(pricingPlaceholders, { pieces: 20, colors: 2, printAreaSqIn: 80 })).toBe(1500)
  })

  it('rejects jobs without pieces, colors, or print area', () => {
    expect(() => screenPrintCharge(pricingPlaceholders, { pieces: 0, colors: 1, printAreaSqIn: 10 })).toThrow(/whole numbers/)
    expect(() => screenPrintCharge(pricingPlaceholders, { pieces: 5, colors: 1, printAreaSqIn: 0 })).toThrow(/Print area/)
  })
})

describe('pricing suggestions from sales figures', () => {
  it('raises markup for high-demand products and lowers it for underperforming ones', () => {
    const suggestions = buildPricingSuggestions(pricingPlaceholders, seedData.orders, '2026-11-06')
    expect(suggestions.map(item => [item.product, item.suggestedMarkupPercent])).toEqual([
      ['Sublimation Polo', 35],
      ['Training Shorts', 45],
      ['Custom T-Shirt', 45],
      ['Printed Tote Bag', 45],
    ])
    expect(suggestions.find(item => item.product === 'Custom T-Shirt')).toMatchObject({
      currentPrice: 350,
      suggestedPrice: 362.5,
      basis: expect.stringContaining('27 pieces sold'),
    })
    expect(suggestions.find(item => item.product === 'Printed Tote Bag')?.basis).toContain('Underperforming')
  })

  it('ignores unpaid orders and orders outside the lookback window', () => {
    const suggestions = buildPricingSuggestions(
      { productCosts: { Mug: { materialCost: 50, laborCost: 20, overheadCost: 10, markupPercent: 50 } } },
      [
        { product: 'Mug', pieces: 40, amountPaid: 0, createdAt: '2026-11-05T08:00:00.000Z' },
        { product: 'Mug', pieces: 40, amountPaid: 500, createdAt: '2026-09-01T08:00:00.000Z' },
        { product: 'Mug', pieces: 10, amountPaid: 500, createdAt: '2026-11-01T08:00:00.000Z' },
      ],
      '2026-11-06',
    )
    expect(suggestions).toEqual([])
  })
})

describe('adding a product', () => {
  const rules = pricingPlaceholders

  it('adds a product with empty costs that must be filled before scheduling', () => {
    const next = addProduct(rules, '  Hoodie  ')
    expect(Object.keys(next.productCosts)).toContain('Hoodie')
    expect(rules.productCosts).not.toHaveProperty('Hoodie')
    expect(validatePricingRules(next).some(error => error.includes('"Hoodie"'))).toBe(true)
    const zero = { ...next, productCosts: { ...next.productCosts, Hoodie: { materialCost: 0, laborCost: 0, overheadCost: 0, markupPercent: 0 } } }
    expect(validatePricingRules(zero)).toContain('Enter at least one cost for "Hoodie"; a ₱0.00 selling price is not allowed.')
    const filled = { ...next, productCosts: { ...next.productCosts, Hoodie: { materialCost: 300, laborCost: 80, overheadCost: 20, markupPercent: 25 } } }
    expect(validatePricingRules(filled)).toEqual([])
    expect(describePricingChanges(rules, filled)).toContain('Hoodie: added at ₱500.00')
  })

  it('rejects blank, too long, and duplicate names', () => {
    const existing = Object.keys(rules.productCosts)[0]
    expect(() => addProduct(rules, '   ')).toThrow('Enter a product name.')
    expect(() => addProduct(rules, 'x'.repeat(41))).toThrow('40 characters or fewer')
    expect(() => addProduct(rules, existing.toUpperCase())).toThrow('already in the price list')
  })
})
