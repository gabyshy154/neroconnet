import { useState } from 'react'

const lines = [
  {
    id: 'grandsler-shirt',
    name: 'Grandsler Shirt',
    note: 'Available in Youth and Adult sizes',
    colors: ['#FFFFFF', '#1A1918', '#1B3A6B', '#6B7280', '#B91C1C', '#1D4ED8', '#166534', '#7C2D12'],
    colorNames: ['White', 'Black', 'Navy', 'Gray', 'Red', 'Royal Blue', 'Forest Green', 'Maroon'],
    groups: [
      {
        label: 'Youth',
        rows: [
          { size: '12', width: '12"', length: '16"' },
          { size: '14', width: '13"', length: '17"' },
          { size: '16', width: '14"', length: '18"' },
          { size: '18', width: '15"', length: '19"' },
          { size: '20 / XS', width: '16"', length: '20"' },
        ],
      },
      {
        label: 'Adult',
        rows: [
          { size: 'S', width: '17"', length: '27"' },
          { size: 'M', width: '18"', length: '28"' },
          { size: 'L', width: '19.5"', length: '29"' },
          { size: 'XL', width: '21"', length: '30"' },
          { size: '2XL', width: '22.5"', length: '31"' },
        ],
      },
    ],
  },
  {
    id: 'crown-shirt',
    name: 'Crown Shirt',
    note: 'Seamless construction · fewer colorways',
    colors: ['#FFFFFF', '#1A1918', '#1B3A6B', '#6B7280'],
    colorNames: ['White', 'Black', 'Navy', 'Gray'],
    groups: [
      {
        label: 'Youth',
        rows: [
          { size: '16 / S', width: '14"', length: '18"' },
          { size: '18', width: '15"', length: '19"' },
          { size: '20 / M', width: '16"', length: '20"' },
        ],
      },
      {
        label: 'Adult',
        rows: [
          { size: 'S', width: '17"', length: '27"' },
          { size: 'M', width: '18.5"', length: '28"' },
          { size: 'L', width: '20"', length: '29"' },
          { size: 'XL', width: '21.5"', length: '30"' },
          { size: '2XL', width: '23"', length: '31"' },
        ],
      },
    ],
  },
  {
    id: 'grandsler-polo',
    name: 'Grandsler Polo',
    note: 'Available in Youth and Adult sizes',
    colors: ['#FFFFFF', '#1A1918', '#1B3A6B', '#6B7280', '#B91C1C', '#1D4ED8'],
    colorNames: ['White', 'Black', 'Navy', 'Gray', 'Red', 'Royal Blue'],
    groups: [
      {
        label: 'Youth',
        rows: [
          { size: '16', width: '14"', length: '22"' },
          { size: '18', width: '15"', length: '23"' },
          { size: '20 / S', width: '16"', length: '24"' },
        ],
      },
      {
        label: 'Adult',
        rows: [
          { size: 'S', width: '18"', length: '28"' },
          { size: 'M', width: '19.5"', length: '29"' },
          { size: 'L', width: '21"', length: '30"' },
          { size: 'XL', width: '22.5"', length: '31"' },
        ],
      },
    ],
  },
  {
    id: 'lifeline-female',
    name: 'Lifeline Polo Female',
    note: 'Curved side cut for women',
    colors: ['#FFFFFF', '#1A1918', '#1B3A6B', '#7C2D12', '#EC4899', '#6B7280'],
    colorNames: ['White', 'Black', 'Navy', 'Maroon', 'Pink', 'Gray'],
    groups: [
      {
        label: 'All Sizes',
        rows: [
          { size: 'L', width: '18"', length: '27"' },
          { size: 'XL', width: '19.5"', length: '28"' },
          { size: '2XL', width: '21"', length: '29"' },
          { size: '3XL', width: '22.5"', length: '30"' },
          { size: '4XL', width: '24"', length: '31"' },
        ],
      },
    ],
  },
  {
    id: 'lifeline-male',
    name: 'Lifeline Polo Male',
    note: 'Straight cut, no curve',
    colors: ['#FFFFFF', '#1A1918', '#1B3A6B', '#6B7280', '#B91C1C', '#1D4ED8', '#7C2D12'],
    colorNames: ['White', 'Black', 'Navy', 'Gray', 'Red', 'Royal Blue', 'Maroon'],
    groups: [
      {
        label: 'All Sizes',
        rows: [
          { size: 'S', width: '18"', length: '28"' },
          { size: 'M', width: '19.5"', length: '29"' },
          { size: 'L', width: '21"', length: '30"' },
          { size: 'XL', width: '22.5"', length: '31"' },
          { size: '2XL', width: '24"', length: '32"' },
        ],
      },
    ],
  },
  {
    id: 'crown-polo',
    name: 'Crown Polo Premium',
    note: 'Premium polo with refined finish',
    colors: ['#FFFFFF', '#1A1918', '#1B3A6B', '#6B7280', '#B91C1C', '#1D4ED8', '#166534', '#7C2D12'],
    colorNames: ['White', 'Black', 'Navy', 'Gray', 'Red', 'Royal Blue', 'Forest Green', 'Maroon'],
    groups: [
      {
        label: 'All Sizes',
        rows: [
          { size: 'XS', width: '16.5"', length: '26"' },
          { size: 'S', width: '18"', length: '27"' },
          { size: 'M', width: '19.5"', length: '28"' },
          { size: 'L', width: '21"', length: '29"' },
          { size: 'XL', width: '22.5"', length: '30"' },
          { size: 'XXL', width: '24"', length: '31"' },
        ],
      },
    ],
  },
]

function PrintableAreaDiagram() {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6">
      <h3 className="font-display font-600 text-ink mb-1">Printable Areas</h3>
      <p className="text-stone-500 text-sm mb-6">
        We can print the Printable Areas shown in the pictures. For other items, please check other pages.
      </p>
      <p className="text-stone-500 text-sm mb-6">Max print size: F1/B1 is 10″ × 15″ / A3; F2, F3, B2, SL, SR are 4″ × 4″.</p>
      <div className="flex flex-col sm:flex-row gap-8 items-start justify-center">
        {/* Front */}
        <div className="text-center">
          <p className="text-xs font-600 text-stone-400 uppercase tracking-widest mb-3">Front</p>
          <svg viewBox="0 0 160 200" className="w-36 h-44 mx-auto">
            {/* Shirt body */}
            <path
              d="M50 30 L30 50 L10 45 L20 70 L30 68 L30 180 L130 180 L130 68 L140 70 L150 45 L130 50 L110 30 C110 30 100 45 80 45 C60 45 50 30 50 30Z"
              fill="#f5f3ee" stroke="#d5d0c5" strokeWidth="1.5"
            />
            {/* F1 - main chest zone */}
            <rect x="55" y="70" width="50" height="70" rx="2" fill="none" stroke="#5b6e42" strokeWidth="1.5" strokeDasharray="4 2"/>
            <text x="80" y="109" textAnchor="middle" fontSize="10" fill="#5b6e42" fontWeight="bold">F1</text>
            {/* F2 - upper left chest */}
            <rect x="36" y="68" width="16" height="16" rx="1" fill="none" stroke="#7a9e5a" strokeWidth="1" strokeDasharray="3 2"/>
            <text x="44" y="79" textAnchor="middle" fontSize="7" fill="#7a9e5a" fontWeight="bold">F2</text>
            {/* F3 - upper right chest */}
            <rect x="108" y="68" width="16" height="16" rx="1" fill="none" stroke="#7a9e5a" strokeWidth="1" strokeDasharray="3 2"/>
            <text x="116" y="79" textAnchor="middle" fontSize="7" fill="#7a9e5a" fontWeight="bold">F3</text>
            {/* SL sleeve left */}
            <rect x="18" y="50" width="14" height="14" rx="1" fill="none" stroke="#9bba7e" strokeWidth="1" strokeDasharray="3 2"/>
            <text x="25" y="60" textAnchor="middle" fontSize="7" fill="#9bba7e" fontWeight="bold">SL</text>
            {/* SR sleeve right */}
            <rect x="128" y="50" width="14" height="14" rx="1" fill="none" stroke="#9bba7e" strokeWidth="1" strokeDasharray="3 2"/>
            <text x="135" y="60" textAnchor="middle" fontSize="7" fill="#9bba7e" fontWeight="bold">SR</text>
          </svg>
        </div>
        {/* Back */}
        <div className="text-center">
          <p className="text-xs font-600 text-stone-400 uppercase tracking-widest mb-3">Back</p>
          <svg viewBox="0 0 160 200" className="w-36 h-44 mx-auto">
            <path
              d="M50 30 L30 50 L10 45 L20 70 L30 68 L30 180 L130 180 L130 68 L140 70 L150 45 L130 50 L110 30 C110 30 100 45 80 45 C60 45 50 30 50 30Z"
              fill="#f5f3ee" stroke="#d5d0c5" strokeWidth="1.5"
            />
            {/* B1 - main back zone */}
            <rect x="55" y="70" width="50" height="70" rx="2" fill="none" stroke="#5b6e42" strokeWidth="1.5" strokeDasharray="4 2"/>
            <text x="80" y="109" textAnchor="middle" fontSize="10" fill="#5b6e42" fontWeight="bold">B1</text>
            {/* B2 - upper back */}
            <rect x="62" y="52" width="36" height="14" rx="1" fill="none" stroke="#7a9e5a" strokeWidth="1" strokeDasharray="3 2"/>
            <text x="80" y="62" textAnchor="middle" fontSize="7" fill="#7a9e5a" fontWeight="bold">B2</text>
          </svg>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-olive-500"/>
          F1/B1 · 10″ × 15″
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-olive-400"/>
          F2, F3, B2 · 4″ × 4″
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-olive-300"/>
          SL, SR · 4″ × 4″
        </span>
      </div>
    </div>
  )
}

export default function SizeGuide() {
  const [activeTab, setActiveTab] = useState(lines[0].id)
  const active = lines.find((l) => l.id === activeTab)!

  return (
    <div className="min-h-screen bg-parchment pb-20">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-olive-600 text-xs font-semibold tracking-widest uppercase mb-2">Apparel</p>
          <h1 className="font-display text-4xl font-700 text-ink">Size Guide</h1>
          <p className="text-stone-500 mt-2">Measurements in inches. Width measured across chest, length from shoulder seam to hem.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8">
        {/* Tab navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {lines.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveTab(l.id)}
              className={`px-4 py-2 rounded-lg text-sm font-600 font-display transition-all duration-150 ${
                activeTab === l.id
                  ? 'bg-olive-500 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-olive-300 hover:text-olive-700'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>

        <div className="animate-fade-in" key={activeTab}>
          {/* Product header */}
          <div className="mb-6">
            <h2 className="font-display text-2xl font-700 text-ink">{active.name}</h2>
            <p className="text-stone-500 text-sm mt-1">{active.note}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Printable area diagram */}
            <PrintableAreaDiagram />

            {/* Color swatches */}
            <div className="bg-white border border-stone-200 rounded-xl p-6">
              <h3 className="font-display font-600 text-ink mb-4">Available Colors</h3>
              <div className="flex flex-wrap gap-3">
                {active.colors.map((color, i) => (
                  <div key={color} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                    <div
                      className="w-9 h-9 rounded-full border-2 border-stone-200 group-hover:scale-110 transition-transform shadow-sm"
                      style={{ backgroundColor: color }}
                      title={active.colorNames[i]}
                    />
                    <span className="text-xs text-stone-500">{active.colorNames[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Size tables */}
          <div className="mt-6 grid sm:grid-cols-2 gap-6">
            {active.groups.map((group) => (
              <div key={group.label} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-stone-50 border-b border-stone-200">
                  <span className="font-display font-600 text-sm text-ink">{group.label}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="text-left px-5 py-2.5 text-stone-500 font-500 text-xs uppercase tracking-wider">Size</th>
                      <th className="text-left px-5 py-2.5 text-stone-500 font-500 text-xs uppercase tracking-wider">Width</th>
                      <th className="text-left px-5 py-2.5 text-stone-500 font-500 text-xs uppercase tracking-wider">Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row, i) => (
                      <tr
                        key={row.size}
                        className={`border-b border-stone-50 hover:bg-olive-50 transition-colors ${i % 2 === 0 ? '' : 'bg-stone-50/40'}`}
                      >
                        <td className="px-5 py-3 font-display font-600 text-ink">{row.size}</td>
                        <td className="px-5 py-3 text-stone-600">{row.width}</td>
                        <td className="px-5 py-3 text-stone-600">{row.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
