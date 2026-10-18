import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ExercisePicker } from '../components/ExercisePicker'
import { Icon } from '../components/Icon'
import { Field, NumInput, TopBar } from '../components/ui'
import { db, setSetting } from '../db/db'
import { useExercises, useSetting } from '../lib/hooks'
import { defaultRest, newId } from '../lib/workout'
import type { Plan, PlanExercise } from '../types'

const RESTS = [45, 60, 75, 90, 120, 150, 180, 240]

export function PlanEdit() {
  const { id } = useParams()
  const nav = useNavigate()
  const planId = Number(id)
  const stored = useLiveQuery(() => db.plans.get(planId), [planId])
  const activePlanId = useSetting<number>('activePlanId')
  const { map } = useExercises()
  const [plan, setPlan] = useState<Plan | undefined>()
  const [picker, setPicker] = useState<string | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (stored && !loaded.current) {
      loaded.current = true
      setPlan(stored)
    }
  }, [stored])

  // zapis automatyczny
  useEffect(() => {
    if (!plan || !loaded.current) return
    const t = setTimeout(() => void db.plans.put(plan), 300)
    return () => clearTimeout(t)
  }, [plan])

  if (!plan) return <div className="page"><TopBar title="Plan" back="/trening" /></div>

  const update = (fn: (p: Plan) => void) => {
    setPlan((prev) => {
      const next = structuredClone(prev!)
      fn(next)
      return next
    })
  }

  function setEx(dayIdx: number, exIdx: number, patch: Partial<PlanExercise>) {
    update((p) => Object.assign(p.days[dayIdx].exercises[exIdx], patch))
  }

  function move<T>(arr: T[], i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  async function remove() {
    if (!confirm(`Usunąć plan „${plan!.name}”? Historia treningów zostanie.`)) return
    await db.plans.delete(planId)
    if (activePlanId === planId) await setSetting('activePlanId', null)
    nav('/trening')
  }

  async function duplicate() {
    const { id: _omit, ...rest } = plan!
    void _omit
    const nid = await db.plans.add({ ...structuredClone(rest), name: plan!.name + ' (kopia)', createdAt: Date.now() })
    loaded.current = false
    nav(`/trening/plan/${nid}`, { replace: true })
  }

  return (
    <div className="page">
      <TopBar title="Edycja planu" back="/trening" />

      <div className="card stack">
        <Field label="Nazwa planu">
          <input className="input" value={plan.name} onChange={(e) => update((p) => { p.name = e.target.value })} />
        </Field>
        <Field label="Opis (opcjonalnie)">
          <input className="input" value={plan.description ?? ''} onChange={(e) => update((p) => { p.description = e.target.value })} />
        </Field>
        {activePlanId === planId ? (
          <div className="pill good" style={{ alignSelf: 'flex-start' }}><Icon name="check" size={14} /> Aktywny plan</div>
        ) : (
          <button className="btn" onClick={() => setSetting('activePlanId', planId)}>Ustaw jako aktywny</button>
        )}
      </div>

      {plan.days.map((day, di) => (
        <div key={day.id} className="card flush">
          <div className="hstack" style={{ padding: '10px 8px 6px 16px' }}>
            <input
              className="input"
              style={{ fontWeight: 700, fontSize: 17 }}
              value={day.name}
              onChange={(e) => update((p) => { p.days[di].name = e.target.value })}
              aria-label="Nazwa dnia"
            />
            <button className="icon-btn" aria-label="W górę" disabled={di === 0} onClick={() => update((p) => move(p.days, di, -1))}><Icon name="up" size={18} /></button>
            <button className="icon-btn" aria-label="W dół" disabled={di === plan.days.length - 1} onClick={() => update((p) => move(p.days, di, 1))}><Icon name="down" size={18} /></button>
            <button
              className="icon-btn" aria-label="Usuń dzień" style={{ color: 'var(--bad)' }}
              onClick={() => confirm(`Usunąć „${day.name}”?`) && update((p) => { p.days.splice(di, 1) })}
            ><Icon name="trash" size={18} /></button>
          </div>
          <div className="list">
            {day.exercises.map((pe, ei) => {
              const ex = map.get(pe.exerciseId)
              const timeUnit = ex?.load === 'time'
              return (
                <div key={ei} style={{ padding: '10px 8px 12px 16px' }} className="stack">
                  <div className="hstack">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 650 }}>{ex?.pl ?? pe.exerciseId}</div>
                      <div className="tiny muted">{ex?.en}</div>
                    </div>
                    <button className="icon-btn" aria-label="W górę" disabled={ei === 0} onClick={() => update((p) => move(p.days[di].exercises, ei, -1))}><Icon name="up" size={18} /></button>
                    <button className="icon-btn" aria-label="W dół" disabled={ei === day.exercises.length - 1} onClick={() => update((p) => move(p.days[di].exercises, ei, 1))}><Icon name="down" size={18} /></button>
                    <button className="icon-btn" aria-label="Usuń" style={{ color: 'var(--bad)' }} onClick={() => update((p) => { p.days[di].exercises.splice(ei, 1) })}><Icon name="x" size={18} /></button>
                  </div>
                  {ex?.load !== 'cardio' && (
                    <div className="grid3" style={{ gridTemplateColumns: '0.8fr 1.4fr 0.8fr 1.2fr', alignItems: 'end', paddingRight: 8 }}>
                      <Field label="Serie">
                        <NumInput decimal={false} value={pe.sets} onChange={(v) => setEx(di, ei, { sets: Math.max(1, Math.min(10, v ?? 1)) })} />
                      </Field>
                      <Field label={timeUnit ? 'Sekundy' : 'Powtórzenia'}>
                        <div className="hstack" style={{ gap: 4 }}>
                          <NumInput decimal={false} value={pe.repMin} onChange={(v) => setEx(di, ei, { repMin: v ?? 1 })} />
                          –
                          <NumInput decimal={false} value={pe.repMax} onChange={(v) => setEx(di, ei, { repMax: v ?? pe.repMin })} />
                        </div>
                      </Field>
                      <Field label="RIR">
                        <NumInput decimal={false} value={pe.rir} onChange={(v) => setEx(di, ei, { rir: Math.min(5, v ?? 0) })} />
                      </Field>
                      <Field label="Przerwa">
                        <select className="input" value={pe.restSec} onChange={(e) => setEx(di, ei, { restSec: Number(e.target.value) })}>
                          {[...new Set([...RESTS, pe.restSec])].sort((a, b) => a - b).map((r) => (
                            <option key={r} value={r}>{r < 60 ? `${r} s` : `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button className="btn ghost block" style={{ margin: '4px 0 8px' }} onClick={() => setPicker(day.id)}>
            <Icon name="plus" size={18} /> Dodaj ćwiczenie
          </button>
        </div>
      ))}

      <button className="btn block" onClick={() => update((p) => { p.days.push({ id: newId(), name: `Dzień ${p.days.length + 1}`, exercises: [] }) })}>
        <Icon name="plus" /> Dodaj dzień treningowy
      </button>

      <div className="note small">
        <b>Wskazówki z badań:</b> 10–20 serii tygodniowo na partię mięśniową, każda partia ok. 2× w tygodniu, większość serii w zakresie 6–15 powtórzeń z zapasem 0–3 powtórzeń. Przerwy: 2–3 min przy ćwiczeniach wielostawowych, 1–2 min przy izolowanych.
      </div>

      <div className="hstack">
        <button className="btn grow" style={{ flex: 1 }} onClick={duplicate}><Icon name="copy" size={18} /> Duplikuj</button>
        <button className="btn danger grow" style={{ flex: 1 }} onClick={remove}><Icon name="trash" size={18} /> Usuń plan</button>
      </div>

      {picker && (
        <ExercisePicker
          onClose={() => setPicker(null)}
          onPick={async (ex) => {
            const rest = await defaultRest(ex)
            const isTime = ex.load === 'time'
            update((p) => {
              const d = p.days.find((x) => x.id === picker)!
              d.exercises.push({
                exerciseId: ex.id,
                sets: ex.load === 'cardio' ? 1 : 3,
                repMin: isTime ? 30 : ex.compound ? 6 : 10,
                repMax: isTime ? 60 : ex.compound ? 10 : 15,
                rir: ex.compound ? 2 : 1,
                restSec: rest,
              })
            })
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}
