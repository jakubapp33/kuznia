import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Field, NumInput, Seg, TopBar } from '../components/ui'
import { MUSCLES } from '../data/muscles'
import { db } from '../db/db'
import { useExercises } from '../lib/hooks'
import { newId } from '../lib/workout'
import type { Equipment, Exercise, LoadType, MuscleId } from '../types'

const EQUIPMENT: Equipment[] = ['sztanga', 'hantle', 'maszyna', 'wyciąg', 'masa ciała', 'kettlebell', 'inne', 'cardio']

function MusclePick({ value, onChange, exclude }: { value: MuscleId[]; onChange: (v: MuscleId[]) => void; exclude: MuscleId[] }) {
  return (
    <div className="hstack wrap" style={{ gap: 6 }}>
      {(Object.keys(MUSCLES) as MuscleId[]).filter((m) => !exclude.includes(m)).map((m) => (
        <button
          key={m} type="button"
          className={'chip' + (value.includes(m) ? ' on' : '')}
          onClick={() => onChange(value.includes(m) ? value.filter((x) => x !== m) : [...value, m])}
        >{MUSCLES[m]}</button>
      ))}
    </div>
  )
}

export function ExerciseForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const { map } = useExercises()
  const existing = id ? map.get(id) : undefined
  const [ex, setEx] = useState<Exercise>({
    id: 'my-' + newId(), pl: '', en: '', compound: true, equipment: 'hantle', load: 'weight',
    primary: [], secondary: [], steps: [], tips: [], inc: 2.5, custom: true,
  })
  useEffect(() => {
    if (existing?.custom) setEx(existing)
  }, [existing])

  const set = (patch: Partial<Exercise>) => setEx((e) => ({ ...e, ...patch }))

  async function save() {
    if (!ex.pl.trim() || !ex.primary.length) return
    await db.customExercises.put({ ...ex, pl: ex.pl.trim(), en: ex.en.trim(), steps: ex.steps.filter(Boolean), tips: ex.tips.filter(Boolean) })
    nav(`/cwiczenia/${ex.id}`, { replace: true })
  }

  return (
    <div className="page">
      <TopBar title={existing ? 'Edytuj ćwiczenie' : 'Własne ćwiczenie'} />
      <div className="card stack">
        <Field label="Nazwa po polsku *"><input className="input" value={ex.pl} onChange={(e) => set({ pl: e.target.value })} /></Field>
        <Field label="Nazwa po angielsku"><input className="input" value={ex.en} onChange={(e) => set({ en: e.target.value })} /></Field>
        <Field label="Sprzęt">
          <select className="input" value={ex.equipment} onChange={(e) => set({ equipment: e.target.value as Equipment })}>
            {EQUIPMENT.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Jak zapisywać serie">
          <Seg<LoadType>
            value={ex.load}
            onChange={(load) => set({ load })}
            options={[
              { value: 'weight', label: 'kg × powt.' },
              { value: 'bodyweight', label: 'powt.' },
              { value: 'time', label: 'czas' },
              { value: 'cardio', label: 'cardio' },
            ]}
          />
        </Field>
        <Field label="Rodzaj">
          <Seg<string> value={ex.compound ? 'c' : 'i'} onChange={(v) => set({ compound: v === 'c' })} options={[{ value: 'c', label: 'Wielostawowe' }, { value: 'i', label: 'Izolowane' }]} />
        </Field>
        {ex.load === 'weight' && (
          <Field label="Krok zwiększania ciężaru (kg)"><NumInput value={ex.inc} onChange={(v) => set({ inc: v ?? 2.5 })} /></Field>
        )}
      </div>
      <div className="card stack">
        <Field label="Mięśnie główne *"><MusclePick value={ex.primary} onChange={(primary) => set({ primary })} exclude={ex.secondary} /></Field>
        <Field label="Mięśnie pomocnicze"><MusclePick value={ex.secondary} onChange={(secondary) => set({ secondary })} exclude={ex.primary} /></Field>
      </div>
      <div className="card stack">
        <Field label="Technika (każdy krok w nowej linii)">
          <textarea className="input" value={ex.steps.join('\n')} onChange={(e) => set({ steps: e.target.value.split('\n') })} />
        </Field>
        <Field label="Wskazówki (każda w nowej linii)">
          <textarea className="input" value={ex.tips.join('\n')} onChange={(e) => set({ tips: e.target.value.split('\n') })} />
        </Field>
      </div>
      <button className="btn primary lg block" disabled={!ex.pl.trim() || !ex.primary.length} onClick={save}>Zapisz</button>
    </div>
  )
}
