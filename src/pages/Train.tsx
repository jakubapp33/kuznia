import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { TEMPLATES } from '../data/plans'
import { db, setSetting } from '../db/db'
import { fmtDate, fmtDuration } from '../lib/format'
import { useActiveWorkout, useSetting } from '../lib/hooks'
import { workoutSetCount } from '../lib/stats'
import { newId, nextDay, startWorkout } from '../lib/workout'
import type { Plan } from '../types'

export function Train() {
  const nav = useNavigate()
  const plans = useLiveQuery(() => db.plans.orderBy('createdAt').toArray(), [], [])
  const activePlanId = useSetting<number>('activePlanId')
  const active = useActiveWorkout()
  const recent = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().limit(60).toArray(), [], [])
  const activePlan = plans.find((p) => p.id === activePlanId)
  const next = activePlan ? nextDay(activePlan, recent) : undefined

  async function begin(plan?: Plan, dayId?: string) {
    const day = plan?.days.find((d) => d.id === dayId)
    await startWorkout(plan, day)
    nav('/trening/sesja')
  }

  async function newPlan() {
    const id = await db.plans.add({ name: 'Mój plan', days: [{ id: newId(), name: 'Dzień 1', exercises: [] }], createdAt: Date.now() })
    if (!activePlanId) await setSetting('activePlanId', id)
    nav(`/trening/plan/${id}`)
  }

  return (
    <div className="page">
      <PageHead
        title="Trening"
        right={
          <Link to="/trening/historia" className="icon-btn filled" aria-label="Historia treningów">
            <Icon name="calendar" />
          </Link>
        }
      />

      {active ? (
        <Link to="/trening/sesja" className="card accent hstack">
          <Icon name="bolt" />
          <div className="grow" style={{ flex: 1 }}>
            <b>Trening w toku: {active.name}</b>
            <div className="small">Dotknij, aby wrócić</div>
          </div>
          <Icon name="chev" />
        </Link>
      ) : (
        <button className="btn block lg" onClick={() => begin()}>
          <Icon name="plus" /> Pusty trening
        </button>
      )}

      {activePlan && (
        <>
          <div className="section-title">
            Aktywny plan
            <Link to={`/trening/plan/${activePlan.id}`}>Edytuj</Link>
          </div>
          <div className="card flush">
            <div style={{ padding: '14px 16px 4px' }}>
              <h2>{activePlan.name}</h2>
              {activePlan.description && <div className="small muted">{activePlan.description}</div>}
            </div>
            <div className="list">
              {activePlan.days.map((d) => (
                <div key={d.id} className="row">
                  <div className="grow">
                    <div className="title hstack">
                      {d.name}
                      {next?.id === d.id && <span className="pill accent">następny</span>}
                    </div>
                    <div className="meta">{d.exercises.length} ćwiczeń · {d.exercises.reduce((n, e) => n + e.sets, 0)} serii</div>
                  </div>
                  <button className={'btn sm' + (next?.id === d.id ? ' primary' : '')} disabled={!!active || !d.exercises.length} onClick={() => begin(activePlan, d.id)}>
                    <Icon name="play" size={14} /> Start
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="section-title">
        Moje plany
        <button onClick={newPlan}>+ Nowy</button>
      </div>
      {plans.length === 0 ? (
        <div className="card empty">
          Nie masz jeszcze planu. Wybierz gotowy poniżej albo stwórz własny.
        </div>
      ) : (
        <div className="card flush list">
          {plans.map((p) => (
            <Link key={p.id} to={`/trening/plan/${p.id}`} className="row">
              <div className="grow">
                <div className="title">{p.name}</div>
                <div className="meta">{p.days.length} {p.days.length === 1 ? 'dzień' : 'dni'} treningowe</div>
              </div>
              {p.id === activePlanId && <span className="pill good">aktywny</span>}
              <Icon name="chev" className="chev" size={18} />
            </Link>
          ))}
        </div>
      )}

      <div className="section-title">Gotowe plany oparte na badaniach</div>
      <div className="card flush list">
        {TEMPLATES.map((t) => (
          <Link key={t.id} to={`/trening/szablon/${t.id}`} className="row">
            <div className="grow">
              <div className="title">{t.name}</div>
              <div className="meta">{t.level} · {t.perWeek}</div>
            </div>
            <Icon name="chev" className="chev" size={18} />
          </Link>
        ))}
      </div>

      {recent.some((w) => w.finishedAt) && (
        <>
          <div className="section-title">
            Ostatnie treningi
            <Link to="/trening/historia">Wszystkie</Link>
          </div>
          <div className="card flush list">
            {recent.filter((w) => w.finishedAt).slice(0, 3).map((w) => (
              <Link key={w.id} to={`/trening/historia/${w.id}`} className="row">
                <div className="grow">
                  <div className="title">{w.name}</div>
                  <div className="meta">{fmtDate(w.date)} · {fmtDuration(w.finishedAt! - w.startedAt)} · {workoutSetCount(w)} serii</div>
                </div>
                <Icon name="chev" className="chev" size={18} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
