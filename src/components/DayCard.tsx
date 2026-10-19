import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, updateDay } from '../db/db'
import { burnedOf } from '../lib/energy'
import { isoDate, num } from '../lib/format'
import { useProfile } from '../lib/hooks'
import { Icon } from './Icon'
import { NumInput } from './ui'

const QUALITY = ['😫', '😕', '😐', '🙂', '😴']
const ENERGY = ['🪫', '😮‍💨', '😐', '💪', '⚡️']
const ACTIVITIES = ['Spacer', 'Bieganie', 'Rower', 'Siłownia', 'Piłka', 'Pływanie', 'WF']

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
  const eaten = useLiveQuery(async () => (await db.foodLog.where('date').equals(date).toArray()).reduce((s, f) => s + f.kcal, 0), [date], 0)
  const [note, setNote] = useState('')
  const [activity, setActivity] = useState('')
  useEffect(() => setNote(day?.note ?? ''), [day?.note, date])
  useEffect(() => setActivity(day?.activity ?? ''), [day?.activity, date])
  const burned = burnedOf(day, profile ?? undefined)
  const balance = burned && eaten > 0 ? eaten - burned.kcal : undefined
  const tags = activity.split(',').map((x) => x.trim()).filter(Boolean)
  function toggleActivity(a: string) {
    const next = tags.includes(a) ? tags.filter((x) => x !== a) : [...tags, a]
    const v = next.join(', ')
    setActivity(v)
    updateDay(date, { activity: v || undefined })
  }
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

      <div className="stack" style={{ gap: 8 }}>
        <div className="hstack small"><Icon name="walk" size={18} /><b style={{ flex: 1 }}>Aktywność</b>{burned && <span className="num">{Math.round(burned.kcal)} kcal spalone</span>}</div>
        <div className="grid3">
          <label className="field"><span>Kroki</span><NumInput value={day?.steps} decimal={false} onChange={(v) => updateDay(date, { steps: v })} placeholder="0" ariaLabel="Kroki" /></label>
          <label className="field"><span>Kcal spocz.</span><NumInput value={day?.kcalRest} decimal={false} onChange={(v) => updateDay(date, { kcalRest: v })} placeholder="np. 1700" ariaLabel="Kalorie spoczynkowe" /></label>
          <label className="field"><span>Kcal aktywne</span><NumInput value={day?.kcalActive} decimal={false} onChange={(v) => updateDay(date, { kcalActive: v })} placeholder="np. 500" ariaLabel="Kalorie aktywne" /></label>
        </div>
        <div className="chips" style={{ flexWrap: 'wrap' }}>
          {ACTIVITIES.map((a) => (
            <button key={a} className={'chip' + (tags.includes(a) ? ' on' : '')} onClick={() => toggleActivity(a)}>{a}</button>
          ))}
        </div>
        <input
          className="input"
          value={activity}
          placeholder="Jaka aktywność? np. bieganie 30 min"
          aria-label="Aktywność"
          onChange={(e) => setActivity(e.target.value)}
          onBlur={() => activity !== (day?.activity ?? '') && updateDay(date, { activity: activity.trim() || undefined })}
        />
        {burned?.est && <div className="tiny muted">Bez kcal spoczynkowych liczę je ze wzoru (ok. {Math.round(burned.kcal - (day?.kcalActive ?? 0))} kcal).</div>}
        {balance !== undefined && (
          <div className={'note small ' + (balance < -100 ? 'good' : '')}>
            Bilans dnia{date === isoDate() ? ' (na razie)' : ''}: zjedzone {Math.round(eaten)} − spalone {Math.round(burned!.kcal)} = <b className="num">{balance > 0 ? '+' : '−'}{Math.abs(Math.round(balance))} kcal</b> ({Math.abs(balance) < 100 ? 'na zero' : balance < 0 ? 'deficyt' : 'nadwyżka'})
          </div>
        )}
        <div className="tiny muted">Przepisz z Garmin Connect: Kroki, Kalorie → Spoczynkowe i Aktywne. Najlepiej wieczorem lub następnego dnia za cały dzień.</div>
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
