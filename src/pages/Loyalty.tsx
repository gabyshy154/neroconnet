import { useState } from 'react'
import type { PageId } from '../App'

interface Props {
  navigate: (page: PageId) => void
  isLoggedIn: boolean
  user: { name: string; email: string } | null
}

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

const TIERS: { name: Tier; min: number; fee: string; discount: string; color: string; bg: string; ring: string; perks: string[] }[] = [
  {
    name: 'Bronze',
    min: 0,
    fee: 'Free',
    discount: '3% discount',
    color: '#92400E',
    bg: '#FEF3C7',
    ring: '#D97706',
    perks: ['3% member discount', '1 point per ₱1,000 spent'],
  },
  {
    name: 'Silver',
    min: 15,
    fee: '₱50',
    discount: '5% discount',
    color: '#374151',
    bg: '#F3F4F6',
    ring: '#6B7280',
    perks: ['5% member discount', '1 point per ₱1,000 spent'],
  },
  {
    name: 'Gold',
    min: 50,
    fee: '₱80',
    discount: '8% discount',
    color: '#78350F',
    bg: '#FFFBEB',
    ring: '#F59E0B',
    perks: ['8% member discount', '1 point per ₱1,000 spent'],
  },
  {
    name: 'Platinum',
    min: 150,
    fee: '₱100',
    discount: '10% discount',
    color: '#1E3A5F',
    bg: '#EFF6FF',
    ring: '#3B82F6',
    perks: ['10% member discount', '1 point per ₱1,000 spent'],
  },
]

const MOCK_POINTS = 42
const MOCK_TIER: Tier = 'Silver'
const NEXT_TIER = TIERS[TIERS.findIndex((t) => t.name === MOCK_TIER) + 1]
const CURRENT_TIER_DATA = TIERS.find((t) => t.name === MOCK_TIER)!

function QRCode({ value }: { value: string }) {
  const size = 120
  const cells = 21
  const cellSize = size / cells
  const seed = value.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

  const pattern = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      if (r < 7 && c < 7) return (r === 0 || r === 6 || c === 0 || c === 6) || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      if (r < 7 && c > cells - 8) return (r === 0 || r === 6 || c === cells - 1 || c === cells - 7) || (r >= 2 && r <= 4 && c >= cells - 5 && c <= cells - 3)
      if (r > cells - 8 && c < 7) return (r === cells - 1 || r === cells - 7 || c === 0 || c === 6) || (r >= cells - 5 && r <= cells - 3 && c >= 2 && c <= 4)
      return ((r * 37 + c * 13 + seed) % 7) > 3
    })
  )

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded">
      <rect width={size} height={size} fill="white"/>
      {pattern.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize} y={r * cellSize}
              width={cellSize} height={cellSize}
              fill="#1a1918"
            />
          ) : null
        )
      )}
    </svg>
  )
}

export default function Loyalty({ navigate, isLoggedIn, user }: Props) {
  const [enrolled, setEnrolled] = useState(false)
  const [showEnrollFlow, setShowEnrollFlow] = useState(false)
  const [upgradeTier, setUpgradeTier] = useState<Tier | null>(null)

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-olive-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-9 h-9 text-olive-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/>
            </svg>
          </div>
          <h2 className="font-display text-2xl font-700 text-ink mb-2">Nero Privilege Card</h2>
          <p className="text-stone-500 mb-6">Log in to view your NPC, points balance, and membership benefits.</p>
          <button onClick={() => navigate('auth')} className="bg-olive-500 hover:bg-olive-600 text-white font-display font-700 px-8 py-3 rounded-xl transition-all">
            Log In
          </button>
        </div>
      </div>
    )
  }

  if (!enrolled && !showEnrollFlow) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-olive-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-olive-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/>
            </svg>
          </div>
          <h2 className="font-display text-2xl font-700 text-ink mb-2">Join NPC</h2>
          <p className="text-stone-500 mb-2">Nero Privilege Card</p>
          <p className="text-stone-500 text-sm mb-6 leading-relaxed">
            Earn 1 point per ₱1,000 spent. Unlock exclusive discounts, priority service, and more as you level up through Bronze → Silver → Gold → Platinum.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEnrollFlow(true)}
              className="flex-1 bg-olive-500 hover:bg-olive-600 text-white font-display font-700 py-3 rounded-xl transition-all"
            >
              Yes, Enroll Me
            </button>
            <button
              onClick={() => navigate('home')}
              className="flex-1 border border-stone-200 text-stone-600 font-600 py-3 rounded-xl hover:border-stone-300 transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showEnrollFlow) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8">
          <h2 className="font-display text-xl font-700 text-ink mb-2">Terms &amp; Conditions</h2>
          <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-600 space-y-2 mb-6 max-h-48 overflow-y-auto leading-relaxed">
            <p>The Nero Privilege Card (NPC) is a membership program by Nero Printing Services and Trading.</p>
            <p>Points are earned at a rate of 1 point per ₱1,000 spent (exclusive of surcharges).</p>
            <p>Points have no cash value and cannot be transferred. Tier benefits are reviewed quarterly.</p>
            <p>Nero reserves the right to modify tier thresholds and benefits with 30-day notice.</p>
            <p>The NPC QR code is tied to your account and must be presented at the shop's Billing System counter to redeem benefits.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setEnrolled(true); setShowEnrollFlow(false) }}
              className="flex-1 bg-olive-500 hover:bg-olive-600 text-white font-display font-700 py-3 rounded-xl transition-all"
            >
              Accept &amp; Enroll
            </button>
            <button
              onClick={() => setShowEnrollFlow(false)}
              className="flex-1 border border-stone-200 text-stone-600 font-600 py-3 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progressToNext = NEXT_TIER ? Math.min(100, ((MOCK_POINTS - CURRENT_TIER_DATA.min) / (NEXT_TIER.min - CURRENT_TIER_DATA.min)) * 100) : 100
  const memberId = `NPC-2025-${user?.email.slice(0, 4).toUpperCase() ?? 'XXXX'}-0042`

  return (
    <div className="min-h-screen bg-parchment pb-20">
      <div className="bg-white border-b border-stone-200 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-olive-600 text-xs font-semibold tracking-widest uppercase mb-2">Membership</p>
          <h1 className="font-display text-4xl font-700 text-ink">Nero Privilege Card</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-10 space-y-8">
        {/* Card + QR */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* NPC Card */}
          <div
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #3a4729 0%, #5b6e42 50%, #7a9060 100%)', minHeight: '200px' }}
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}/>
            <div className="relative z-10">
              <p className="text-olive-200 text-xs font-600 tracking-widest uppercase mb-1">Nero</p>
              <p className="font-display font-800 text-2xl mb-4">Privilege Card · NPC</p>
              <div className="mb-4">
                <p className="font-display font-800 text-3xl">{MOCK_TIER}</p>
                <p className="text-olive-200 text-xs mt-0.5">Member Tier</p>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white/70 text-xs mb-0.5">Member</p>
                  <p className="font-display font-600">{user?.name ?? 'Member'}</p>
                  <p className="text-olive-200 text-xs mt-1 font-mono">{memberId}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-xs mb-0.5">Points</p>
                  <p className="font-display font-800 text-2xl">{MOCK_POINTS}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account QR */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col items-center justify-center">
            <p className="font-display font-600 text-ink text-sm mb-4">Membership QR Code</p>
            <QRCode value={memberId} />
            <p className="text-stone-400 text-xs mt-3 font-mono">{memberId}</p>
            <button
              onClick={() => {
                const svg = document.querySelector('svg[viewBox="0 0 120 120"]')
                if (!svg) return
                const source = new XMLSerializer().serializeToString(svg)
                const image = new Image()
                image.onload = () => {
                  const canvas = document.createElement('canvas')
                  canvas.width = 600
                  canvas.height = 600
                  const context = canvas.getContext('2d')
                  if (!context) return
                  context.fillStyle = '#ffffff'
                  context.fillRect(0, 0, 600, 600)
                  context.drawImage(image, 0, 0, 600, 600)
                  const link = document.createElement('a')
                  link.href = canvas.toDataURL('image/png')
                  link.download = 'nero-privilege-card-qr.png'
                  link.click()
                }
                image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
              }}
              className="mt-4 px-4 py-2 bg-ink text-white rounded-lg text-sm font-700"
            >
              Download QR Code
            </button>
            <p className="text-stone-500 text-xs mt-3 text-center">Show this QR at the shop's Billing System counter.</p>
          </div>
        </div>

        {/* Progress to next tier */}
        {NEXT_TIER && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-3">
              <p className="font-display font-700 text-ink">Progress to {NEXT_TIER.name}</p>
              <p className="text-stone-500 text-sm">{MOCK_POINTS} / {NEXT_TIER.min} pts</p>
            </div>
            <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-olive-500 rounded-full transition-all duration-700"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
            <p className="text-stone-400 text-xs mt-2">{NEXT_TIER.min - MOCK_POINTS} more points to reach {NEXT_TIER.name}</p>
          </div>
        )}

        {/* Tier comparison */}
        <div>
          <h2 className="font-display text-xl font-700 text-ink mb-4">Tier Benefits</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-5 border-2 transition-all ${
                  tier.name === MOCK_TIER
                    ? 'border-olive-500 shadow-md'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: tier.bg }}
              >
                {tier.name === MOCK_TIER && (
                  <p className="text-olive-600 text-xs font-700 tracking-widest uppercase mb-2">Current Tier</p>
                )}
                <div className="w-8 h-2 rounded-full mb-3" style={{ backgroundColor: tier.ring }}/>
                <p className="font-display font-800 text-lg mb-1" style={{ color: tier.color }}>{tier.name}</p>
                <p className="text-sm font-700 mb-1" style={{ color: tier.color }}>{tier.fee}</p>
                <p className="text-xs mb-3" style={{ color: tier.color, opacity: 0.8 }}>{tier.discount}</p>
                <ul className="space-y-1.5">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="text-xs flex items-start gap-1.5" style={{ color: tier.color }}>
                      <span className="mt-0.5 flex-shrink-0">•</span>
                      {perk}
                    </li>
                  ))}
                </ul>
                {TIERS.findIndex((item) => item.name === tier.name) > TIERS.findIndex((item) => item.name === MOCK_TIER) && (
                  <button onClick={() => setUpgradeTier(tier.name)} className="mt-4 w-full py-2 rounded-lg bg-white/70 text-xs font-700" style={{ color: tier.color }}>
                    Upgrade to {tier.name}
                  </button>
                )}
              </div>
            ))}
          </div>
          {upgradeTier && (
            <div className="mt-4 bg-white border border-olive-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-700 text-ink">Confirm {upgradeTier} membership</p>
                <p className="text-sm text-stone-500 mt-1">Your request will be recorded and finalized by Nero staff at the shop.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setUpgradeTier(null)} className="px-4 py-2 border border-stone-200 rounded-lg text-sm font-600">Cancel</button>
                <button onClick={() => setUpgradeTier(null)} className="px-4 py-2 bg-olive-500 text-white rounded-lg text-sm font-700">Request Upgrade</button>
              </div>
            </div>
          )}
        </div>

        {/* Points history */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
            <p className="font-display font-700 text-ink">Points History</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {[
                { date: 'Jul 18, 2025', desc: 'Order ORD-2025-0041', pts: '+14' },
                { date: 'Jul 10, 2025', desc: 'Order ORD-2025-0038', pts: '+8' },
                { date: 'Jun 22, 2025', desc: 'Order ORD-2025-0029', pts: '+4' },
                { date: 'May 03, 2025', desc: 'Enrollment Bonus', pts: '+10' },
                { date: 'Apr 15, 2025', desc: 'Order ORD-2025-0012', pts: '+6' },
              ].map((row) => (
                <tr key={row.date} className="border-b border-stone-50 last:border-0 hover:bg-stone-50">
                  <td className="px-6 py-3.5 text-stone-400">{row.date}</td>
                  <td className="px-6 py-3.5 text-ink font-500">{row.desc}</td>
                  <td className="px-6 py-3.5 text-right font-display font-700 text-olive-600">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
