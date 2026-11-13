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

function filterRowsByPeriod<T>(
  rows: readonly T[],
  period: ReportingPeriod,
  now: string | Date,
  getDate: (row: T) => string,
): T[] {
  const reference = referenceDate(now)
  const start = getPeriodStart(period, reference)
  const end = dateKey(reference)
  return rows.filter(row => {
    const date = getDate(row).slice(0, 10)
    return date >= start && date <= end
  })
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
