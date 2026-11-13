const timeline = [
  { year: '2010', title: 'Founded', desc: 'Nero Printing Services & Trading opens its first shop in Mandaue City, Cebu, starting with screen printing on t-shirts.' },
  { year: '2013', title: 'Digital Expansion', desc: 'Added digital printing capabilities and expanded the product line to include promotional items and corporate giveaways.' },
  { year: '2016', title: 'Full Sublimation', desc: 'Invested in sublimation equipment, enabling vibrant all-over prints for sportswear, uniforms, and merchandise.' },
  { year: '2019', title: 'Embroidery Studio', desc: "Launched in-house embroidery services — Nero's most popular addition for premium corporate and institutional orders." },
  { year: '2022', title: 'Mandaue Shop Expansion', desc: 'Expanded the Mandaue City shop with dedicated design consultation booths and a larger sample gallery.' },
  { year: '2025', title: 'NeroConnect', desc: 'Launched the NeroConnect customer portal — bringing quotations, order tracking, and membership services online.' },
]

const clients = [
  'University of San Carlos', 'Cebu Pacific Air', 'Ayala Malls', 'SM City Cebu',
  'Capitol University', 'Jollibee Foods Corp.', 'BDO Unibank', 'Robinsons Land',
]

export default function About() {
  return (
    <div className="min-h-screen bg-parchment pb-20">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-olive-600 text-xs font-semibold tracking-widest uppercase mb-2">Company</p>
          <h1 className="font-display text-4xl font-700 text-ink">About Nero</h1>
          <p className="text-stone-500 mt-2 max-w-xl">
            A Cebu-based printing and merchandise shop serving businesses, schools, sports teams, and individuals since 2010.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        {/* Hero photo */}
        <div className="mt-10 rounded-2xl overflow-hidden h-72 sm:h-96 bg-stone-200">
          <img
            src="https://images.unsplash.com/photo-1606206522800-44fd57523ab3?w=1200&h=600&fit=crop&auto=format"
            alt="Nero Printing Services workshop"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Story */}
        <section className="mt-14 grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="font-display text-2xl font-700 text-ink mb-4">Our Story</h2>
            <div className="space-y-4 text-stone-600 leading-relaxed">
              <p>
                Nero Printing Services & Trading was born out of a simple idea: that high-quality custom printing should be accessible, not overwhelming. What started as a small screen-printing operation has grown into one of Cebu's most trusted full-service custom merchandise shops.
              </p>
              <p>
                We serve everyone from solo entrepreneurs ordering 12 polo shirts for a small team, to large institutions placing 1,000-piece uniform orders — and everyone in between. Our shop handles everything in-house: design consultation, material sourcing, printing, finishing, and quality control.
              </p>
              <p>
                With NeroConnect, we're extending that same care and transparency into the digital world — so you can build, quote, and track orders on your own time.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden bg-stone-200 h-44">
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format"
                alt="Screen printing press"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-xl overflow-hidden bg-stone-200 h-44">
              <img
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop&auto=format"
                alt="Finished printed shirts"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-xl overflow-hidden bg-stone-200 h-44">
              <img
                src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop&auto=format"
                alt="Embroidery machine"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-xl overflow-hidden bg-stone-200 h-44">
              <img
                src="https://images.unsplash.com/photo-1503341455253-b2522616eddb?w=400&h=300&fit=crop&auto=format"
                alt="Custom merchandise display"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-20">
          <h2 className="font-display text-2xl font-700 text-ink mb-10">Timeline</h2>
          <div className="relative">
            <div className="absolute left-16 top-0 bottom-0 w-px bg-stone-200" />
            <div className="space-y-10">
              {timeline.map((item, i) => (
                <div key={item.year} className="flex gap-8 items-start animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex-shrink-0 w-32 flex items-center justify-end gap-3">
                    <span className="font-display font-800 text-olive-600 text-lg">{item.year}</span>
                    <div className="w-3 h-3 rounded-full bg-olive-500 border-2 border-white ring-2 ring-olive-200 flex-shrink-0"/>
                  </div>
                  <div className="pt-0.5 pb-2">
                    <p className="font-display font-700 text-ink mb-1">{item.title}</p>
                    <p className="text-stone-500 text-sm leading-relaxed max-w-md">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: '15+', label: 'Years in operation' },
            { value: '8,000+', label: 'Orders completed' },
            { value: '300+', label: 'Corporate clients' },
            { value: '4', label: 'Print methods' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-stone-200 rounded-2xl p-6 text-center">
              <p className="font-display font-800 text-3xl text-olive-600 mb-1">{stat.value}</p>
              <p className="text-stone-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Client logos */}
        <section className="mt-20">
          <p className="text-center text-stone-400 text-xs font-semibold tracking-widest uppercase mb-8">Clients &amp; Partners</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {clients.map((name) => (
              <div key={name} className="bg-white border border-stone-200 rounded-xl py-4 px-5 flex items-center justify-center hover:border-stone-300 transition-all">
                <p className="text-stone-500 text-sm font-600 text-center leading-tight">{name}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
