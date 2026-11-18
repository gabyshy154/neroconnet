import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../config'
import { seedData } from '../data/seed'
import { filterByDateAccessor, filterByPeriod, filterByPostedAtPeriod, getDailyOrderSales } from './reporting'
import { getCostProfitSummary, getCostProfitSummaryForRows } from './admin'

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
      'NPS-20261106-011',
    ])
  })

  it('applies completed-sales period filtering by payout postedAt', () => {
    const allCompleted = getCostProfitSummary(seedData.orders, seedData.commissionPayouts)
    const dailyRows = filterByDateAccessor(allCompleted.rows, 'Daily', row => row.completionDate)
    const weeklyRows = filterByDateAccessor(allCompleted.rows, 'Weekly', row => row.completionDate)
    const monthlyRows = filterByDateAccessor(allCompleted.rows, 'Monthly', row => row.completionDate)
    expect(dailyRows.map(row => row.order.id))
      .toEqual(['NPS-20261106-008', 'NPS-20261106-011'])
    expect(weeklyRows.map(row => row.order.id))
      .toEqual(['NPS-20261106-008', 'NPS-20261106-009', 'NPS-20261106-011'])
    expect(monthlyRows.map(row => row.order.id))
      .toEqual(['NPS-20261106-008', 'NPS-20261106-009', 'NPS-20261106-011'])

    expect(getCostProfitSummaryForRows(dailyRows).totals.commission).toBe(280)
    expect(getCostProfitSummaryForRows(weeklyRows).totals.commission).toBe(320)
    expect(getCostProfitSummaryForRows(dailyRows).totals.netProfit).toBe(3220)
    expect(getCostProfitSummaryForRows(weeklyRows).totals.netProfit).toBe(3560)
    expect(getCostProfitSummaryForRows(monthlyRows).totals.netProfit).toBe(3560)
  })

  it('matches Cost & Profit commission totals to Commission payout totals', () => {
    const allCompleted = getCostProfitSummary(seedData.orders, seedData.commissionPayouts)
    const dailyCostRows = filterByDateAccessor(allCompleted.rows, 'Daily', row => row.completionDate)
    const weeklyCostRows = filterByDateAccessor(allCompleted.rows, 'Weekly', row => row.completionDate)
    const dailyPayouts = filterByPostedAtPeriod(seedData.commissionPayouts, 'Daily')
    const weeklyPayouts = filterByPostedAtPeriod(seedData.commissionPayouts, 'Weekly')
    expect(getCostProfitSummaryForRows(dailyCostRows).totals.commission)
      .toBe(dailyPayouts.reduce((sum, payout) => sum + payout.amount, 0))
    expect(getCostProfitSummaryForRows(weeklyCostRows).totals.commission)
      .toBe(weeklyPayouts.reduce((sum, payout) => sum + payout.amount, 0))
  })

  it('filters commission entries by postedAt for Today and This Week', () => {
    expect(filterByPostedAtPeriod(seedData.commissionPayouts, 'Daily').map(payout => payout.orderId))
      .toEqual(['NPS-20261106-008', 'NPS-20261106-011'])
    expect(filterByPostedAtPeriod(seedData.commissionPayouts, 'Weekly').map(payout => payout.orderId))
      .toEqual(['NPS-20261106-008', 'NPS-20261106-009', 'NPS-20261106-011'])
  })
})
