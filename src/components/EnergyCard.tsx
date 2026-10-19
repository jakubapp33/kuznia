import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../db/db'
import { analyzeEnergy } from '../lib/energy'
import { isoDate, num } from '../lib/format'
import { useProfile } from '../lib/hooks'
import { Icon } from './Icon'

/** bilans energii z 14 dni: jedzenie vs spalanie z zegarka, porównany z trendem wagi */
export function EnergyCard({ compact = false }: { compact?: boolean }) {
  const profile = useProfile() ?? undefined
  const today = isoDate()
  const data = useLiveQuery(async () => {
    const [food, days, body] = await Promise.all([
      db.foodLog.toArray(),
      db.days.toArray(),
      db.body.orderBy('date').toArray(),
    ])
    return { food, days, body }
  }, [])
  if (!data) return null
  const a = analyzeEnergy(data.food, data.days, data.body, today, profile)
  if (!a.verdict) return null
  const v = a.verdict
  const tone = v.tone === 'good' ? 'good' : v.tone === 'warn' ? 'warn' : ''

  if (compact) {
    return (
      <Link to="/postep?tab=body" className="card stack" style={{ gap: 6 }}>
        <div className="hstack"><Icon name="flame" /><h3 style={{ flex: 1 }}>Bilans 14 dni</h3><Icon name="chev" className="chev" size={18} /></div>
        <div className="small"><b>{v.title}.</b>{a.avgSteps !== undefined && <span className="muted"> Średnio {Math.round(a.avgSteps).toLocaleString('pl-PL')} kroków.</span>}</div>
      </Link>
    )
  }

  return (
    <div className="card stack">
      <div className="hstack"><Icon name="flame" /><h3>Bilans energii (14 dni)</h3></div>
      {a.n > 0 && (
        <div className="grid3">
          <div className="stat"><span className="v">{Math.round(a.avgEaten)}</span><span className="l">zjedzone / dzień</span></div>
          <div className="stat"><span className="v">{Math.round(a.avgBurned)}</span><span className="l">spalone / dzień</span></div>
          <div className="stat"><span className="v" style={{ color: a.avgBalance < 0 ? 'var(--good)' : undefined }}>{a.avgBalance > 0 ? '+' : '−'}{Math.abs(Math.round(a.avgBalance))}</span><span className="l">bilans kcal</span></div>
        </div>
      )}
      <div className={'note ' + tone}>
        <b>{v.title}</b>
        <div className="small" style={{ marginTop: 2 }}>{v.text}</div>
      </div>
      {a.avgSteps !== undefined && <div className="small muted">Średnio <b className="num">{Math.round(a.avgSteps).toLocaleString('pl-PL')}</b> kroków dziennie ({a.stepsDays} dni).</div>}
      {a.fromWeight !== undefined && a.n > 0 && (
        <div className="tiny muted">Bilans z wagi = tempo zmiany wagi × 7700 kcal/kg. To najpewniejsza miara, bo nie zależy od dokładności zegarka ani etykiet. Liczę tylko dni z min. 800 kcal w dzienniku ({num(a.n, 0)} dni).</div>
      )}
    </div>
  )
}
