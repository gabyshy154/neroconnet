import { useState } from 'react'
import type { PageId } from '../App'

interface Props {
  navigate: (page: PageId) => void
  onLogin: (user: { name: string; email: string }) => void
}

export default function Auth({ navigate, onLogin }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    onLogin({ name: 'Juan dela Cruz', email: loginForm.email })
    navigate('home')
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (regForm.password !== regForm.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    onLogin({ name: regForm.name, email: regForm.email })
    navigate('home')
  }

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-olive-600 text-xs font-700 tracking-widest uppercase mb-2">NeroConnect</p>
          <h1 className="font-display text-3xl font-700 text-ink">{tab === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p className="text-stone-500 text-sm mt-2">Manage quotations and track every order in one place.</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          <div className="flex border-b border-stone-200">
            {(['login', 'register'] as const).map((item) => (
              <button
                key={item}
                onClick={() => { setTab(item); setError('') }}
                className={`flex-1 py-4 font-600 text-sm transition-colors ${tab === item ? 'text-olive-700 border-b-2 border-olive-500 bg-olive-50' : 'text-stone-500 hover:text-ink'}`}
              >
                {item === 'login' ? 'Log In' : 'Register'}
              </button>
            ))}
          </div>
          <div className="p-8">
            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <Field label="Email" type="email" value={loginForm.email} onChange={(email) => setLoginForm({ ...loginForm, email })} placeholder="you@email.com" />
                <Field label="Password" type="password" value={loginForm.password} onChange={(password) => setLoginForm({ ...loginForm, password })} placeholder="••••••••" />
                <button className="w-full bg-olive-500 hover:bg-olive-600 text-white font-700 py-3 rounded-lg transition-colors">Log In</button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <Field label="Full Name" value={regForm.name} onChange={(name) => setRegForm({ ...regForm, name })} placeholder="Juan dela Cruz" />
                <Field label="Email" type="email" value={regForm.email} onChange={(email) => setRegForm({ ...regForm, email })} placeholder="you@email.com" />
                <Field label="Password" type="password" value={regForm.password} onChange={(password) => setRegForm({ ...regForm, password })} placeholder="••••••••" />
                <Field label="Confirm Password" type="password" value={regForm.confirmPassword} onChange={(confirmPassword) => setRegForm({ ...regForm, confirmPassword })} placeholder="••••••••" />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button className="w-full bg-olive-500 hover:bg-olive-600 text-white font-700 py-3 rounded-lg transition-colors">Create Account</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder }: { label: string; type?: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block text-sm font-600 text-ink">
      <span className="block mb-2">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-stone-50 text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-olive-400"
      />
    </label>
  )
}
