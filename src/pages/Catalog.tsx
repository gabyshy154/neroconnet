import type { PageId } from '../App'

interface Props {
  navigate: (page: PageId) => void
}

const apparelItems = [
  { id: 'grandsler-shirt', name: 'Grandsler Shirt', note: 'Youth & Adult sizes' },
  { id: 'crown-shirt', name: 'Crown Shirt', note: 'Seamless · Youth & Adult' },
  { id: 'grandsler-polo', name: 'Grandsler Polo', note: 'Youth & Adult sizes' },
  { id: 'lifeline-polo-f', name: 'Lifeline Polo Female', note: 'Curved sides · L–4XL' },
  { id: 'lifeline-polo-m', name: 'Lifeline Polo Male', note: 'S–2XL' },
  { id: 'crown-polo', name: 'Crown Polo Premium', note: 'XS–XXL' },
]

const otherItems = [
  'Silkscreen Printing',
  'Vinyl Printing',
  'J Handle Umbrella',
  'Customized Uniform',
  'Fridge Magnet',
  'Customized Bag',
  'Facemask Printing',
  'Full Sublimation',
  'Retractable Reel ID',
  'Lanyard',
  'Eco Bag',
  'Pin Badge',
  'Business Card',
  'Tumbler',
  'Mug Cup',
  'ID',
  'Insert Ball Pen',
  'Folding Fan',
]

const productPhotos = [
  'https://images.unsplash.com/photo-1586939735437-d61392bd039b?w=500&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1629891060732-199a33f240bb?w=500&h=360&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1637729099669-3881fe3e4de0?w=500&h=360&fit=crop&auto=format',
]

const ShirtIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10 text-olive-400">
    <path
      d="M16 6h16l6 8-6 2v22H16V16l-6-2 6-8z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity={0.1}
    />
    <path d="M16 6c0 4-4 6-4 6M32 6c0 4 4 6 4 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export default function Catalog({ navigate }: Props) {
  return (
    <div className="min-h-screen bg-parchment pb-20">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-olive-600 text-xs font-semibold tracking-widest uppercase mb-2">Product Catalog</p>
          <h1 className="font-display text-4xl font-700 text-ink">All Items</h1>
          <p className="text-stone-500 mt-2">Browse our full product line. Click any item to customize or view sizing.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Apparel */}
        <section className="mt-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-700 text-ink">Apparel</h2>
              <p className="text-stone-500 text-sm mt-0.5">Shirts &amp; Polos — click any card to view sizing guide</p>
            </div>
            <button
              onClick={() => navigate('size-guide')}
              className="text-olive-600 hover:text-olive-700 text-sm font-600 flex items-center gap-1.5 transition-colors"
            >
              Size Guide
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {apparelItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate('size-guide')}
                className="bg-white border border-stone-200 rounded-xl p-5 cursor-pointer hover:border-olive-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className="w-14 h-14 rounded-lg bg-olive-50 flex items-center justify-center mb-4 group-hover:bg-olive-100 transition-colors">
                  <ShirtIcon />
                </div>
                <p className="font-display font-600 text-ink text-sm leading-tight mb-1">{item.name}</p>
                <p className="text-stone-400 text-xs">{item.note}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('size-guide') }}
                  className="mt-3 text-olive-600 text-xs font-500 hover:text-olive-700 transition-colors"
                >
                  Size guide →
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Other Items */}
        <section className="mt-14">
          <div className="mb-6">
            <h2 className="font-display text-xl font-700 text-ink">Other Items &amp; Add-Ons</h2>
            <p className="text-stone-500 text-sm mt-0.5">Promotional items, accessories, and custom merchandise</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {otherItems.map((name, index) => (
              <div
                key={name}
                onClick={() => navigate('customize')}
                className="bg-white border border-stone-200 rounded-xl p-5 cursor-pointer hover:border-olive-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <img
                  src={productPhotos[index % productPhotos.length]}
                  alt=""
                  className="w-full aspect-[4/3] rounded-lg object-cover mb-3 bg-stone-100"
                />
                <p className="font-500 text-ink text-sm leading-tight">{name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="mt-16 bg-olive-500 rounded-2xl p-8 sm:p-12 text-center text-white">
          <h3 className="font-display text-2xl font-700 mb-2">Not sure what you need?</h3>
          <p className="text-olive-100 mb-6">Use our step-by-step customization builder to create your order.</p>
          <button
            onClick={() => navigate('customize')}
            className="bg-white text-olive-700 hover:bg-olive-50 font-display font-700 px-8 py-3 rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            Start Customization
          </button>
        </div>
      </div>
    </div>
  )
}
