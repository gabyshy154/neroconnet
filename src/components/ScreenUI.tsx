import type { ReactNode } from 'react'

const colors = {
  foreground: '#1C1C18',
  muted: '#7A7A6E',
  card: '#FAFAF7',
  background: '#F4F3EE',
  border: '#D8D5CC',
  accent: '#5A6E47',
  accentLight: '#EAF0E4',
  error: '#9B3526',
  errorLight: '#FBF0EB',
  success: '#276749',
  successLight: '#E8F5EE',
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header style={{ marginBottom: 20 }}>
      <h1 style={{ color: colors.foreground, fontSize: 22, fontWeight: 650, letterSpacing: '-0.03em' }}>{title}</h1>
      <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{subtitle}</p>
    </header>
  )
}

export function ScreenCard({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: 18,
      ...style,
    }}>
      {children}
    </section>
  )
}

export function ScreenFeedback({
  success,
  error,
}: {
  success?: string
  error?: string
}) {
  if (error) {
    return (
      <div role="alert" style={{
        padding: '10px 12px',
        borderRadius: 6,
        marginBottom: 16,
        background: colors.errorLight,
        border: '1px solid #E8C4B4',
        color: colors.error,
        fontSize: 13,
      }}>{error}</div>
    )
  }
  if (success) {
    return (
      <div role="status" style={{
        padding: '10px 12px',
        borderRadius: 6,
        marginBottom: 16,
        background: colors.successLight,
        border: '1px solid #B7D9C5',
        color: colors.success,
        fontSize: 13,
      }}>{success}</div>
    )
  }
  return null
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p style={{
      padding: 24,
      color: colors.muted,
      background: colors.background,
      border: `1px dashed ${colors.border}`,
      borderRadius: 6,
      fontSize: 13,
      textAlign: 'center',
    }}>{children}</p>
  )
}

export function ScreenButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const variantStyle = {
    primary: { background: colors.accent, color: '#fff', border: '1px solid #4A5A38' },
    secondary: { background: colors.card, color: colors.foreground, border: `1px solid ${colors.border}` },
    danger: { background: colors.errorLight, color: colors.error, border: '1px solid #E8C4B4' },
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variantStyle,
        borderRadius: 6,
        padding: '7px 12px',
        font: '500 12px Inter, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

export const screenColors = colors
