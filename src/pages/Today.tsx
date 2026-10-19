import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { DayCard } from '../components/DayCard'
import { Icon } from '../components/Icon'
import { MacroBars, NumInput, PageHead, Ring } from '../components/ui'
import { db } from '../db/db'
import { addDays, isoDate, num, plural, weekStart } from '../lib/format'
import { useActiveWorkout, useExercises, useProfile, useSetting, useTargets } from '../lib/hooks'
import { nextDay, startWorkout } from '../lib/workout'
import { analyze } from '../lib/insights'
import { analyzeWeight } from '../lib/weight'
import { EnergyCard } from '../components/EnergyCard'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Dobranoc'
  if (h < 12) return 'Dzień dobry'
  if (h < 18) return 'Cześć'
  return 'Dobry wieczór'
}

export function Today() {
  const nav = useNavigate()
  const today = isoDate()
  const profile = useProfile()
  const targets = useTargets()
  const active = useActiveWorkout()
  const activePlanId = useSetting<number>('activePlanId')
  const plan = useLiveQuery(() => (activePlanId ? db.plans.get(activePlanId) : undefined), [activePlanId])
  const workouts = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().limit(200).toArray(), [], [])
  const food = useLiveQuery(() => db.foodLog.where('date').equals(today).toArray(), [today], [])
  const body = useLiveQuery(() => db.body.orderBy('date').reverse().limit(60).toArray(), [], [])
  const { map } = useExercises()
  const insight = useLiveQuery(async () => {
    const [ws, food, days] = await Promise.all([db.workouts.toArray(), db.foodLog.toArray(), db.days.toArray()])
    return analyze(ws, food, days, map).insights[0] ?? null
  }, [map])
  const trend = analyzeWeight([...body].reverse(), today, profile ?? undefined)
  const [weight, setWeight] = useState<number | undefined>()

  const eaten = food.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, f: a.f + f.f, c: a.c + f.c }), { kcal: 0, p: 0, f: 0, c: 0 })
  const ws = weekStart(today)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  const trainedDays = new Set(workouts.filter((w) => w.finishedAt && w.date >= ws).map((w) => w.date))
  const day = plan ? nextDay(plan, workouts) : undefined
  const todayWeight = body.find((b) => b.date === today)?.weight
  const weights = body.filter((b) => b.weight).map((b) => b.weight!)
  const avg7 = weights.length ? weights.slice(0, 7).reduce((a, b) => a + b, 0) / Math.min(7, weights.length) : undefined

  async function saveWeight() {
    if (!weight) return
    const existing = await db.body.where('date').equals(today).first()
    if (existing) await db.body.update(existing.id!, { weight })
    else await db.body.add({ date: today, weight })
    setWeight(undefined)
  }

  async function start() {
    if (!plan || !day) return
    await startWorkout(plan, day)
    nav('/trening/sesja')
  }

  return (
    <div className="page">
      <PageHead
        title={greeting()}
        sub={new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        right={
          <Link to="/ustawienia" className="icon-btn filled" aria-label="Ustawienia">
            <Icon name="gear" />
          </Link>
        }
      />

      {profile === undefined && (
        <Link to="/dieta/cele" className="card accent stack" style={{ gap: 6 }}>
          <h2>Zacznij od profilu</h2>
          <div>Podaj wiek, wzrost, wagę i cel – wyliczę kalorie i makroskładniki dopasowane do Ciebie.</div>
          <div className="hstack" style={{ fontWeight: 700, marginTop: 4 }}>Uzupełnij <Icon name="chev" size={18} /></div>
        </Link>
      )}

      {active ? (
        <Link to="/trening/sesja" className="card accent stack" style={{ gap: 8 }}>
          <div className="hstack"><Icon name="bolt" /><b>Trening w toku</b></div>
          <h2>{active.name}</h2>
          <div className="small">{active.exercises.length} ćwiczeń · {active.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)} serii zrobionych</div>
          <span className="btn primary block" style={{ marginTop: 4 }}>Wróć do treningu</span>
        </Link>
      ) : plan && day ? (
        <div className="card stack">
          <div className="hstack">
            <span className="pill accent">Następny trening</span>
            <span className="spacer" />
            <Link to={`/trening/plan/${plan.id}`} className="tiny muted">{plan.name}</Link>
          </div>
          <h2>{day.name}</h2>
          <div className="small muted" style={{ marginTop: -6 }}>
            {day.exercises.slice(0, 5).map((e) => map.get(e.exerciseId)?.pl ?? e.exerciseId).join(' · ')}
            {day.exercises.length > 5 && ` · +${day.exercises.length - 5}`}
          </div>
          <button className="btn primary lg block" onClick={start}>
            <Icon name="play" size={18} /> Rozpocznij trening
          </button>
        </div>
      ) : (
        <Link to="/trening" className="card stack" style={{ gap: 6 }}>
          <div className="hstack"><Icon name="dumbbell" /><h2>Wybierz plan treningowy</h2></div>
          <div className="small muted">Gotowe plany oparte na badaniach albo własny plan. Możesz też zacząć pusty trening.</div>
        </Link>
      )}

      <div className="card stack">
        <div className="hstack">
          <h3>Ten tydzień</h3>
          <span className="spacer" />
          <span className="small muted">{trainedDays.size} {plural(trainedDays.size, 'trening', 'treningi', 'treningów')}</span>
        </div>
        <div className="day-dots">
          {weekDays.map((d, i) => (
            <div key={d}>
              <i className={(trainedDays.has(d) ? 'on' : '') + (d === today ? ' today' : '')}>
                <Icon name="check" size={16} stroke={3} />
              </i>
              {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'][i]}
            </div>
          ))}
        </div>
      </div>

      <Link to="/dieta" className="card stack">
        <div className="hstack">
          <h3>Odżywianie</h3>
          <span className="spacer" />
          <Icon name="chev" className="chev" size={18} />
        </div>
        <div className="hstack" style={{ gap: 18 }}>
          <Ring value={eaten.kcal} max={targets?.kcal ?? 0} size={112} stroke={11}>
            <b>{targets ? Math.max(0, Math.round(targets.kcal - eaten.kcal)) : Math.round(eaten.kcal)}</b>
            <span>{targets ? 'kcal zostało' : 'kcal'}</span>
          </Ring>
          <div className="stack grow" style={{ flex: 1, gap: 8 }}>
            <div className="small muted">
              <b className="num" style={{ color: 'var(--text)', fontSize: 18 }}>{Math.round(eaten.kcal)}</b>
              {targets && ` / ${targets.kcal} kcal`}
            </div>
            <MacroBars eaten={eaten} target={targets} />
          </div>
        </div>
      </Link>

      <div className="card stack">
        <div className="hstack">
          <h3>Masa ciała</h3>
          <span className="spacer" />
          <Link to="/postep" className="small" style={{ color: 'var(--accent)', fontWeight: 600 }}>Wykres</Link>
        </div>
        <div className="grid2">
          <div className="stat">
            <span className="v">{todayWeight ? num(todayWeight) : '–'}<small>kg</small></span>
            <span className="l">dzisiaj</span>
          </div>
          <div className="stat">
            <span className="v">{avg7 ? num(avg7) : '–'}<small>kg</small></span>
            <span className="l">średnia z 7 ost. pomiarów</span>
          </div>
        </div>
        <div className="hstack">
          <NumInput value={weight} onChange={setWeight} placeholder={todayWeight ? 'Popraw dzisiejszą wagę' : 'Waga rano, na czczo (kg)'} />
          <button className="btn primary" disabled={!weight} onClick={saveWeight}>Zapisz</button>
        </div>
        {trend ? (
          <Link to="/postep" className={'note small ' + (trend.verdict.tone === 'good' ? 'good' : trend.verdict.tone === 'warn' ? 'warn' : '')}>
            <b>{trend.verdict.title}.</b> {trend.verdict.text}
          </Link>
        ) : (
          <div className="tiny muted">Waga waha się z dnia na dzień o 0,5–1,5 kg (woda, sól, jelita). Patrz na średnią, nie na pojedynczy pomiar.</div>
        )}
      </div>

      {insight && (
        <Link to="/postep?tab=insights" className="card stack" style={{ gap: 6 }}>
          <div className="hstack"><Icon name="bulb" /><h3 style={{ flex: 1 }}>Wniosek z Twoich danych</h3><Icon name="chev" className="chev" size={18} /></div>
          <div className="small">{insight.text}</div>
        </Link>
      )}

      <EnergyCard compact />

      <DayCard date={today} />
    </div>
  )
}
