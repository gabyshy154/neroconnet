import { useState } from 'react'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-parchment pb-20">
      <div className="bg-white border-b border-stone-200 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-olive-600 text-xs font-semibold tracking-widest uppercase mb-2">Get in Touch</p>
          <h1 className="font-display text-4xl font-700 text-ink">Contact Us</h1>
          <p className="text-stone-500 mt-2">We're happy to help with quotes, bulk orders, or general inquiries.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-10">
        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          {/* Form */}
          <div className="bg-white border border-stone-200 rounded-2xl p-8">
            {sent ? (
              <div className="text-center py-10 animate-fade-in">
                <div className="w-16 h-16 bg-olive-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-olive-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h3 className="font-display text-2xl font-700 text-ink mb-2">Message Sent</h3>
                <p className="text-stone-500">We'll get back to you within 1 business day.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="font-display font-700 text-ink text-lg mb-6">Send a Message</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Your Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Juan dela Cruz" required />
                  <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@email.com" required />
                </div>
                <Field label="Phone (optional)" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+63 9XX XXX XXXX" />
                <div>
                  <label className="block text-sm font-500 text-ink mb-1.5">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us about your order or inquiry..."
                    rows={5}
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-stone-200 bg-stone-50 text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-olive-400 focus:border-transparent transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-olive-500 hover:bg-olive-600 text-white font-display font-700 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            {/* Shop details */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <h3 className="font-display font-700 text-ink mb-5">Shop Information</h3>
              <div className="space-y-4">
                <InfoRow
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                    </svg>
                  }
                  label="Address"
                  value="Rm B5 Friendship Building, Lopez Jaena St., Subangdaku, Mandaue City, Cebu 6014"
                />
                <InfoRow
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/>
                    </svg>
                  }
                  label="Phone"
                  value="(032) 505-9590"
                />
                <InfoRow
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3.75h3m-6-3.75H7.5m-.75 3.75H7.5"/>
                    </svg>
                  }
                  label="Mobile"
                  value="0917 316 4478"
                />
                <InfoRow
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                    </svg>
                  }
                  label="Email"
                  value="neroprintingservices@gmail.com"
                />
              </div>
            </div>

            {/* Hours */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <h3 className="font-display font-700 text-ink mb-4">Business Hours</h3>
              <div className="space-y-2 text-sm">
                {[
                  { day: 'Monday – Friday', hrs: '8:00 AM – 6:00 PM' },
                  { day: 'Saturday', hrs: '9:00 AM – 5:00 PM' },
                  { day: 'Sunday', hrs: 'Closed' },
                ].map((row) => (
                  <div key={row.day} className="flex justify-between items-center">
                    <span className="text-stone-600">{row.day}</span>
                    <span className={`font-500 ${row.hrs === 'Closed' ? 'text-stone-400' : 'text-ink'}`}>{row.hrs}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map placeholder */}
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden h-48 relative">
              <img
                src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?w=600&h=300&fit=crop&auto=format"
                alt="Cebu City map area"
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 text-center shadow-md">
                  <p className="font-display font-700 text-ink text-sm">Mandaue City, Cebu</p>
                  <p className="text-stone-500 text-xs mt-0.5">Lopez Jaena St., Subangdaku</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label, type = 'text', value, onChange, placeholder, required,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-500 text-ink mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 rounded-lg border border-stone-200 bg-stone-50 text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-olive-400 focus:border-transparent transition-all"
      />
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-olive-50 rounded-lg flex items-center justify-center text-olive-600 flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs text-stone-400 font-500">{label}</p>
        <p className="text-ink text-sm font-500 mt-0.5">{value}</p>
      </div>
    </div>
  )
}
