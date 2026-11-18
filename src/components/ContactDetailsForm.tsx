import { useState } from 'react'

export interface ContactDetails {
  fullName: string
  mobile: string
  email: string
  streetAddress: string
  barangay: string
  city: string
  province: string
}

interface Props {
  initialData: ContactDetails
  onSave: (details: ContactDetails) => void
  onCancel?: () => void
  submitLabel?: string
}

export function addressFromContact(details: ContactDetails) {
  return [
    details.streetAddress,
    details.barangay,
    details.city,
    details.province,
  ].filter(Boolean).join(', ')
}

export default function ContactDetailsForm({
  initialData,
  onSave,
  onCancel,
  submitLabel = 'Save contact details',
}: Props) {
  const [details, setDetails] = useState(initialData)
  const [submitted, setSubmitted] = useState(false)

  const phoneValid = /^(\+639\d{9}|09\d{9})$/.test(details.mobile.trim())
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())
  const requiredFieldsValid =
    details.fullName.trim() &&
    phoneValid &&
    emailValid &&
    details.streetAddress.trim() &&
    details.barangay.trim() &&
    details.city.trim()

  function update(field: keyof ContactDetails, value: string) {
    setDetails((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!requiredFieldsValid) return
    onSave({ ...details, fullName: details.fullName.trim(), mobile: details.mobile.trim(), email: details.email.trim() })
  }

  const inputClass = 'w-full px-4 py-3 rounded-lg border border-stone-200 bg-stone-50 text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-olive-400'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-600 text-ink">
          <span className="block mb-2">Full name</span>
          <input value={details.fullName} onChange={(e) => update('fullName', e.target.value)} required className={inputClass} />
        </label>
        <label className="block text-sm font-600 text-ink">
          <span className="block mb-2">Mobile number</span>
          <input
            type="tel"
            value={details.mobile}
            onChange={(e) => update('mobile', e.target.value)}
            placeholder="09XXXXXXXXX or +639XXXXXXXXX"
            required
            aria-invalid={submitted && !phoneValid}
            aria-describedby="mobile-error"
            className={inputClass}
          />
          {submitted && !phoneValid && <span id="mobile-error" className="block mt-1.5 text-xs text-red-600">Enter a valid PH mobile number: 09XXXXXXXXX or +639XXXXXXXXX.</span>}
        </label>
        <label className="block text-sm font-600 text-ink sm:col-span-2">
          <span className="block mb-2">Email</span>
          <input
            type="email"
            value={details.email}
            onChange={(e) => update('email', e.target.value)}
            required
            aria-invalid={submitted && !emailValid}
            className={inputClass}
          />
          {submitted && !emailValid && <span className="block mt-1.5 text-xs text-red-600">Enter a valid email address.</span>}
        </label>
        <label className="block text-sm font-600 text-ink sm:col-span-2">
          <span className="block mb-2">Street address</span>
          <input value={details.streetAddress} onChange={(e) => update('streetAddress', e.target.value)} required className={inputClass} />
        </label>
        <label className="block text-sm font-600 text-ink">
          <span className="block mb-2">Barangay</span>
          <input value={details.barangay} onChange={(e) => update('barangay', e.target.value)} required className={inputClass} />
        </label>
        <label className="block text-sm font-600 text-ink">
          <span className="block mb-2">City / municipality</span>
          <input value={details.city} onChange={(e) => update('city', e.target.value)} required className={inputClass} />
        </label>
        <label className="block text-sm font-600 text-ink sm:col-span-2">
          <span className="block mb-2">Province <span className="font-400 text-stone-400">(optional)</span></span>
          <input value={details.province} onChange={(e) => update('province', e.target.value)} className={inputClass} />
        </label>
      </div>
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
        {onCancel && <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-stone-200 text-stone-600 font-600">Cancel</button>}
        <button type="submit" className="px-5 py-2.5 rounded-lg bg-olive-500 hover:bg-olive-600 text-white font-700">{submitLabel}</button>
      </div>
    </form>
  )
}
