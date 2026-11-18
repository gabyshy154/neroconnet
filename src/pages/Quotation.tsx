import { useState } from 'react'
import type { PageId, QuotationItem, User } from '../App'
import ContactDetailsForm, { addressFromContact } from '../components/ContactDetailsForm'
import type { ContactDetails } from '../components/ContactDetailsForm'
import {
  QUOTATION_VALIDITY_DAYS,
  VOLUME_DISCOUNTS,
  RUSH_SURCHARGE,
  CREDIT_TERM_CHARGES,
  MEMBERSHIP_DISCOUNTS,
  NPC_VALIDITY_MONTHS,
  generateOrderReference,
} from '../config'

interface Props {
  navigate: (page: PageId) => void
  quotationItems: QuotationItem[]
  isLoggedIn: boolean
  user: User | null
  onSaveContact: (details: ContactDetails) => void
}

type ClaimMethod = 'pickup' | 'delivery'
type PaymentTerm = 'half' | 'full' | '15' | '30'

const termsText = `50% downpayment is required to confirm the order. The remaining balance must be settled before release unless credit terms are approved. Approved credit terms carry additional charges: 15 days credit +${CREDIT_TERM_CHARGES[15] * 100}% of the total order, 30 days credit +${CREDIT_TERM_CHARGES[30] * 100}%. A late payment penalty of 2.5% of the total amount due is charged for every 30 days of delay. Damaged items must be reported upon receipt and will be returned and replaced. Items not claimed within 7 days after Nero notifies you the order is ready incur a storage fee of 5% per week based on the total order value until claimed.`

export default function Quotation({ navigate, quotationItems, isLoggedIn, user, onSaveContact }: Props) {
  const [eventDate, setEventDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [claimMethod, setClaimMethod] = useState<ClaimMethod>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('half')
  const [memberDiscount, setMemberDiscount] = useState(false)
  const [rush, setRush] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [confirmAfterContactSave, setConfirmAfterContactSave] = useState(false)

  const issueDate = new Date()
  issueDate.setHours(0, 0, 0, 0)
  const validityDate = new Date(issueDate)
  validityDate.setDate(validityDate.getDate() + QUOTATION_VALIDITY_DAYS)
  const npcEnrollmentDate = user?.npc ? new Date(`${user.npc.enrollmentDate}T00:00:00`) : null
  const npcValidityDate = npcEnrollmentDate ? new Date(npcEnrollmentDate) : null
  if (npcValidityDate) npcValidityDate.setMonth(npcValidityDate.getMonth() + NPC_VALIDITY_MONTHS)
  const npcIsValid = Boolean(isLoggedIn && user?.npc && npcValidityDate && npcValidityDate >= issueDate)
  const orderReference = generateOrderReference(issueDate)

  const subtotal = quotationItems.reduce((sum, item) => sum + item.subtotal, 0)
  const volumeDiscount = quotationItems.reduce((sum, item) => {
    const applicable = [...VOLUME_DISCOUNTS].reverse().find((tier) => item.totalQty >= tier.minPieces)
    return sum + (applicable ? item.subtotal * applicable.rate : 0)
  }, 0)
  const membershipRate = user?.npc
    ? MEMBERSHIP_DISCOUNTS[user.npc.tier]
    : 0
  const membershipDiscount = npcIsValid && memberDiscount ? subtotal * membershipRate : 0
  const rushSurcharge = rush ? subtotal * RUSH_SURCHARGE : 0
  const beforeCredit = subtotal - volumeDiscount - membershipDiscount + rushSurcharge
  const creditRate = paymentTerm === '15'
    ? CREDIT_TERM_CHARGES[15]
    : paymentTerm === '30'
      ? CREDIT_TERM_CHARGES[30]
      : 0
  const creditCharge = beforeCredit * creditRate
  const grandTotal = beforeCredit + creditCharge
  const downpayment = grandTotal * 0.5
  const balance = grandTotal - downpayment

  const formattedIssueDate = formatDate(issueDate)
  const formattedValidityDate = formatDate(validityDate)
  const paymentDueBy =
    paymentTerm === '15'
      ? `Downpayment due ${formattedValidityDate}; balance due after claim date`
      : paymentTerm === '30'
        ? `Downpayment due ${formattedValidityDate}; balance due after claim date`
        : paymentTerm === 'full'
          ? `Due ${formattedValidityDate}`
          : `Downpayment due ${formattedValidityDate}; balance due before claim`

  if (quotationItems.length === 0) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <div className="text-center max-w-md bg-white border border-stone-200 rounded-lg p-10">
          <div className="w-16 h-16 rounded-lg bg-olive-50 text-olive-600 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M9 12h6m-6 4h6M8 3h8l3 3v15H5V3h3z"/></svg>
          </div>
          <h2 className="text-2xl font-700 text-ink mb-2">Your quotation is empty</h2>
          <p className="text-stone-500 mb-6">Build an item in Customization, then add it here for review.</p>
          <button onClick={() => navigate('customize')} className="bg-olive-500 hover:bg-olive-600 text-white font-700 px-7 py-3 rounded-lg">Start Customization</button>
        </div>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <div className="max-w-lg w-full bg-white border border-stone-200 rounded-lg p-10 text-center">
          <div className="w-16 h-16 bg-olive-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-olive-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p className="text-olive-700 text-xs font-700 tracking-widest uppercase mb-2">Order Confirmed</p>
          <h1 className="text-3xl font-700 text-ink mb-3">Quotation submitted</h1>
          <p className="text-stone-500 mb-7">Your quotation has been submitted. A PDF invoice will be emailed to you automatically.</p>
          <button onClick={() => setDownloaded(true)} className="w-full bg-ink text-white font-700 py-3 rounded-lg">{downloaded ? 'PDF Invoice Downloaded' : 'Download PDF Invoice'}</button>
          <button onClick={() => navigate('orders')} className="mt-3 w-full border border-stone-200 text-ink font-600 py-3 rounded-lg">View My Orders</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-parchment pb-20">
      <header className="bg-white border-b border-stone-200 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <p className="text-olive-600 text-xs font-700 tracking-widest uppercase mb-2">Order Form</p>
              <h1 className="text-4xl font-700 text-ink">Quotation</h1>
              <p className="text-stone-500 mt-2">Review your items, schedule, claim method, and payment terms before submitting.</p>
            </div>
            <div className="sm:min-w-72 sm:text-right text-sm space-y-1">
              <p className="text-stone-500">Reference: <span className="font-700 text-ink tabular-nums">{orderReference}</span></p>
              <p className="text-stone-500">Issue date: <span className="font-600 text-ink tabular-nums">{formattedIssueDate}</span></p>
              <p className="text-stone-500">Quotation valid until: <span className="font-700 text-ink tabular-nums">{formattedValidityDate}</span></p>
              <p className="text-stone-500">Payment due by: <span className="font-700 text-ink tabular-nums">{paymentDueBy}</span></p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 mt-10 space-y-6">
        <Section number="1" title="Cart Items">
          <div className="space-y-3">
            {quotationItems.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="font-700 text-ink">{item.product}</p>
                  <p className="text-stone-500 text-sm mt-1">{item.material} · {item.printType}{item.zones.length ? ` · ${item.zones.join(', ')}` : ''}</p>
                  <p className="text-stone-400 text-xs mt-1 text-left">{item.sizes.map((size) => `${size.size} × ${size.qty}`).join(' · ')}</p>
                </div>
                <div className="sm:text-right flex-shrink-0 tabular-nums">
                  <p className="text-stone-500 text-sm text-right">₱{item.unitPrice.toFixed(2)}</p>
                  <p className="font-700 text-ink text-right">Estimated Total ₱{item.subtotal.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section number="2" title="Schedule / Deadline">
          <div className="grid sm:grid-cols-2 gap-4">
            <DateField label="Event Date" value={eventDate} onChange={setEventDate} />
            <DateField label="Needed By (Deadline)" value={deadline} onChange={setDeadline} clock />
          </div>
        </Section>

        <Section number="3" title="Claim Method">
          <div className="grid sm:grid-cols-2 gap-4">
            <ChoiceCard active={claimMethod === 'pickup'} onClick={() => setClaimMethod('pickup')} title="Pick-up" description="Rm B5 Friendship Building, Lopez Jaena St., Subangdaku, Mandaue City" />
            <ChoiceCard active={claimMethod === 'delivery'} onClick={() => { setClaimMethod('delivery'); if (user?.contact) setDeliveryAddress(addressFromContact(user.contact)) }} title="Delivery" description="Delivered to your confirmed address" />
          </div>
          {claimMethod === 'delivery' && (
            <label className="block mt-4 text-sm font-600 text-ink">
              <span className="block mb-2">Delivery address</span>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Delivery address"
                required
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-stone-50 text-ink focus:outline-none focus:ring-2 focus:ring-olive-400 resize-none"
              />
            </label>
          )}
          {user?.contact ? (
            <div className="mt-4 bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-700 text-ink">Contact details</p>
                <p className="text-stone-500 mt-1">{user.contact.fullName} · {user.contact.mobile}</p>
                <p className="text-stone-500">{user.contact.email}</p>
                <p className="text-stone-500">{addressFromContact(user.contact)}</p>
              </div>
              <button type="button" onClick={() => { setConfirmAfterContactSave(false); setShowContactForm(true) }} className="text-sm font-700 text-olive-700 hover:underline">Edit</button>
            </div>
          ) : null}
          {showContactForm && (
            <div className="mt-4 bg-white border border-stone-200 rounded-xl p-5">
              <h3 className="font-display font-700 text-ink mb-4">Contact details</h3>
              <ContactDetailsForm
                initialData={user?.contact ?? { fullName: user?.name ?? '', mobile: '', email: user?.email ?? '', streetAddress: '', barangay: '', city: '', province: '' }}
                submitLabel={user?.contact ? 'Save contact details' : 'Save & continue'}
                onCancel={() => setShowContactForm(false)}
                onSave={(details) => {
                  onSaveContact(details)
                  setDeliveryAddress(addressFromContact(details))
                  setShowContactForm(false)
                  if (confirmAfterContactSave) setConfirmed(true)
                }}
              />
            </div>
          )}
        </Section>

        <Section number="4" title="Payment Terms">
          <div className="grid sm:grid-cols-2 gap-3">
            <ChoiceCard active={paymentTerm === 'half'} onClick={() => setPaymentTerm('half')} title="50% Downpayment / 50% Before Release" description="Standard payment term" />
            <ChoiceCard active={paymentTerm === 'full'} onClick={() => setPaymentTerm('full')} title="Full Payment (100%)" description="Recorded at the shop" />
          </div>
          <p className="font-700 text-sm text-ink mt-6 mb-3">Extended Payment Terms (with charges)</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <ChoiceCard active={paymentTerm === '15'} onClick={() => setPaymentTerm('15')} title={`15 Days Credit, add ${CREDIT_TERM_CHARGES[15] * 100}%`} description="Subject to approval" />
            <ChoiceCard active={paymentTerm === '30'} onClick={() => setPaymentTerm('30')} title={`30 Days Credit, add ${CREDIT_TERM_CHARGES[30] * 100}%`} description="Subject to approval" />
          </div>
          <p className="mt-5 text-sm text-stone-500 bg-stone-50 rounded-lg p-4">Payments are recorded by Nero staff.</p>
          <div className="flex flex-wrap gap-5 mt-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={memberDiscount} onChange={(e) => setMemberDiscount(e.target.checked)} className="accent-olive-600" /> Apply membership discount</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} className="accent-olive-600" /> Rush order</label>
          </div>
        </Section>

        <Section number="5" title="Billing Statement (Preview)">
          <div className="border border-stone-200 rounded-lg p-6 sm:p-8 bg-[#fffefa]">
            <div className="flex justify-between gap-4 border-b border-stone-200 pb-5 mb-5">
              <div><p className="font-800 text-xl text-ink">NERO</p><p className="text-xs text-stone-500">Printing Services and Trading</p></div>
              <div className="text-right"><p className="font-700 text-ink">Billing Statement</p><p className="text-xs text-stone-500 tabular-nums">{orderReference}</p><p className="text-xs text-stone-500">Preview only, final billing is issued by Nero</p></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 border-b border-stone-200 pb-4 mb-5 text-sm">
              <div><span className="text-stone-500">Quotation valid until:</span> <span className="font-700 text-ink tabular-nums">{formattedValidityDate}</span></div>
              <div className="sm:text-right"><span className="text-stone-500">Payment due by:</span> <span className="font-700 text-ink tabular-nums">{paymentDueBy}</span></div>
            </div>
            {user?.npc && isLoggedIn && (
              <div className="border-b border-stone-200 pb-4 mb-5 grid sm:grid-cols-2 gap-2 text-sm">
                <div className="space-y-1">
                  <p><span className="text-stone-500">NPC number:</span> <span className="font-600 text-ink tabular-nums">{user.npc.number}</span></p>
                  <p><span className="text-stone-500">Tier:</span> <span className="font-600 text-ink">{user.npc.tier}</span></p>
                </div>
                <div className="sm:text-right space-y-1">
                  {npcIsValid ? (
                    <>
                      <p><span className="text-stone-500">Valid until:</span> <span className="font-600 text-ink tabular-nums">{npcValidityDate ? formatDate(npcValidityDate) : ''}</span></p>
                      {memberDiscount && <p className="text-olive-700 font-600">Membership discount applied: {membershipRate * 100}%</p>}
                    </>
                  ) : (
                    <p className="text-red-600 font-700">Membership expired</p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_6rem] items-center gap-3 pb-2 text-xs font-600 text-stone-500">
                <span className="text-right">No.</span>
                <span className="text-left">Item</span>
                <span className="text-right tabular-nums">Line Total</span>
              </div>
              {quotationItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_6rem] items-start gap-3">
                  <span className="text-right text-stone-500 tabular-nums">{index + 1}.</span>
                  <span className="text-left text-stone-600">{item.product} · {item.totalQty} pcs</span>
                  <span className="text-right font-600 text-ink tabular-nums">₱{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-stone-200 my-3" />
              <SummaryRow label="Subtotal" value={subtotal} />
              {volumeDiscount > 0 && <SummaryRow label="Volume Discount" value={-volumeDiscount} discount />}
              {membershipDiscount > 0 && <SummaryRow label="Membership Discount" value={-membershipDiscount} discount />}
              {rushSurcharge > 0 && <SummaryRow label="Rush Surcharge" value={rushSurcharge} />}
              {creditCharge > 0 && <SummaryRow label={`Credit-term Charge (${creditRate * 100}%)`} value={creditCharge} />}
              <div className="border-t border-stone-300 mt-4 pt-4 flex justify-between items-center gap-4"><span className="font-700 text-ink">Grand Total</span><span className="text-2xl font-800 text-ink text-right tabular-nums">₱{grandTotal.toFixed(2)}</span></div>
              <SummaryRow label="Downpayment Due (50%)" value={downpayment} />
              <SummaryRow label="Balance" value={balance} />
            </div>
          </div>
        </Section>

        <Section number="6" title="Terms & Conditions">
          <div className="max-h-36 overflow-y-auto bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-600 leading-relaxed">{termsText}</div>
          <label className="flex items-start gap-3 mt-4 text-sm font-600 text-ink cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-olive-600" />
            I have read and agree to the Terms &amp; Conditions
          </label>
        </Section>

        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-2">
          <button onClick={() => navigate('customize')} className="px-7 py-3 border border-stone-200 text-ink font-700 rounded-lg">Back</button>
          <div className="sm:text-right">
            {!isLoggedIn && <p className="text-sm text-stone-500 mb-2">Log in before submitting your quotation.</p>}
            <button
              onClick={() => {
                if (!user?.contact) {
                  setConfirmAfterContactSave(true)
                  setShowContactForm(true)
                } else {
                  setConfirmed(true)
                }
              }}
              disabled={!agreed || !isLoggedIn || (claimMethod === 'delivery' && !deliveryAddress && !!user?.contact)}
              className="px-8 py-3 bg-olive-500 hover:bg-olive-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-700 rounded-lg transition-colors"
            >
              Submit Quotation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="bg-white border border-stone-200 rounded-lg overflow-hidden"><div className="flex items-center gap-3 px-6 py-4 bg-stone-50 border-b border-stone-200"><span className="w-7 h-7 rounded-full bg-ink text-white text-sm font-700 flex items-center justify-center">{number}.</span><h2 className="font-700 text-ink">{title}</h2></div><div className="p-6">{children}</div></section>
}

function DateField({ label, value, onChange, clock }: { label: string; value: string; onChange: (value: string) => void; clock?: boolean }) {
  return <label className="block"><span className="flex items-center gap-2 text-sm font-600 text-ink mb-2"><svg className="w-4 h-4 text-olive-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={clock ? 'M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z'}/></svg>{label}</span><input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-olive-400" /></label>
}

function ChoiceCard({ active, onClick, title, description }: { active: boolean; onClick: () => void; title: string; description: string }) {
  return <button onClick={onClick} className={`text-left p-4 rounded-lg border-2 transition-colors ${active ? 'border-olive-500 bg-olive-50' : 'border-stone-200 hover:border-olive-300'}`}><span className="font-700 text-ink block">{title}</span><span className="text-sm text-stone-500 block mt-1 leading-relaxed">{description}</span></button>
}

function SummaryRow({ label, value, discount }: { label: string; value: number; discount?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-stone-600 text-left">{label}</span>
      <span className={`font-600 text-right tabular-nums ${discount ? 'text-olive-700' : 'text-ink'}`}>
        {value < 0 ? '-' : ''}₱{Math.abs(value).toFixed(2)}
      </span>
    </div>
  )
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
