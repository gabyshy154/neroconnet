import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../config'
import { seedData } from '../data/seed'
import {
  addDays,
  dailySeries,
  demandByProduct,
  filterByCompletedAtPeriod,
  filterByDateRange,
  filterByPeriod,
  filterByPostedAtPeriod,
  getDailyOrderSales,
  getPeriodRange,
} from './reporting'

describe('reporting period filters', () => {
  const rows = [
    { id: 'today', createdAt: '2026-11-06T12:00:00.000Z' },
    { id: 'this-week', createdAt: '2026-11-02T12:00:00.000Z' },
    { id: 'last-week', createdAt: '2026-11-01T12:00:00.000Z' },
  ]
  const now = new Date(2026, 10, 6, 12)

  it('filters daily, weekly, and monthly data to different date ranges', () => {
    expect(filterByPeriod(rows, 'Daily', now).map(row => row.id)).toEqual(['today'])
    expect(filterByPeriod(rows, 'Weekly', now).map(row => row.id)).toEqual(['today', 'this-week'])
    expect(filterByPeriod(rows, 'Monthly', now).map(row => row.id)).toEqual(rows.map(row => row.id))
  })

  it('uses the configured demo date by default rather than the system date', () => {
    expect(DEMO_TODAY).toBe('2026-11-06')
    expect(filterByPeriod(rows, 'Daily').map(row => row.id)).toEqual(['today'])
    expect(filterByPeriod(rows, 'Weekly').map(row => row.id)).toEqual(['today', 'this-week'])
    expect(filterByPeriod(rows, 'Monthly').map(row => row.id)).toEqual(rows.map(row => row.id))
  })

  it('groups dashboard sales by createdAt date and sorts chronologically, independent of order sequence', () => {
    expect(getDailyOrderSales([
      { createdAt: '2026-11-06T12:00:00.000Z', amountPaid: 200 },
      { createdAt: '2026-11-02T09:00:00.000Z', amountPaid: 100 },
      { createdAt: '2026-11-06T16:00:00.000Z', amountPaid: 50 },
    ])).toEqual([
      { date: '2026-11-02', sales: 100 },
      { date: '2026-11-06', sales: 250 },
    ])
  })

  it('keeps every Reports period populated from the demo orders', () => {
    expect(filterByPeriod(seedData.orders, 'Daily').length).toBeGreaterThan(0)
    expect(filterByPeriod(seedData.orders, 'Weekly').length).toBeGreaterThan(0)
    expect(filterByPeriod(seedData.orders, 'Monthly').length).toBeGreaterThan(0)
    expect(filterByPeriod(seedData.orders, 'Daily').map(order => order.id)).toEqual([
      'NPS-20261106-001',
      'NPS-20261106-002',
      'NPS-20261106-003',
      'NPS-20261106-004',
      'NPS-20261106-005',
    ])
  })

  it('filters commission entries by postedAt for Today and This Week', () => {
    expect(filterByPostedAtPeriod(seedData.commissionPayouts, 'Daily').map(payout => payout.orderId))
      .toEqual(['NPS-20261102-001', 'NPS-20261106-004'])
    expect(filterByPostedAtPeriod(seedData.commissionPayouts, 'Weekly').map(payout => payout.orderId))
      .toEqual(['NPS-20261102-001', 'NPS-20261104-001', 'NPS-20261106-004'])
  })

  it('groups only completed orders by completion date for Cost & Profit', () => {
    expect(filterByCompletedAtPeriod(seedData.orders, 'Daily').map(order => order.id))
      .toEqual(['NPS-20261102-001', 'NPS-20261106-004'])
    expect(filterByCompletedAtPeriod(seedData.orders, 'Monthly').map(order => order.id))
      .toEqual(['NPS-20261102-001', 'NPS-20261104-001', 'NPS-20261106-004'])
  })

  it('filters by a custom inclusive date range and rejects a reversed range', () => {
    const range = { from: '2026-11-02', to: '2026-11-04' }
    expect(filterByDateRange(rows, range, row => row.createdAt).map(row => row.id)).toEqual(['this-week'])
    expect(getPeriodRange('Weekly', '2026-11-06')).toEqual({ from: '2026-11-02', to: '2026-11-06' })
    expect(addDays('2026-11-06', -30)).toBe('2026-10-07')
    expect(() => filterByDateRange(rows, { from: '2026-11-06', to: '2026-11-01' }, row => row.createdAt))
      .toThrow(/start date/)
  })
})

describe('demand by product', () => {
  it('totals pieces per product from paid orders, most first, with each share of pieces', () => {
    expect(demandByProduct([
      { product: 'Mug', pieces: 10, amountPaid: 500 },
      { product: 'Cap', pieces: 30, amountPaid: 900 },
      { product: 'Mug', pieces: 20, amountPaid: 100 },
      { product: 'Tote', pieces: 50, amountPaid: 0 },
    ])).toEqual([
      { product: 'Cap', pieces: 30, orders: 1, sharePercent: 50 },
      { product: 'Mug', pieces: 30, orders: 2, sharePercent: 50 },
    ])
    expect(demandByProduct([])).toEqual([])
  })

  it('agrees with the pricing alerts on the demo data', () => {
    const monthly = demandByProduct(filterByPeriod(seedData.orders, 'Monthly'))
    expect(monthly[0]).toEqual({ product: 'Custom T-Shirt', pieces: 27, orders: 3, sharePercent: 29.7 })
    // Printed Tote Bag has no payment yet, so it does not count as demand.
    expect(monthly.some(item => item.product === 'Printed Tote Bag')).toBe(false)
  })
})


describe('daily chart series', () => {
  it('has one entry per day in the range, with zero for days without sales', () => {
    const rows = [
      { at: '2026-11-02T08:00:00.000Z', amount: 100 },
      { at: '2026-11-04T08:00:00.000Z', amount: 50 },
      { at: '2026-11-04T09:00:00.000Z', amount: 25 },
      { at: '2026-11-09T08:00:00.000Z', amount: 999 },
    ]
    expect(dailySeries(rows, { from: '2026-11-02', to: '2026-11-05' }, row => row.at, row => row.amount)).toEqual([
      { date: '2026-11-02', total: 100 },
      { date: '2026-11-03', total: 0 },
      { date: '2026-11-04', total: 75 },
      { date: '2026-11-05', total: 0 },
    ])
  })
})
