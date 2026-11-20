import { DEMO_TODAY } from '../config'

export type ReportingPeriod = 'Daily' | 'Weekly' | 'Monthly'

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function referenceDate(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) {
    throw new RangeError(`Invalid reference date "${value}". Expected YYYY-MM-DD.`)
  }
  const date = new Date(year, month - 1, day)
  if (dateKey(date) !== value) {
    throw new RangeError(`Invalid reference date "${value}". Expected YYYY-MM-DD.`)
  }
  return date
}

export function getPeriodStart(period: ReportingPeriod, now: string | Date = DEMO_TODAY): string {
  const start = referenceDate(now)
  if (period === 'Weekly') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  } else if (period === 'Monthly') {
    start.setDate(1)
  }
  return dateKey(start)
}

export function filterByPeriod<T extends { createdAt: string }>(
  rows: readonly T[],
  period: ReportingPeriod,
  now: string | Date = DEMO_TODAY,
): T[] {
  return filterRowsByPeriod(rows, period, now, row => row.createdAt)
}

export function filterByPostedAtPeriod<T extends { postedAt: string }>(
  rows: readonly T[],
  period: ReportingPeriod,
  now: string | Date = DEMO_TODAY,
): T[] {
  return filterRowsByPeriod(rows, period, now, row => row.postedAt)
}

/** Completed orders (claimed and paid in full) grouped by their completion date. */
export function filterByCompletedAtPeriod<T extends { completedAt?: string }>(
  rows: readonly T[],
  period: ReportingPeriod,
  now: string | Date = DEMO_TODAY,
): (T & { completedAt: string })[] {
  const completed = rows.filter((row): row is T & { completedAt: string } => Boolean(row.completedAt))
  return filterRowsByPeriod(completed, period, now, row => row.completedAt)
}

export interface DateRange {
  from: string
  to: string
}

export function getPeriodRange(period: ReportingPeriod, now: string | Date = DEMO_TODAY): DateRange {
  return { from: getPeriodStart(period, now), to: dateKey(referenceDate(now)) }
}

/** Keeps rows whose date (YYYY-MM-DD prefix) falls inside the inclusive range. */
export function filterByDateRange<T>(
  rows: readonly T[],
  range: DateRange,
  getDate: (row: T) => string,
): T[] {
  referenceDate(range.from)
  referenceDate(range.to)
  if (range.from > range.to) {
    throw new RangeError('The start date must be on or before the end date.')
  }
  return rows.filter(row => {
    const date = getDate(row).slice(0, 10)
    return date >= range.from && date <= range.to
  })
}

export function addDays(date: string, days: number): string {
  const result = referenceDate(date)
  result.setDate(result.getDate() + days)
  return dateKey(result)
}

function filterRowsByPeriod<T>(
  rows: readonly T[],
  period: ReportingPeriod,
  now: string | Date,
  getDate: (row: T) => string,
): T[] {
  return filterByDateRange(rows, getPeriodRange(period, now), getDate)
}

/**
 * One entry per day in the range (inclusive), with zero for days that have no rows,
 * so a chart shows gaps and evenly spaced dates.
 */
export function dailySeries<T>(
  rows: readonly T[],
  range: DateRange,
  getDate: (row: T) => string,
  getAmount: (row: T) => number,
): { date: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const row of filterByDateRange(rows, range, getDate)) {
    const date = getDate(row).slice(0, 10)
    totals.set(date, (totals.get(date) ?? 0) + getAmount(row))
  }
  const series: { date: string; total: number }[] = []
  for (let date = range.from; date <= range.to; date = addDays(date, 1)) {
    series.push({ date, total: totals.get(date) ?? 0 })
  }
  return series
}

export interface ProductDemand {
  product: string
  pieces: number
  orders: number
  /** Share of all pieces sold in the period, in percent (one decimal). */
  sharePercent: number
}

/**
 * Input-based demand estimate: pieces sold per product, most first. Counts only orders with a
 * payment recorded, the same rule the pricing alerts use, so both agree.
 */
export function demandByProduct<T extends { product: string; pieces: number; amountPaid: number }>(
  orders: readonly T[],
): ProductDemand[] {
  const totals = new Map<string, { pieces: number; orders: number }>()
  for (const order of orders) {
    if (order.amountPaid > 0) {
      const current = totals.get(order.product) ?? { pieces: 0, orders: 0 }
      totals.set(order.product, { pieces: current.pieces + order.pieces, orders: current.orders + 1 })
    }
  }
  const allPieces = [...totals.values()].reduce((total, item) => total + item.pieces, 0)
  return [...totals.entries()]
    .map(([product, item]) => ({
      product,
      pieces: item.pieces,
      orders: item.orders,
      sharePercent: allPieces === 0 ? 0 : Math.round((item.pieces / allPieces) * 1000) / 10,
    }))
    .sort((a, b) => b.pieces - a.pieces || a.product.localeCompare(b.product))
}

export interface DailySales {
  date: string
  sales: number
}

export function getDailyOrderSales<T extends { createdAt: string; amountPaid: number }>(
  orders: readonly T[],
): DailySales[] {
  const totals = new Map<string, number>()
  for (const order of orders) {
    const date = order.createdAt.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(order.amountPaid)) {
      throw new Error('Order sales data must include a valid creation date and finite paid amount.')
    }
    totals.set(date, (totals.get(date) ?? 0) + order.amountPaid)
  }
  return [...totals.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, sales]) => ({ date, sales }))
}
