import { MICRO_INFO, limits, microNorm } from '../data/micros'
import { num } from '../lib/format'
import { useProfile, useTargets } from '../lib/hooks'
import type { Micro } from '../types'

interface Values {
  fiber?: number
  sugar?: number
  satFat?: number
  salt?: number
  micro?: Micro
}

function Row({ label, value, unit, pct, limit }: { label: string; value: number; unit: string; pct?: number; limit?: boolean }) {
  const over = limit && pct !== undefined && pct > 100
  const color = limit ? (over ? 'var(--bad)' : 'var(--warn)') : pct !== undefined && pct >= 100 ? 'var(--good)' : 'var(--accent)'
  return (
    <div className="stack" style={{ gap: 3 }}>
      <div className="hstack small">
        <span style={{ flex: 1 }}>{label}</span>
        <b className="num">{num(value, value < 10 ? 1 : 0)} {unit}</b>
        {pct !== undefined && (
          <span className="num tiny" style={{ minWidth: 44, textAlign: 'right', color: over ? 'var(--bad)' : 'var(--text-2)' }}>
            {limit ? 'lim. ' : ''}{Math.round(pct)}%
          </span>
        )}
      </div>
      {pct !== undefined && (
        <div className="bar" style={{ height: 5 }}>
          <i style={{ width: `${Math.min(100, pct)}%`, background: color }} />
        </div>
      )}
    </div>
  )
}

/** szczegóły odżywcze: błonnik, cukry, tłuszcze nasycone, sól, witaminy i minerały z % normy dziennej */
export function Nutrients({ v, showMissing = false }: { v: Values; showMissing?: boolean }) {
  const profile = useProfile()
  const targets = useTargets()
  const kcal = targets?.kcal ?? 2000
  const lim = limits(kcal)
  const fiberGoal = targets?.fiber ?? Math.round((kcal / 1000) * 14)
  const micros = MICRO_INFO.filter((m) => m.key !== 'na' && (v.micro?.[m.key] ?? 0) > 0)
  const missing = MICRO_INFO.filter((m) => m.key !== 'na' && m.key !== 'chol' && !(v.micro?.[m.key] ?? 0))
  return (
    <div className="stack" style={{ gap: 10 }}>
      {v.fiber !== undefined && <Row label="Błonnik" value={v.fiber} unit="g" pct={(v.fiber / fiberGoal) * 100} />}
      {v.sugar !== undefined && <Row label="Cukry" value={v.sugar} unit="g" pct={(v.sugar / lim.sugar) * 100} limit />}
      {v.satFat !== undefined && <Row label="Kwasy tł. nasycone" value={v.satFat} unit="g" pct={(v.satFat / lim.satFat) * 100} limit />}
      {v.salt !== undefined && <Row label="Sól" value={v.salt} unit="g" pct={(v.salt / lim.salt) * 100} limit />}
      {micros.length > 0 && <div className="tiny muted" style={{ fontWeight: 650, marginTop: 4 }}>WITAMINY I MINERAŁY</div>}
      {micros.map((m) => {
        const n = microNorm(m, profile?.sex, profile?.age)
        return <Row key={m.key} label={m.name} value={v.micro![m.key]} unit={m.unit} pct={n ? (v.micro![m.key] / n) * 100 : undefined} />
      })}
      {showMissing && missing.length > 0 && micros.length > 0 && (
        <div className="tiny muted">Brak danych: {missing.map((m) => m.name).join(', ')}.</div>
      )}
      {micros.length === 0 && v.fiber === undefined && v.sugar === undefined && (
        <div className="small muted">Producent nie podał szczegółowych wartości dla tego produktu.</div>
      )}
      <div className="tiny muted">% normy dziennej dla Twojego wieku i płci. „Lim.” = górny limit zalecanego spożycia.</div>
    </div>
  )
}
