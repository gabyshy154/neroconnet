type PageId = import('../App').PageId

interface Props {
  navigate: (page: PageId) => void
}

const services = [
  {
    name: 'Full Sublimation',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M4 14h32" stroke="currentColor" strokeWidth="2"/>
        <circle cx="20" cy="26" r="4" fill="currentColor" opacity="0.3"/>
        <path d="M16 26c2-3 6-3 8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    name: 'Screen Print',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <rect x="6" y="6" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="10" y="10" width="20" height="20" rx="1" fill="currentColor" opacity="0.15"/>
        <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    name: 'Digital Print',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <rect x="4" y="10" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="20" cy="22" r="6" stroke="currentColor" strokeWidth="2"/>
        <circle cx="20" cy="22" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    name: 'Embroidery',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="2"/>
        <path d="M20 12c0 0 4 4 4 8s-4 8-4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M20 12c0 0-4 4-4 8s4 8 4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function Home({ navigate }: Props) {
  return (
    <div className="min-h-screen bg-parchment">
      {/* Hero */}
      <section className="relative min-h-[620px] h-[calc(100vh-64px)] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1663433567177-9f94be0bff4c?w=1600&h=1000&fit=crop&auto=format')",
          }}
        />
        <div className="absolute inset-0 bg-ink/70" />
        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto animate-fade-in">
          <p className="text-olive-300 font-display text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            Nero Printing Services &amp; Trading · Cebu
          </p>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-800 text-white leading-[1.05] mb-6">
            Nero<span className="text-olive-300">Connect</span>
          </h1>
          <p className="text-stone-300 text-lg sm:text-xl font-light leading-relaxed mb-10">
            Your custom print &amp; merchandise portal — shirts, polos, bags, signage, and everything in between.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('customize')}
              className="bg-olive-500 hover:bg-olive-600 text-white font-display font-600 px-8 py-3.5 rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              Start an Order
            </button>
          </div>
        </div>
      </section>

      {/* Services strip */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <p className="text-center text-stone-500 text-xs font-semibold tracking-[0.18em] uppercase mb-10">
            What We Offer
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex flex-col items-center gap-3 group cursor-pointer"
                onClick={() => navigate('catalog')}
              >
                <div className="w-16 h-16 rounded-xl bg-olive-50 flex items-center justify-center text-olive-600 group-hover:bg-olive-500 group-hover:text-white transition-all duration-200">
                  {s.icon}
                </div>
                <span className="font-display font-600 text-ink text-sm text-center leading-tight">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
