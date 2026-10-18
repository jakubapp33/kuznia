import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router'
import { BodyMap } from '../components/BodyMap'
import { Icon } from '../components/Icon'
import { LineChart } from '../components/LineChart'
import { TopBar } from '../components/ui'
import { MUSCLES } from '../data/muscles'
import { db } from '../db/db'
import { fmtDate, num } from '../lib/format'
import { useExercises } from '../lib/hooks'
import { e1rm, exerciseHistory, records, workingSets } from '../lib/progression'

export function ExerciseDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { map } = useExercises()
  const ex = map.get(id ?? '')
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], [])
  if (!ex) return <div className="page"><TopBar title="Ćwiczenie" /></div>

  const hist = exerciseHistory(workouts, ex.id)
  const rec = records(hist)
  const isWeighted = ex.load === 'weight' || (ex.load === 'bodyweight' && hist.some((h) => workingSets(h.we).some((s) => s.w)))
  const chart = [...hist].reverse().map(({ workout, we }) => {
    const sets = workingSets(we)
    const value = isWeighted
      ? Math.max(...sets.map((s) => ((s.r ?? 0) <= 15 ? e1rm(s.w ?? 0, s.r ?? 0) : s.w ?? 0)))
      : ex.load === 'time' || ex.load === 'cardio'
        ? Math.max(...sets.map((s) => s.t ?? 0))
        : Math.max(...sets.map((s) => s.r ?? 0))
    return { date: workout.date, value }
  }).filter((p) => p.value > 0)

  async function remove() {
    if (!confirm('Usunąć to własne ćwiczenie? Historia treningów zostanie, ale bez nazwy.')) return
    await db.customExercises.delete(ex!.id)
    nav('/cwiczenia', { replace: true })
  }

  return (
    <div className="page">
      <TopBar
        title={ex.pl}
        right={ex.custom ? <Link to={`/cwiczenia/${ex.id}/edytuj`} className="icon-btn" aria-label="Edytuj"><Icon name="edit" /></Link> : undefined}
      />
      <div style={{ marginTop: -12, paddingLeft: 52 }} className="muted">{ex.en}</div>

      <div className="hstack wrap">
        <span className="pill accent">{ex.compound ? 'wielostawowe' : 'izolowane'}</span>
        <span className="pill">{ex.equipment}</span>
        {ex.load === 'time' && <span className="pill">na czas</span>}
      </div>

      <div className="card stack">
        <BodyMap primary={ex.primary} secondary={ex.secondary} />
        <div className="grid2 small">
          <div>
            <div className="tiny muted" style={{ fontWeight: 650, marginBottom: 2 }}>GŁÓWNIE</div>
            {ex.primary.map((m) => <div key={m}>{MUSCLES[m]}</div>)}
          </div>
          {ex.secondary.length > 0 && (
            <div>
              <div className="tiny muted" style={{ fontWeight: 650, marginBottom: 2 }}>POMOCNICZO</div>
              {ex.secondary.map((m) => <div key={m}>{MUSCLES[m]}</div>)}
            </div>
          )}
        </div>
      </div>

      {ex.steps.filter(Boolean).length > 0 && (
        <>
          <div className="section-title">Technika</div>
          <div className="card">
            <ol className="steps">
              {ex.steps.filter(Boolean).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        </>
      )}

      {ex.tips.filter(Boolean).length > 0 && (
        <>
          <div className="section-title">Wskazówki</div>
          <div className="card stack" style={{ gap: 8 }}>
            {ex.tips.filter(Boolean).map((t, i) => (
              <div key={i} className="hstack small" style={{ alignItems: 'flex-start' }}>
                <Icon name="bolt" size={16} className="chev" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Twoje wyniki</div>
      {hist.length === 0 ? (
        <div className="card empty small">Jeszcze nie wykonywałeś tego ćwiczenia. Wyniki i wykres pojawią się po pierwszym treningu.</div>
      ) : (
        <>
          <div className="card grid2">
            {rec.e1rm && isWeighted && (
              <div className="stat"><span className="v">{num(rec.e1rm.value)}<small>kg</small></span><span className="l">szacowany max (1RM)</span></div>
            )}
            {rec.weight && (
              <div className="stat"><span className="v">{num(rec.weight.w)}<small>kg × {rec.weight.r}</small></span><span className="l">najcięższa seria</span></div>
            )}
            {rec.reps && (
              <div className="stat"><span className="v">{rec.reps.r}<small>powt.</small></span><span className="l">najwięcej powtórzeń</span></div>
            )}
            <div className="stat"><span className="v">{hist.length}</span><span className="l">sesji</span></div>
          </div>
          {chart.length > 1 && (
            <div className="card stack">
              <h3>{isWeighted ? 'Szacowany max (1RM)' : ex.load === 'time' || ex.load === 'cardio' ? 'Najdłuższa seria' : 'Najwięcej powtórzeń'}</h3>
              <LineChart points={chart} unit={isWeighted ? 'kg' : ''} />
            </div>
          )}
          <div className="card flush list">
            {hist.slice(0, 8).map(({ workout, we }) => (
              <Link key={workout.id} to={`/trening/historia/${workout.id}`} className="row">
                <div className="grow">
                  <div className="title small">{fmtDate(workout.date)}</div>
                  <div className="meta num">
                    {workingSets(we).map((s) => (ex.load === 'time' || ex.load === 'cardio' ? `${s.t}${ex.load === 'time' ? 's' : 'min'}` : s.w ? `${num(s.w)}×${s.r}` : `${s.r}`)).join(' · ')}
                  </div>
                </div>
                <Icon name="chev" className="chev" size={18} />
              </Link>
            ))}
          </div>
        </>
      )}

      {ex.custom && <button className="btn danger block" onClick={remove}><Icon name="trash" size={18} /> Usuń ćwiczenie</button>}
    </div>
  )
}
