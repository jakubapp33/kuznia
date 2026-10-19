import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { db } from '../db/db'
import { addDays, fmtDate, isoDate, num } from '../lib/format'
import { useExercises, useTargets } from '../lib/hooks'
import { MIN_WORKOUTS, analyze, coverage, workoutScores } from '../lib/insights'

export function InsightsTab() {
  const { map } = useExercises()
  const targets = useTargets()
  const today = isoDate()
  const data = useLiveQuery(async () => {
    const workouts = await db.workouts.toArray()
    const food = await db.foodLog.toArray()
    const days = await db.days.toArray()
    return { workouts, food, days }
  }, [], undefined)
  if (!data) return null

  const res = analyze(data.workouts, data.food, data.days, map)
  const cov = coverage(res.samples)
  const scores = workoutScores(data.workouts, map)
  const recent = data.workouts.filter((w) => w.finishedAt && scores.has(w.id!)).sort((a, b) => b.startedAt - a.startedAt).slice(0, 5)

  // podsumowanie ostatnich 14 dni
  const from = addDays(today, -14)
  const days14 = data.days.filter((d) => d.date > from && d.date <= today)
  const sleep = days14.filter((d) => d.sleepH).map((d) => d.sleepH!)
  const water = days14.filter((d) => d.water).map((d) => d.water!)
  const steps = days14.filter((d) => d.steps).map((d) => d.steps!)
  const byDay = new Map<string, { kcal: number; p: number }>()
  for (const f of data.food) {
    if (f.date <= from || f.date > today) continue
    const x = byDay.get(f.date) ?? { kcal: 0, p: 0 }
    byDay.set(f.date, { kcal: x.kcal + f.kcal, p: x.p + f.p })
  }
  const foodDays = [...byDay.values()].filter((d) => d.kcal > 600)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined)
  const proteinHit = targets ? foodDays.filter((d) => d.p >= targets.p * 0.9).length : undefined
  const workouts14 = data.workouts.filter((w) => w.finishedAt && w.date > from).length

  return (
    <>
      {res.scored < MIN_WORKOUTS ? (
        <div className="card stack">
          <div className="hstack"><Icon name="bulb" /><h3>Zbieram dane do wniosków</h3></div>
          <div className="small muted">
            Porównuję każdy trening z Twoją normą z poprzednich sesji tych samych ćwiczeń i szukam, co (sen, jedzenie, kroki, pora dnia…) sprzyja lepszym wynikom. Potrzebuję min. {MIN_WORKOUTS} takich treningów
            (ćwiczenie musi być wcześniej zrobione co najmniej 2 razy).
          </div>
          <div className="bar"><i style={{ width: `${(res.scored / MIN_WORKOUTS) * 100}%` }} /></div>
          <div className="small num">{res.scored} / {MIN_WORKOUTS}</div>
          <div className="note small">
            Żeby wnioski były trafne, zapisuj w <b>Dzienniczku</b> (zakładka Dziś lub Dieta) sen, wodę i samopoczucie, a w Diecie – <b>godziny posiłków</b>.
          </div>
        </div>
      ) : res.insights.length === 0 ? (
        <div className="card stack">
          <div className="hstack"><Icon name="bulb" /><h3>Na razie brak wyraźnych zależności</h3></div>
          <div className="small muted">Na podstawie {res.scored} treningów żaden czynnik (sen, jedzenie przed treningiem, pora dnia, woda, przerwy) nie wpływa wyraźnie na Twoje wyniki. Zbieraj dalej dane – sprawdzam po każdym treningu.</div>
        </div>
      ) : (
        <>
          <div className="section-title">Co Ci służy</div>
          {res.insights.map((i) => (
            <div key={i.id} className="card stack" style={{ gap: 6 }}>
              <div className="hstack">
                <Icon name={i.better ? 'up' : 'down'} className="chev" />
                <span className={'pill ' + (i.strength === 'wyraźna' ? 'good' : '')}>{i.strength === 'wyraźna' ? 'wyraźna zależność' : 'możliwa zależność'}</span>
              </div>
              <div>{i.text}</div>
              <div className="tiny muted">Na podstawie {i.nA} treningów w tej sytuacji vs {i.nB} pozostałych.</div>
            </div>
          ))}
          <div className="tiny muted">To zależności z Twoich danych, a nie dowód przyczyny – np. lepsze wyniki rano mogą wynikać z tego, że rano jesteś bardziej wypoczęty. Im więcej treningów, tym pewniejsze wnioski.</div>
        </>
      )}

      {res.samples.length > 0 && (
        <div className="card small stack" style={{ gap: 4 }}>
          <b>Ile treningów ma dane:</b>
          <span className="muted">sen {cov.sleep} · jedzenie z godzinami {cov.food} · woda {cov.water} · samopoczucie {cov.energy} (z {res.samples.length})</span>
        </div>
      )}

      {recent.length > 0 && (
        <>
          <div className="section-title">Forma na ostatnich treningach</div>
          <div className="card flush list">
            {recent.map((w) => {
              const s = scores.get(w.id!)!
              return (
                <Link key={w.id} to={`/trening/historia/${w.id}`} className="row">
                  <div className="grow">
                    <div className="title small">{w.name}</div>
                    <div className="meta">{fmtDate(w.date)} · {new Date(w.startedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <span className={'pill ' + (s >= 1 ? 'good' : s <= -1 ? 'warn' : '')}>{s > 0 ? '+' : ''}{num(s)}%</span>
                </Link>
              )
            })}
          </div>
          <div className="tiny muted">% = wynik najlepszej serii względem mediany z Twoich poprzednich sesji tych samych ćwiczeń.</div>
        </>
      )}

      <div className="section-title">Ostatnie 14 dni</div>
      <div className="card grid2">
        <div className="stat"><span className="v">{workouts14}</span><span className="l">treningów</span></div>
        <div className="stat"><span className="v">{avg(sleep) !== undefined ? num(avg(sleep)) : '–'}<small>h</small></span><span className="l">średni sen ({sleep.length} nocy)</span></div>
        <div className="stat"><span className="v">{avg(water) !== undefined ? num(avg(water)! / 1000) : '–'}<small>l</small></span><span className="l">średnio wody</span></div>
        <div className="stat">
          <span className="v">{avg(foodDays.map((d) => d.kcal)) !== undefined ? Math.round(avg(foodDays.map((d) => d.kcal))!) : '–'}<small>kcal</small></span>
          <span className="l">średnio dziennie{targets ? ` (cel ${targets.kcal})` : ''}</span>
        </div>
        {steps.length > 0 && (
          <div className="stat"><span className="v">{Math.round(avg(steps)!).toLocaleString('pl-PL')}</span><span className="l">średnio kroków ({steps.length} dni)</span></div>
        )}
        {proteinHit !== undefined && foodDays.length > 0 && (
          <div className="stat"><span className="v">{proteinHit}/{foodDays.length}</span><span className="l">dni z celem białka</span></div>
        )}
      </div>
      {avg(sleep) !== undefined && avg(sleep)! < 7 && (
        <div className="note warn small">Śpisz średnio poniżej 7 h. Krótki sen pogarsza regenerację, siłę i apetyt – to jedna z najłatwiejszych rzeczy do poprawy.</div>
      )}
    </>
  )
}
