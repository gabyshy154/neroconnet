import { useState } from "react"
import type { Staff } from "../types"
import { Button, Card, FieldLabel, Input, Select } from "../components/ui"

export function SignIn({
  staff,
  onSignIn,
}: {
  staff: Staff[]
  onSignIn: (staffId: string, pin: string) => void
}) {
  const [staffId, setStaffId] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const submit = () => {
    try {
      onSignIn(staffId, pin)
      setError("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.")
    }
  }

  return (
    <div className="signin-shell">
      <Card className="signin-card p-6">
        <div className="brand-mark mx-auto">N</div>
        <p className="eyebrow mt-4 text-center">Nero Printing Services</p>
        <h1 className="mt-1 text-center text-2xl font-black">NeroConnect</h1>
        <p className="mb-5 mt-2 text-center text-sm text-stone-500">
          Staff sign-in · Demo PIN: any 4–6 digits
        </p>
        <div className="space-y-4">
          <div>
            <FieldLabel>Staff name</FieldLabel>
            <Select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">Select your name</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>PIN</FieldLabel>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              onKeyDown={(event) => event.key === "Enter" && submit()}
              placeholder="Enter 4–6 digit demo PIN"
            />
          </div>
          {error && <div className="alert-banner" role="alert">{error}</div>}
          <Button className="w-full" disabled={!staffId || pin.length < 4} onClick={submit}>
            Sign in
          </Button>
        </div>
      </Card>
    </div>
  )
}
