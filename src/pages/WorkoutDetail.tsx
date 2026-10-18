import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/ui'
import { db } from '../db/db'
import { fmtDate, fmtDuration, num } from '../lib/format'
import { useExercises } from '../lib/hooks'
import { e1rm, exerciseHistory, records } from '../lib/progression'
import { workoutSetCount, workoutVolume } from '../lib/stats'

export function WorkoutDetail() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const fresh = params.get('nowy') === '1'
  const w = useLiveQuery(() => db.workouts.get(Number(id)), [id])
  const all = useLiveQuery(() => db.workouts.toArray(), [], [])
  const { map } = useExercises()
  if (!w) return <div className="page"><TopBar title="Trening" back="/trening/historia" /></div>

  // rekordy pobite w tym treningu (porównanie z wcześniejszymi treningami)
  const prs: string[] = []
  for (const we of w.exercises) {
    const before = exerciseHistory(all.filter((x) => x.startedAt < w.startedAt), we.exerciseId)
    if (!before.length) continue
    const r = records(before)
    const best = Math.max(0, ...we.sets.filter((s) => !s.warmup).map((s) => (s.r && s.r <= 15 ? e1rm(s.w ?? 0, s.r) : 0)))
    const heaviest = Math.max(0, ...we.sets.filter((s) => !s.warmup).map((s) => s.w ?? 0))
    const name = map.get(we.exerciseId)?.pl ?? we.exerciseId
    if (r.weight && heaviest > r.weight.w) prs.push(`${name}: nowy rekord ciężaru ${num(heaviest)} kg`)
    else if (r.e1rm && best > r.e1rm.value + 0.01) prs.push(`${name}: nowy szacowany max ${num(best)} kg`)
  }

  async function remove() {
    if (!confirm('Usunąć ten trening z historii?')) return
    await db.workouts.delete(w!.id!)
    nav('/trening/historia', { replace: true })
  }

  return (
    <div className="page">
      <TopBar title={w.name} back={fresh ? '/' : '/trening/historia'} />
      {fresh && (
        <div className="card accent stack" style={{ gap: 4 }}>
          <h2>Dobra robota! 💪</h2>
          <div className="small">Trening zapisany. Pamiętaj o białku i śnie – to w czasie regeneracji rosną mięśnie.</div>
        </div>
      )}
      <div className="card grid3">
        <div className="stat"><span className="v">{fmtDuration(w.finishedAt! - w.startedAt).replace(' min', '')}<small>{fmtDuration(w.finishedAt! - w.startedAt).includes('h') ? '' : 'min'}</small></span><span className="l">czas</span></div>
        <div className="stat"><span className="v">{workoutSetCount(w)}</span><span className="l">serii</span></div>
        <div className="stat"><span className="v">{num(workoutVolume(w) / 1000)}<small>t</small></span><span className="l">objętość</span></div>
      </div>
      {prs.length > 0 && (
        <div className="card stack" style={{ gap: 6 }}>
          <div className="hstack"><Icon name="trophy" /><h3>Rekordy</h3></div>
          {prs.map((p) => <div key={p} className="small">🏆 {p}</div>)}
        </div>
      )}
      <div className="small muted">{fmtDate(w.date, true)}</div>
      {w.exercises.map((we, i) => {
        const ex = map.get(we.exerciseId)
        let n = 0
        return (
          <div key={i} className="card stack" style={{ gap: 6 }}>
            <Link to={`/cwiczenia/${we.exerciseId}`}><h3>{ex?.pl ?? we.exerciseId}</h3></Link>
            {we.sets.map((s, si) => (
              <div key={si} className="hstack small num">
                <span style={{ width: 22, fontWeight: 800, color: s.warmup ? 'var(--warn)' : 'var(--text-2)' }}>{s.warmup ? 'R' : ++n}</span>
                <span>
                  {ex?.load === 'cardio'
                    ? `${num(s.t ?? 0)} min${s.d ? ` · ${num(s.d)} km` : ''}`
                    : ex?.load === 'time'
                      ? `${s.w ? num(s.w) + ' kg · ' : ''}${s.t ?? 0} s`
                      : `${s.w ? num(s.w) + ' kg × ' : ''}${s.r ?? 0} powt.`}
                </span>
                <span className="spacer" />
                {s.w && s.r && !s.warmup ? <span className="tiny muted">≈1RM {num(e1rm(s.w, s.r))}</span> : null}
              </div>
            ))}
            {we.note && <div className="tiny muted">{we.note}</div>}
          </div>
        )
      })}
      <label className="field">
        <span>Notatka do treningu</span>
        <textarea className="input" defaultValue={w.note} placeholder="Samopoczucie, sen, co poprawić…" onBlur={(e) => db.workouts.update(w.id!, { note: e.target.value })} />
      </label>
      <button className="btn danger block" onClick={remove}><Icon name="trash" size={18} /> Usuń trening</button>
    </div>
  )
}
