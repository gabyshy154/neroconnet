import { useState } from 'react'
import type { PageId } from '../App'

interface Props {
  navigate: (page: PageId) => void
  isLoggedIn: boolean
}

type OrderStatus = 'Received' | 'In Production' | 'Ready for Claim' | 'Claimed'

interface Order {
  id: string
  date: string
  items: { name: string; qty: number; total: number }[]
  total: number
  status: OrderStatus
  quotationNo: string
  claimMethod: string
  deadline: string
  paymentTerms: string
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  'Received': 'bg-stone-100 text-stone-600 border-stone-200',
  'In Production': 'bg-blue-50 text-blue-700 border-blue-200',
  'Ready for Claim': 'bg-olive-50 text-olive-700 border-olive-200',
  'Claimed': 'bg-green-50 text-green-700 border-green-200',
}

const PRODUCTION_STAGES: OrderStatus[] = ['Received', 'In Production', 'Ready for Claim', 'Claimed']

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2025-0041',
    quotationNo: 'NC-2025-0041',
    date: 'July 18, 2025',
    status: 'Ready for Claim',
    claimMethod: 'Pick-up',
    deadline: 'July 25, 2025 · 4:00 PM',
    paymentTerms: '50% Downpayment / 50% Before Release',
    total: 14500,
    items: [
      { name: 'Grandsler Shirt (Full Sublimation)', qty: 50, total: 11000 },
      { name: 'Lanyard', qty: 50, total: 3500 },
    ],
  },
  {
    id: 'ORD-2025-0038',
    quotationNo: 'NC-2025-0038',
    date: 'July 10, 2025',
    status: 'Claimed',
    claimMethod: 'Delivery',
    deadline: 'July 15, 2025 · 2:00 PM',
    paymentTerms: 'Full Payment (100%)',
    total: 8750,
    items: [
      { name: 'Crown Polo Premium (Screen Print)', qty: 25, total: 8750 },
    ],
  },
  {
    id: 'ORD-2025-0029',
    quotationNo: 'NC-2025-0029',
    date: 'June 22, 2025',
    status: 'Claimed',
    claimMethod: 'Pick-up',
    deadline: 'June 28, 2025 · 5:00 PM',
    paymentTerms: '15 Days Credit, add 20%',
    total: 4200,
    items: [
      { name: 'Business Card', qty: 200, total: 3000 },
      { name: 'Fridge Magnet', qty: 50, total: 1200 },
    ],
  },
  {
    id: 'ORD-2025-0054',
    quotationNo: 'NC-2025-0054',
    date: 'July 21, 2025',
    status: 'In Production',
    claimMethod: 'Delivery',
    deadline: 'July 30, 2025 · 3:00 PM',
    paymentTerms: '50% Downpayment / 50% Before Release',
    total: 22000,
    items: [
      { name: 'Lifeline Polo Male (Digital Print)', qty: 60, total: 17700 },
      { name: 'Eco Bag', qty: 30, total: 4300 },
    ],
  },
]

export default function OrderTracking({ navigate, isLoggedIn }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-9 h-9 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
          </div>
          <h2 className="font-display text-2xl font-700 text-ink mb-2">Sign in to view orders</h2>
          <p className="text-stone-500 mb-6">Your order history is tied to your NeroConnect account.</p>
          <button
            onClick={() => navigate('auth')}
            className="bg-olive-500 hover:bg-olive-600 text-white font-display font-700 px-8 py-3 rounded-xl transition-all"
          >
            Log In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-parchment pb-20">
      <div className="bg-white border-b border-stone-200 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-olive-600 text-xs font-semibold tracking-widest uppercase mb-2">Account</p>
          <h1 className="font-display text-4xl font-700 text-ink">My Orders</h1>
          <p className="text-stone-500 mt-2">{MOCK_ORDERS.length} orders found</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-8">
        {selectedOrder ? (
          <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} navigate={navigate} />
        ) : (
          <div className="space-y-4">
            {MOCK_ORDERS.sort((a, b) => b.id.localeCompare(a.id)).map((order) => (
              <div
                key={order.id}
                className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-stone-300 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-display font-700 text-ink">{order.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-600 border ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-stone-400 text-sm">{order.date}</p>
                  </div>
                  <p className="font-display font-700 text-ink text-lg flex-shrink-0">₱{order.total.toLocaleString()}</p>
                </div>

                <div className="space-y-1 mb-5">
                  {order.items.map((item) => (
                    <p key={item.name} className="text-stone-600 text-sm">
                      {item.name} — <span className="text-stone-400">×{item.qty}</span>
                    </p>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-2 text-sm font-600 text-olive-700 bg-olive-50 hover:bg-olive-100 rounded-lg transition-all"
                  >
                    View Details
                  </button>
                  {order.status === 'Claimed' && <button
                    onClick={() => navigate('customize')}
                    className="px-4 py-2 text-sm font-600 text-stone-600 border border-stone-200 hover:border-stone-300 rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Reorder / Clone This Order
                  </button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OrderDetail({ order, onBack, navigate }: { order: Order; onBack: () => void; navigate: (page: PageId) => void }) {
  const currentStageIdx = PRODUCTION_STAGES.indexOf(order.status)

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone-500 hover:text-ink text-sm font-500 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to Orders
      </button>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-6">
          {/* Order header */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-display font-700 text-ink text-xl">{order.id}</p>
                <p className="text-stone-400 text-sm mt-0.5">{order.date} · {order.quotationNo}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-600 border ${STATUS_COLORS[order.status]}`}>
                {order.status}
              </span>
            </div>

            {/* Production stages */}
            <div className="mt-6">
              <p className="text-xs font-600 text-stone-400 uppercase tracking-wider mb-4">Production Progress</p>
              <div className="space-y-3">
                {PRODUCTION_STAGES.map((stage, i) => {
                  const done = i < currentStageIdx
                  const active = i === currentStageIdx
                  return (
                    <div key={stage} className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        done ? 'bg-olive-500' : active ? 'bg-ink ring-2 ring-offset-2 ring-ink' : 'bg-stone-200'
                      }`}>
                        {done ? (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                        ) : (
                          <div className={`w-2 h-2 rounded-full ${active ? 'bg-white' : 'bg-stone-400'}`}/>
                        )}
                      </div>
                      <div className={`flex-1 border-b pb-3 ${i === PRODUCTION_STAGES.length - 1 ? 'border-transparent' : 'border-stone-100'}`}>
                        <p className={`text-sm font-${active ? '700' : '500'} ${done || active ? 'text-ink' : 'text-stone-400'}`}>
                          {stage}
                        </p>
                        {active && (
                          <p className="text-xs text-olive-600 mt-0.5 font-500">Current stage</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
              <p className="font-display font-700 text-ink">Items</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.name} className="border-b border-stone-50 last:border-0">
                    <td className="px-6 py-4 font-500 text-ink">{item.name}</td>
                    <td className="px-6 py-4 text-stone-400 text-right">×{item.qty}</td>
                    <td className="px-6 py-4 text-right font-700 text-ink">₱{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 border-t border-stone-200">
                  <td colSpan={2} className="px-6 py-4 font-display font-700 text-ink">Total</td>
                  <td className="px-6 py-4 text-right font-display font-700 text-olive-700 text-lg">
                    ₱{order.total.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <p className="font-display font-700 text-ink mb-4">Order Summary</p>
            <div className="space-y-4 text-sm">
              <div><p className="text-stone-400 text-xs mb-1">Claim Method</p><p className="text-ink font-600">{order.claimMethod}</p></div>
              <div><p className="text-stone-400 text-xs mb-1">Schedule / Deadline</p><p className="text-ink font-600">{order.deadline}</p></div>
              <div><p className="text-stone-400 text-xs mb-1">Payment Terms</p><p className="text-ink font-600">{order.paymentTerms}</p></div>
            </div>
          </div>
          {order.status === 'Claimed' && <button
            onClick={() => navigate('customize')}
            className="w-full bg-olive-500 hover:bg-olive-600 text-white font-display font-700 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Reorder / Clone This Order
          </button>}
          <button className="w-full border border-stone-200 text-ink font-display font-600 py-3 rounded-xl hover:border-olive-400 transition-all text-sm">
            Download Invoice
          </button>
          <button
            onClick={() => navigate('contact')}
            className="w-full border border-stone-200 text-stone-600 font-600 py-3 rounded-xl hover:border-stone-300 transition-all text-sm"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}
