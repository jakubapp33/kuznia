import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, updateDay } from '../db/db'
import { num } from '../lib/format'
import { useProfile } from '../lib/hooks'
import { Icon } from './Icon'
import { NumInput } from './ui'

const QUALITY = ['😫', '😕', '😐', '🙂', '😴']
const ENERGY = ['🪫', '😮‍💨', '😐', '💪', '⚡️']

function Scale({ value, icons, onChange, label }: { value?: number; icons: string[]; onChange: (v: number | undefined) => void; label: string }) {
  return (
    <div className="hstack" role="radiogroup" aria-label={label} style={{ gap: 6 }}>
      {icons.map((ic, i) => (
        <button
          key={i}
          role="radio"
          aria-checked={value === i + 1}
          aria-label={`${label}: ${i + 1} z 5`}
          className={'chip' + (value === i + 1 ? ' on' : '')}
          style={{ padding: 0, width: 40, fontSize: 18 }}
          onClick={() => onChange(value === i + 1 ? undefined : i + 1)}
        >{ic}</button>
      ))}
    </div>
  )
}

/** dzienniczek: sen, woda, samopoczucie, notatka – dla wybranego dnia */
export function DayCard({ date }: { date: string }) {
  const day = useLiveQuery(() => db.days.get(date), [date])
  const profile = useProfile()
  const [note, setNote] = useState('')
  useEffect(() => setNote(day?.note ?? ''), [day?.note, date])
  const water = day?.water ?? 0
  const waterGoal = Math.round(((profile?.weight ?? 70) * 35) / 250) * 250

  return (
    <div className="card stack">
      <h3>Dzienniczek</h3>

      <div className="stack" style={{ gap: 8 }}>
        <div className="hstack small"><Icon name="moon" size={18} /><b style={{ flex: 1 }}>Sen ostatniej nocy</b>{day?.sleepH !== undefined && <span className="num">{num(day.sleepH)} h</span>}</div>
        <div className="hstack wrap" style={{ gap: 6 }}>
          {[5, 6, 7, 8, 9].map((h) => (
            <button key={h} className={'chip' + (day?.sleepH === h ? ' on' : '')} onClick={() => updateDay(date, { sleepH: day?.sleepH === h ? undefined : h })}>{h} h</button>
          ))}
          <div style={{ width: 84 }}>
            <NumInput value={day?.sleepH !== undefined && ![5, 6, 7, 8, 9].includes(day.sleepH) ? day.sleepH : undefined} onChange={(v) => updateDay(date, { sleepH: v })} placeholder="inne" ariaLabel="Godziny snu" />
          </div>
        </div>
        <div className="hstack small"><span className="muted" style={{ flex: 1 }}>Jakość snu</span><Scale value={day?.sleepQ} icons={QUALITY} label="Jakość snu" onChange={(v) => updateDay(date, { sleepQ: v })} /></div>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <div className="hstack small"><Icon name="drop" size={18} /><b style={{ flex: 1 }}>Woda</b><span className="num">{num(water / 1000, 2)} / {num(waterGoal / 1000, 1)} l</span></div>
        <div className="bar"><i style={{ width: `${Math.min(100, (water / waterGoal) * 100)}%`, background: 'var(--prot)' }} /></div>
        <div className="hstack">
          <button className="btn sm" onClick={() => updateDay(date, { water: Math.max(0, water - 250) })} aria-label="Odejmij szklankę"><Icon name="minus" size={16} /></button>
          <button className="btn sm" style={{ flex: 1 }} onClick={() => updateDay(date, { water: water + 250 })}>+ szklanka 250 ml</button>
          <button className="btn sm" style={{ flex: 1 }} onClick={() => updateDay(date, { water: water + 500 })}>+ butelka 500 ml</button>
        </div>
      </div>

      <div className="hstack small"><Icon name="bolt" size={18} /><b style={{ flex: 1 }}>Energia / samopoczucie</b></div>
      <Scale value={day?.energy} icons={ENERGY} label="Samopoczucie" onChange={(v) => updateDay(date, { energy: v })} />

      <label className="field">
        <span>Notatka</span>
        <textarea
          className="input"
          style={{ minHeight: 60 }}
          value={note}
          placeholder="np. stres w szkole, ból kolana, dużo chodzenia…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (day?.note ?? '') && updateDay(date, { note: note.trim() || undefined })}
        />
      </label>
    </div>
  )
}
