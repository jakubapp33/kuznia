import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ExercisePicker } from '../components/ExercisePicker'
import { Icon } from '../components/Icon'
import { NumInput, Sheet } from '../components/ui'
import { db } from '../db/db'
import { fmtClock, num } from '../lib/format'
import { useActiveWorkout, useExercises } from '../lib/hooks'
import { exerciseHistory, suggest, type Suggestion } from '../lib/progression'
import { startTimer, stopTimer, unlockAudio } from '../lib/timer'
import { buildExercise, defaultRest } from '../lib/workout'
import type { Exercise, SetEntry, Workout, WorkoutExercise } from '../types'
import { fmtRest } from './TemplateView'

function useElapsed(since: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return (now - since) / 1000
}

function prevText(ex: Exercise | undefined, s: SetEntry | undefined) {
  if (!s) return '–'
  if (ex?.load === 'cardio') return `${num(s.t ?? 0, 0)} min`
  if (ex?.load === 'time') return `${s.w ? num(s.w) + '×' : ''}${s.t ?? 0}s`
  if (ex?.load === 'bodyweight' && !s.w) return `${s.r ?? 0}`
  return `${num(s.w ?? 0)}×${s.r ?? 0}`
}

export function Session() {
  const nav = useNavigate()
  const active = useActiveWorkout()
  const { map } = useExercises()
  const history = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().limit(300).toArray(), [], [])
  const [w, setW] = useState<Workout | null>(null)
  const [picker, setPicker] = useState(false)
  const [menu, setMenu] = useState<number | null>(null)
  const [finishing, setFinishing] = useState(false)
  const loadedId = useRef<number | undefined>(undefined)
  const closed = useRef(false)

  useEffect(() => {
    if (active && loadedId.current !== active.id) {
      loadedId.current = active.id
      setW(active)
    }
  }, [active])

  useEffect(() => {
    if (!w?.id) return
    const t = setTimeout(() => {
      if (!closed.current) void db.workouts.put(w)
    }, 150)
    return () => clearTimeout(t)
  }, [w])

  const elapsed = useElapsed(w?.startedAt ?? Date.now())

  if (active === null) {
    return (
      <div className="page">
        <div className="empty card">
          Brak trwającego treningu.
          <div style={{ marginTop: 12 }}><Link className="btn primary" to="/trening">Przejdź do treningów</Link></div>
        </div>
      </div>
    )
  }
  if (!w) return <div className="page" />

  const update = (fn: (x: Workout) => void) =>
    setW((prev) => {
      const next = structuredClone(prev!)
      fn(next)
      return next
    })

  const past = history.filter((h) => h.id !== w.id)

  function toggleDone(ei: number, si: number, ex: Exercise | undefined, sug: Suggestion | undefined) {
    unlockAudio()
    const we = w!.exercises[ei]
    const s = we.sets[si]
    const willBeDone = !s.done
    update((x) => {
      const set = x.exercises[ei].sets[si]
      set.done = willBeDone
      if (willBeDone) {
        // puste pola uzupełnij wartościami podpowiedzi / poprzedniej serii
        const prev = x.exercises[ei].sets[si - 1]
        if (ex?.load === 'time' || ex?.load === 'cardio') {
          set.t ??= prev?.t ?? sug?.reps ?? we.repMin
        } else {
          if (set.w === undefined && ex?.load === 'weight') set.w = prev?.w ?? sug?.weight
          set.r ??= prev?.r ?? sug?.reps ?? we.repMax
        }
      }
    })
    if (willBeDone && we.restSec > 0 && !s.warmup) startTimer(we.restSec)
    if (willBeDone && s.warmup) startTimer(60)
  }

  async function addExercise(ex: Exercise) {
    const rest = await defaultRest(ex)
    const isTime = ex.load === 'time'
    const built = await buildExercise(
      { exerciseId: ex.id, sets: ex.load === 'cardio' ? 1 : 3, repMin: isTime ? 30 : ex.compound ? 6 : 10, repMax: isTime ? 60 : ex.compound ? 10 : 15, rir: 2, restSec: rest },
      past,
    )
    update((x) => { x.exercises.push(built) })
    setPicker(false)
  }

  async function finish() {
    closed.current = true
    const cleaned: Workout = {
      ...w!,
      finishedAt: Date.now(),
      exercises: w!.exercises
        .map((we) => ({ ...we, sets: we.sets.filter((s) => s.done) }))
        .filter((we) => we.sets.length > 0),
    }
    stopTimer()
    if (!cleaned.exercises.length) {
      await db.workouts.delete(w!.id!)
      nav('/trening')
      return
    }
    await db.workouts.put(cleaned)
    nav(`/trening/historia/${w!.id}?nowy=1`, { replace: true })
  }

  async function discard() {
    if (!confirm('Odrzucić ten trening? Zapisane serie zostaną usunięte.')) return
    closed.current = true
    stopTimer()
    await db.workouts.delete(w!.id!)
    nav('/trening')
  }

  const doneSets = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done && !s.warmup).length, 0)

  return (
    <div className="page">
      <header className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="input"
            style={{ background: 'transparent', border: 0, padding: 0, minHeight: 0, fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}
            value={w.name}
            onChange={(e) => update((x) => { x.name = e.target.value })}
            aria-label="Nazwa treningu"
          />
          <div className="small muted num">
            <Icon name="timer" size={14} /> {fmtClock(elapsed)} · {doneSets} serii
          </div>
        </div>
        <button className="btn primary" onClick={() => setFinishing(true)}>Zakończ</button>
      </header>

      {w.exercises.map((we, ei) => (
        <ExerciseCard
          key={ei + we.exerciseId}
          we={we}
          ex={map.get(we.exerciseId)}
          past={past}
          onMenu={() => setMenu(ei)}
          onChange={(fn) => update((x) => fn(x.exercises[ei]))}
          onToggle={(si, sug) => toggleDone(ei, si, map.get(we.exerciseId), sug)}
        />
      ))}

      {w.exercises.length === 0 && (
        <div className="card empty">Dodaj pierwsze ćwiczenie, aby zacząć zapisywać serie.</div>
      )}

      <button className="btn block lg" onClick={() => setPicker(true)}>
        <Icon name="plus" /> Dodaj ćwiczenie
      </button>
      <button className="btn danger block" onClick={discard}>Odrzuć trening</button>

      {picker && <ExercisePicker onClose={() => setPicker(false)} onPick={addExercise} />}

      {menu !== null && w.exercises[menu] && (
        <Sheet title={map.get(w.exercises[menu].exerciseId)?.pl ?? 'Ćwiczenie'} onClose={() => setMenu(null)}>
          <div className="field">
            <span>Przerwa po serii</span>
            <div className="chips" style={{ margin: 0, padding: 0, flexWrap: 'wrap' }}>
              {[0, 45, 60, 90, 120, 150, 180, 240].map((r) => (
                <button key={r} className={'chip' + (w.exercises[menu].restSec === r ? ' on' : '')} onClick={() => update((x) => { x.exercises[menu].restSec = r })}>
                  {r === 0 ? 'bez' : fmtRest(r)}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Notatka</span>
            <textarea className="input" value={w.exercises[menu].note ?? ''} placeholder="np. ustawienie siedziska 4, chwyt szeroki" onChange={(e) => update((x) => { x.exercises[menu].note = e.target.value })} />
          </label>
          <div className="card flush list">
            <Link className="row" to={`/cwiczenia/${w.exercises[menu].exerciseId}`}><Icon name="info" /><span className="grow">Technika i historia</span></Link>
            <button className="row" disabled={menu === 0} onClick={() => { update((x) => { const a = x.exercises; [a[menu - 1], a[menu]] = [a[menu], a[menu - 1]] }); setMenu(menu - 1) }}><Icon name="up" /><span className="grow">Przesuń wyżej</span></button>
            <button className="row" disabled={menu === w.exercises.length - 1} onClick={() => { update((x) => { const a = x.exercises; [a[menu + 1], a[menu]] = [a[menu], a[menu + 1]] }); setMenu(menu + 1) }}><Icon name="down" /><span className="grow">Przesuń niżej</span></button>
            <button className="row" style={{ color: 'var(--bad)' }} onClick={() => { update((x) => { x.exercises.splice(menu, 1) }); setMenu(null) }}><Icon name="trash" /><span className="grow">Usuń ćwiczenie z treningu</span></button>
          </div>
        </Sheet>
      )}

      {finishing && (
        <Sheet title="Zakończyć trening?" onClose={() => setFinishing(false)}>
          <div className="grid2">
            <div className="stat"><span className="v">{Math.round(elapsed / 60)}<small>min</small></span><span className="l">czas</span></div>
            <div className="stat"><span className="v">{doneSets}</span><span className="l">serii roboczych</span></div>
          </div>
          <div className="field">
            <span>Jak poszło?</span>
            <div className="hstack" style={{ gap: 6 }}>
              {['😫', '😕', '😐', '🙂', '🔥'].map((ic, i) => (
                <button key={i} aria-label={`Ocena ${i + 1} z 5`} className={'chip' + (w.rating === i + 1 ? ' on' : '')} style={{ flex: 1, fontSize: 20, padding: 0 }} onClick={() => update((x) => { x.rating = x.rating === i + 1 ? undefined : i + 1 })}>{ic}</button>
              ))}
            </div>
          </div>
          {w.exercises.some((e) => e.sets.some((s) => !s.done)) && (
            <div className="note warn small">Niezaznaczone serie (bez ✓) nie zostaną zapisane.</div>
          )}
          <button className="btn primary lg block" onClick={finish}><Icon name="check" /> Zapisz trening</button>
          <button className="btn block" onClick={() => setFinishing(false)}>Wróć do treningu</button>
        </Sheet>
      )}
    </div>
  )
}

function ExerciseCard({
  we, ex, past, onMenu, onChange, onToggle,
}: {
  we: WorkoutExercise
  ex: Exercise | undefined
  past: Workout[]
  onMenu: () => void
  onChange: (fn: (we: WorkoutExercise) => void) => void
  onToggle: (si: number, sug: Suggestion | undefined) => void
}) {
  const hist = exerciseHistory(past, we.exerciseId)
  const prevSets = hist[0]?.we.sets.filter((s) => !s.warmup) ?? []
  const sug = ex && we.repMin && we.repMax ? suggest(ex, we.repMin, we.repMax, hist.map((h) => h.we)) : undefined
  const load = ex?.load ?? 'weight'
  let workIdx = 0

  const cols =
    load === 'cardio' ? ['min', 'km'] : load === 'time' ? ['kg', 'sek.'] : load === 'bodyweight' ? ['+kg', 'powt.'] : ['kg', 'powt.']

  return (
    <div className="card flush ex-card">
      <div className="ex-head">
        <Link to={`/cwiczenia/${we.exerciseId}`} style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ color: 'var(--accent)' }}>{ex?.pl ?? we.exerciseId}</h3>
          <div className="tiny muted">
            {ex?.en}
            {we.repMin !== undefined && load !== 'cardio' && ` · cel ${we.repMin}–${we.repMax}${load === 'time' ? ' s' : ''}`}
            {we.rir !== undefined && load !== 'cardio' && ` · zapas ${we.rir}`}
            {we.restSec > 0 && ` · przerwa ${fmtRest(we.restSec)}`}
          </div>
        </Link>
        <button className="icon-btn" aria-label="Opcje ćwiczenia" onClick={onMenu}><Icon name="more" /></button>
      </div>
      {we.note && <div className="tiny muted" style={{ padding: '4px 16px 0' }}><Icon name="note" size={12} /> {we.note}</div>}
      {sug && (
        <div className={'suggest ' + sug.kind}>
          <Icon name={sug.kind === 'increase' ? 'up' : sug.kind === 'decrease' ? 'down' : 'target'} size={16} />
          <span>{sug.text}</span>
        </div>
      )}
      <div style={{ padding: '0 8px' }}>
        <table className="sets">
          <thead>
            <tr>
              <th>Seria</th>
              <th>Poprz.</th>
              <th>{cols[0]}</th>
              <th>{cols[1]}</th>
              <th style={{ width: 46 }}><Icon name="check" size={14} /></th>
            </tr>
          </thead>
          <tbody>
            {we.sets.map((s, si) => {
              const label = s.warmup ? 'R' : String(++workIdx)
              const prev = s.warmup ? undefined : prevSets[workIdx - 1]
              return (
                <tr key={si} className={s.done ? 'done' : ''}>
                  <td>
                    <button
                      className={'idx' + (s.warmup ? ' warm' : '')}
                      title="Dotknij, by oznaczyć jako rozgrzewkę"
                      onClick={() => onChange((x) => { x.sets[si].warmup = !x.sets[si].warmup })}
                    >{label}</button>
                  </td>
                  <td className="prev">{prevText(ex, prev)}</td>
                  {load === 'cardio' ? (
                    <>
                      <td><NumInput className="" value={s.t} placeholder={prev?.t ? String(prev.t) : '0'} onChange={(v) => onChange((x) => { x.sets[si].t = v })} ariaLabel="Minuty" /></td>
                      <td><NumInput className="" value={s.d} placeholder={prev?.d ? num(prev.d) : '0'} onChange={(v) => onChange((x) => { x.sets[si].d = v })} ariaLabel="Kilometry" /></td>
                    </>
                  ) : (
                    <>
                      <td>
                        <NumInput
                          className="" value={s.w}
                          placeholder={load === 'weight' ? (sug?.weight ? num(sug.weight) : prev?.w ? num(prev.w) : 'kg') : '0'}
                          onChange={(v) => onChange((x) => { x.sets[si].w = v })} ariaLabel="Ciężar w kg"
                        />
                      </td>
                      <td>
                        {load === 'time' ? (
                          <NumInput className="" decimal={false} value={s.t} placeholder={String(sug?.reps ?? we.repMin ?? '')} onChange={(v) => onChange((x) => { x.sets[si].t = v })} ariaLabel="Sekundy" />
                        ) : (
                          <NumInput className="" decimal={false} value={s.r} placeholder={String(sug?.reps ?? we.repMax ?? '')} onChange={(v) => onChange((x) => { x.sets[si].r = v })} ariaLabel="Powtórzenia" />
                        )}
                      </td>
                    </>
                  )}
                  <td>
                    <button className={'check' + (s.done ? ' on' : '')} aria-label={s.done ? 'Odznacz serię' : 'Zalicz serię'} onClick={() => onToggle(si, sug)}>
                      <Icon name="check" size={20} stroke={3} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="hstack" style={{ padding: '4px 8px 6px' }}>
        <button
          className="btn ghost sm"
          onClick={() => onChange((x) => {
            const last = x.sets[x.sets.length - 1]
            x.sets.push({ done: false, w: last?.w, warmup: false })
          })}
        ><Icon name="plus" size={16} /> Seria</button>
        <button
          className="btn ghost sm"
          onClick={() => onChange((x) => { x.sets.unshift({ done: false, warmup: true, w: x.sets[0]?.w ? Math.round((x.sets[0].w * 0.5) / 2.5) * 2.5 : undefined }) })}
        ><Icon name="flame" size={16} /> Rozgrzewka</button>
        <span className="spacer" />
        {we.sets.length > 0 && (
          <button className="btn ghost sm" style={{ color: 'var(--text-3)' }} onClick={() => onChange((x) => { x.sets.pop() })}>
            <Icon name="minus" size={16} /> Usuń
          </button>
        )}
      </div>
    </div>
  )
}
