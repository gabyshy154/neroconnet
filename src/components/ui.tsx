import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react"

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.08em] text-stone-600">
      {children}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ""}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className ?? ""}`} />
}

export function Button({
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "danger" | "success"
}) {
  return (
    <button
      {...props}
      className={`button button-${tone} ${props.className ?? ""}`}
    />
  )
}

export function Card({
  className = "",
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`rounded-xl border border-stone-300 bg-white ${className}`}
    >
      {children}
    </section>
  )
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "green" | "amber" | "red"
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
