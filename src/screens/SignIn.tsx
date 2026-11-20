import { useState } from "react"
import { Button, Card, FieldLabel, Input } from "../components/ui"

export function SignIn({
  onSignIn,
}: {
  onSignIn: (identifier: string, password: string) => void
}) {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const canSubmit = Boolean(identifier.trim() && password)
  const submit = () => {
    if (!canSubmit) return
    try {
      onSignIn(identifier, password)
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
          Staff sign-in with your User Management account
        </p>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div>
            <FieldLabel>Email or full name</FieldLabel>
            <Input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value)
                setError("")
              }}
              placeholder="e.g. rina.flores@neroconnect.local"
            />
          </div>
          <div>
            <FieldLabel>Password</FieldLabel>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError("")
              }}
              placeholder="At least 8 characters"
            />
          </div>
          {error && <div className="alert-banner" role="alert">{error}</div>}
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  )
}
