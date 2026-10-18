import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { num, parseNum } from '../lib/format'
import { Icon } from './Icon'

export function PageHead({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
    </header>
  )
}

export function TopBar({ title, right, back }: { title: string; right?: ReactNode; back?: string }) {
  const nav = useNavigate()
  return (
    <header className="topbar">
      <button
        className="icon-btn"
        aria-label="Wstecz"
        onClick={() => (back ? nav(back) : window.history.length > 1 ? nav(-1) : nav('/'))}
      >
        <Icon name="back" />
      </button>
      <h1>{title}</h1>
      {right}
    </header>
  )
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Zamknij" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={String(o.value)} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** pole liczbowe z obsługą przecinka (polska klawiatura iOS) */
export function NumInput({
  value, onChange, placeholder, className = 'input', decimal = true, ariaLabel,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
  className?: string
  decimal?: boolean
  ariaLabel?: string
}) {
  const [text, setText] = useState(value === undefined ? '' : num(value, 2))
  useEffect(() => {
    if (parseNum(text) !== value) setText(value === undefined ? '' : num(value, 2))
  }, [value])
  return (
    <input
      className={className}
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, '')
        setText(t)
        onChange(parseNum(t))
      }}
    />
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small className="muted tiny">{hint}</small>}
    </label>
  )
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={40} stroke={1.6} />
      <div>{children}</div>
    </div>
  )
}

export function Ring({ value, max, size = 132, stroke = 12, children, color = 'var(--accent)' }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const frac = max > 0 ? Math.min(1, value / max) : 0
  const over = max > 0 && value > max * 1.05
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={over ? 'var(--bad)' : color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div className="center">{children}</div>
    </div>
  )
}

export function MacroBars({ eaten, target }: { eaten: { p: number; f: number; c: number }; target?: { p: number; f: number; c: number } }) {
  const items = [
    { k: 'p' as const, label: 'Białko', color: 'var(--prot)' },
    { k: 'c' as const, label: 'Węgle', color: 'var(--carb)' },
    { k: 'f' as const, label: 'Tłuszcze', color: 'var(--fat)' },
  ]
  return (
    <div className="macro-row">
      {items.map((it) => (
        <div key={it.k} className="macro" style={{ ['--c' as string]: it.color }}>
          <div className="lbl">
            <span>{it.label}</span>
          </div>
          <div className="bar">
            <i style={{ width: `${target ? Math.min(100, (eaten[it.k] / Math.max(1, target[it.k])) * 100) : 0}%` }} />
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>
            <b className="num" style={{ color: 'var(--text)', fontSize: 14 }}>{Math.round(eaten[it.k])}</b>
            {target ? ` / ${target[it.k]} g` : ' g'}
          </div>
        </div>
      ))}
    </div>
  )
}
