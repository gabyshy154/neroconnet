import { useState } from 'react'
import type { PageId, QuotationItem } from '../App'

interface Props {
  navigate: (page: PageId) => void
  addToQuotation: (item: QuotationItem) => void
  isLoggedIn: boolean
}

const APPAREL = [
  'Grandsler Shirt', 'Crown Shirt', 'Grandsler Polo',
  'Lifeline Polo Female', 'Lifeline Polo Male', 'Crown Polo Premium',
]

const ALL_PRODUCTS = [
  ...APPAREL,
  'Silkscreen Printing', 'Vinyl Printing', 'J Handle Umbrella',
  'Customized Uniform', 'Fridge Magnet', 'Customized Bag',
  'Facemask Printing', 'Full Sublimation', 'Retractable Reel ID',
  'Lanyard', 'Eco Bag', 'Pin Badge', 'Business Card',
  'Tumbler', 'Mug Cup', 'ID', 'Insert Ball Pen', 'Folding Fan',
]

const MATERIALS: Record<string, string[]> = {
  apparel: ['Cotton', 'Polyester', 'Drift', 'Mixed'],
  other: ['N/A'],
}

const PRINT_TYPES = ['Full Sublimation', 'Screen Print', 'Digital Print', 'Vinyl']

const PRINT_ZONES = [
  { id: 'F1', label: 'F1 — Front Chest (10″ × 15″)' },
  { id: 'F2', label: 'F2 — Left Chest (4″ × 4″)' },
  { id: 'F3', label: 'F3 — Right Chest (4″ × 4″)' },
  { id: 'B1', label: 'B1 — Full Back (10″ × 15″)' },
  { id: 'B2', label: 'B2 — Upper Back (4″ × 4″)' },
  { id: 'SL', label: 'SL — Left Sleeve (4″ × 4″)' },
  { id: 'SR', label: 'SR — Right Sleeve (4″ × 4″)' },
]

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL']
const PRODUCT_SIZES: Record<string, string[]> = {
  'Grandsler Shirt': ['12', '14', '16', '18', '20 / XS', 'S', 'M', 'L', 'XL', '2XL'],
  'Crown Shirt': ['16', '18', '20 / S', 'S', 'M', 'L', 'XL', '2XL'],
  'Grandsler Polo': ['16', '18', '20 / S', 'S', 'M', 'L', 'XL'],
  'Lifeline Polo Female': ['L', 'XL', '2XL', '3XL', '4XL'],
  'Lifeline Polo Male': ['S', 'M', 'L', 'XL', '2XL'],
  'Crown Polo Premium': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
}
const T_SHIRTS = ['Grandsler Shirt', 'Crown Shirt']

const STEPS = ['Item', 'Material', 'Print Type', 'Zone / Quantity', 'Review']

const BASE_PRICES: Record<string, number> = {
  'Grandsler Shirt': 220, 'Crown Shirt': 250, 'Grandsler Polo': 280,
  'Lifeline Polo Female': 295, 'Lifeline Polo Male': 295, 'Crown Polo Premium': 350,
  'Silkscreen Printing': 180, 'Vinyl Printing': 160, 'J Handle Umbrella': 320,
  'Customized Uniform': 380, 'Fridge Magnet': 85, 'Customized Bag': 260,
  'Facemask Printing': 65, 'Full Sublimation': 200, 'Retractable Reel ID': 95,
  'Lanyard': 75, 'Eco Bag': 145, 'Pin Badge': 55, 'Business Card': 15,
  'Tumbler': 285, 'Mug Cup': 195, 'ID': 110, 'Insert Ball Pen': 40, 'Folding Fan': 125,
}

export default function Customize({ navigate, addToQuotation, isLoggedIn }: Props) {
  const [step, setStep] = useState(0)
  const [product, setProduct] = useState('')
  const [material, setMaterial] = useState('')
  const [printType, setPrintType] = useState('')
  const [zones, setZones] = useState<string[]>([])
  const [sizeQtys, setSizeQtys] = useState<Record<string, number>>({})
  const [nonApparelQty, setNonApparelQty] = useState(1)
  const [added, setAdded] = useState(false)

  const isApparel = APPAREL.includes(product)
  const materials = isApparel ? MATERIALS.apparel : MATERIALS.other
  const totalQty = isApparel
    ? Object.values(sizeQtys).reduce((a, b) => a + b, 0)
    : nonApparelQty

  function toggleZone(z: string) {
    setZones((prev) => prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z])
  }

  function handleAddToQuotation() {
    const base = BASE_PRICES[product] ?? 200
    const item: QuotationItem = {
      id: Date.now().toString(),
      product,
      material,
      printType,
      zones,
      sizes: isApparel
        ? Object.entries(sizeQtys).filter(([, q]) => q > 0).map(([size, qty]) => ({ size, qty }))
        : [{ size: 'N/A', qty: nonApparelQty }],
      unitPrice: base,
      totalQty,
      subtotal: base * totalQty,
    }
    addToQuotation(item)
    setAdded(true)
    setTimeout(() => { setAdded(false); navigate('quotation') }, 1000)
  }

  function canAdvance() {
    if (step === 0) return product !== ''
    if (step === 1) return material !== ''
    if (step === 2) return printType !== ''
    if (step === 3) return isApparel ? totalQty > 0 : nonApparelQty > 0
    return true
  }

  return (
    <div className="min-h-screen bg-parchment pb-20">
      <div className="bg-white border-b border-stone-200 py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-olive-600 text-xs font-semibold tracking-widest uppercase mb-2">Build Your Order</p>
          <h1 className="font-display text-4xl font-700 text-ink">Customization</h1>
          <p className="text-stone-500 mt-2">Build your order step by step — we'll prepare a quotation at the end.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-10">
        {/* Step indicator */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-700 transition-all duration-300 ${
                    i < step ? 'bg-olive-500 text-white' :
                    i === step ? 'bg-ink text-white' :
                    'bg-stone-200 text-stone-400'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`mt-1.5 text-xs font-500 hidden sm:block ${i === step ? 'text-ink' : 'text-stone-400'}`}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mt-[-12px] sm:mt-[-24px] transition-colors duration-300 ${i < step ? 'bg-olive-400' : 'bg-stone-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="animate-fade-in" key={step}>
          {/* Step 0: Item */}
          {step === 0 && (
            <div>
              <h2 className="font-display text-xl font-700 text-ink mb-6">Select a product</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ALL_PRODUCTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setProduct(p); setMaterial(''); setZones([]) }}
                    className={`p-4 rounded-xl border-2 text-left font-500 text-sm transition-all duration-150 ${
                      product === p
                        ? 'border-olive-500 bg-olive-50 text-olive-700'
                        : 'border-stone-200 bg-white text-ink hover:border-olive-300 hover:bg-olive-50/50'
                    }`}
                  >
                    {p}
                    {APPAREL.includes(p) && (
                      <span className="block text-xs mt-0.5 text-stone-400">Apparel</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Material */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-xl font-700 text-ink mb-2">Select material</h2>
              <p className="text-stone-500 mb-6 text-sm">For: <strong className="text-ink">{product}</strong></p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {materials.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMaterial(m)}
                    className={`p-4 rounded-xl border-2 font-display font-600 text-sm transition-all duration-150 ${
                      material === m
                        ? 'border-olive-500 bg-olive-50 text-olive-700'
                        : 'border-stone-200 bg-white text-ink hover:border-olive-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Print Type */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-xl font-700 text-ink mb-2">Select printing method</h2>
              <p className="text-stone-500 mb-6 text-sm">Material: <strong className="text-ink">{material}</strong></p>
              <div className="grid grid-cols-2 gap-4">
                {PRINT_TYPES.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setPrintType(pt)}
                    className={`p-5 rounded-xl border-2 text-left transition-all duration-150 ${
                      printType === pt
                        ? 'border-olive-500 bg-olive-50'
                        : 'border-stone-200 bg-white hover:border-olive-300'
                    }`}
                  >
                    <p className="font-display font-700 text-ink">{pt}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {pt === 'Full Sublimation' && 'All-over color, vivid prints'}
                      {pt === 'Screen Print' && 'Durable, limited colors'}
                      {pt === 'Digital Print' && 'High detail, any design'}
                      {pt === 'Vinyl' && 'Crisp cuts, single colors'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Zone / Qty */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-xl font-700 text-ink mb-6">
                {isApparel ? 'Select print zones & sizes' : 'Set quantity'}
              </h2>

              {isApparel && (
                <>
                  <div className="mb-6">
                    <p className="text-sm font-600 text-ink mb-3">Print Zones</p>
                    <div className="bg-white border border-stone-200 rounded-xl p-5 mb-4 flex justify-center">
                      <svg viewBox="0 0 240 210" className="w-full max-w-xs" aria-label="Clickable shirt print zones">
                        <path d="M75 25 45 48 18 42 30 82 50 76v115h140V76l20 6 12-40-27 6-30-23c-8 19-82 19-90 0Z" fill="#f5f3ee" stroke="#bab4a8" strokeWidth="2"/>
                        {[
                          { id: 'F1', x: 89, y: 76, w: 62, h: 72 },
                          { id: 'F2', x: 61, y: 68, w: 24, h: 24 },
                          { id: 'F3', x: 155, y: 68, w: 24, h: 24 },
                          { id: 'SL', x: 29, y: 52, w: 24, h: 24 },
                          { id: 'SR', x: 187, y: 52, w: 24, h: 24 },
                          { id: 'B2', x: 104, y: 48, w: 32, h: 20 },
                        ].map((zone) => (
                          <g key={zone.id} onClick={() => toggleZone(zone.id)} className="cursor-pointer">
                            <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx="4" fill={zones.includes(zone.id) ? '#dde6d3' : 'white'} stroke={zones.includes(zone.id) ? '#5b6e42' : '#9a9489'} strokeDasharray="4 3"/>
                            <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#4a5a35">{zone.id}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRINT_ZONES.map((z) => (
                        <button
                          key={z.id}
                          onClick={() => toggleZone(z.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                            zones.includes(z.id)
                              ? 'border-olive-500 bg-olive-50 text-olive-700'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${zones.includes(z.id) ? 'bg-olive-500' : 'border border-stone-300'}`}>
                            {zones.includes(z.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-500">{z.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-600 text-ink mb-3">Sizes &amp; Quantities</p>
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200">
                            <th className="text-left px-4 py-2.5 text-stone-500 font-500 text-xs">Size</th>
                            <th className="text-left px-4 py-2.5 text-stone-500 font-500 text-xs">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(PRODUCT_SIZES[product] ?? SHIRT_SIZES).map((sz) => (
                            <tr key={sz} className="border-b border-stone-100 last:border-0">
                              <td className="px-4 py-2.5 font-display font-600 text-ink">{sz}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSizeQtys((prev) => ({ ...prev, [sz]: Math.max(0, (prev[sz] ?? 0) - 1) }))}
                                    className="w-7 h-7 rounded border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg leading-none"
                                  >−</button>
                                  <span className="w-8 text-center font-600 text-ink">{sizeQtys[sz] ?? 0}</span>
                                  <button
                                    onClick={() => setSizeQtys((prev) => ({ ...prev, [sz]: (prev[sz] ?? 0) + 1 }))}
                                    className="w-7 h-7 rounded border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-lg leading-none"
                                  >+</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-4 py-3 bg-olive-50 border-t border-stone-200 flex justify-between items-center">
                        <span className="text-sm text-stone-600">Total Pieces</span>
                        <span className="font-display font-700 text-ink">{totalQty}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!isApparel && (
                <div className="bg-white rounded-xl border border-stone-200 p-6">
                  <p className="font-500 text-ink mb-4">How many pieces?</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setNonApparelQty(Math.max(1, nonApparelQty - 1))}
                      className="w-10 h-10 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-xl"
                    >−</button>
                    <span className="font-display font-700 text-3xl text-ink w-16 text-center">{nonApparelQty}</span>
                    <button
                      onClick={() => setNonApparelQty(nonApparelQty + 1)}
                      className="w-10 h-10 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 transition-colors flex items-center justify-center text-xl"
                    >+</button>
                  </div>
                  <p className="text-stone-400 text-sm mt-4">Volume discounts apply at 25, 50, and 100+ pieces.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div>
              <h2 className="font-display text-xl font-700 text-ink mb-6">Review your order</h2>
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50">
                  <p className="font-display font-700 text-ink">{product}</p>
                </div>
                <div className="px-6 py-4 space-y-3 text-sm">
                  <Row label="Material" value={material} />
                  <Row label="Print Type" value={printType} />
                  {isApparel && zones.length > 0 && <Row label="Print Zones" value={zones.join(', ')} />}
                  <Row label="Quantity" value={`${totalQty} pcs`} />
                  <div className="border-t border-stone-100 pt-3">
                    <Row label="Unit Price" value={`₱${(BASE_PRICES[product] ?? 200).toLocaleString()}/pc`} />
                    <Row
                      label="Estimated Total"
                      value={`₱${((BASE_PRICES[product] ?? 200) * totalQty).toLocaleString()}`}
                      highlight
                    />
                  </div>
                </div>
              </div>

              <p className="text-stone-400 text-xs mb-6">
                Final pricing will be confirmed in the quotation. Volume discounts and rush surcharges (if applicable) will be applied there.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToQuotation}
                  disabled={added || !isLoggedIn}
                  className={`flex-1 font-display font-700 py-3.5 rounded-xl transition-all duration-200 ${
                    added
                      ? 'bg-olive-400 text-white cursor-default'
                      : !isLoggedIn
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-olive-500 hover:bg-olive-600 text-white hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  {added ? '✓ Added to Quotation' : 'Add to Quotation'}
                </button>
                {T_SHIRTS.includes(product) && (
                  <button
                    onClick={() => navigate('mockup')}
                    className="flex-1 border border-stone-300 text-ink font-display font-600 py-3.5 rounded-xl hover:border-olive-400 hover:bg-olive-50 transition-all duration-200"
                  >
                    Preview in 3D
                  </button>
                )}
              </div>
              {!isLoggedIn && (
                <p className="mt-3 text-center text-sm text-stone-500">
                  Log in to add this to your quotation.{' '}
                  <button onClick={() => navigate('auth')} className="font-700 text-olive-700 hover:underline">Log in</button>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="flex justify-between mt-10">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="px-6 py-2.5 rounded-lg border border-stone-200 text-stone-600 font-600 disabled:opacity-30 hover:border-stone-400 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="px-6 py-2.5 rounded-lg bg-ink text-white font-display font-700 disabled:opacity-30 hover:bg-ink-soft transition-all"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-stone-500">{label}</span>
      <span className={`font-500 ${highlight ? 'text-olive-700 font-700 text-base' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
