import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DayCard } from '../components/DayCard'
import { Icon } from '../components/Icon'
import { Nutrients } from '../components/Nutrients'
import { MacroBars, MacroTiles, NumInput, PageHead, Ring, Sheet } from '../components/ui'
import { db } from '../db/db'
import { rescaleEntry, totals } from '../lib/foodcalc'
import { addDays, fmtDate, isoDate, num } from '../lib/format'
import { useTargets } from '../lib/hooks'
import type { FoodLogEntry } from '../types'

export const MEALS = ['Śniadanie', 'II śniadanie', 'Obiad', 'Kolacja', 'Przekąski']

export function Diet() {
  const [params, setParams] = useSearchParams()
  const date = params.get('d') ?? isoDate()
  const setDate = (d: string) => setParams(d === isoDate() ? {} : { d }, { replace: true })
  const targets = useTargets()
  const log = useLiveQuery(() => db.foodLog.where('date').equals(date).toArray(), [date], [])
  const [edit, setEdit] = useState<FoodLogEntry | null>(null)
  const [details, setDetails] = useState(false)
  const total = totals(log)
  const left = targets ? targets.kcal - total.kcal : 0

  async function copyYesterday(meal: number) {
    const prev = await db.foodLog.where('date').equals(addDays(date, -1)).filter((f) => f.meal === meal).toArray()
    if (!prev.length) return alert('Wczoraj nic nie było zapisane w tym posiłku.')
    await db.foodLog.bulkAdd(prev.map(({ id: _id, ...f }) => ({ ...f, date })))
  }

  return (
    <div className="page">
      <PageHead
        title="Dieta"
        right={<Link to="/dieta/cele" className="icon-btn filled" aria-label="Cele i kalkulator"><Icon name="target" /></Link>}
      />
      <div className="hstack">
        <button className="icon-btn filled" aria-label="Poprzedni dzień" onClick={() => setDate(addDays(date, -1))}><Icon name="back" /></button>
        <div className="spacer" style={{ textAlign: 'center', fontWeight: 700 }}>{fmtDate(date, date !== isoDate())}</div>
        <button className="icon-btn filled" aria-label="Następny dzień" onClick={() => setDate(addDays(date, 1))}><Icon name="chev" /></button>
      </div>

      <div className="card stack">
        <div className="hstack" style={{ gap: 18 }}>
          <Ring value={total.kcal} max={targets?.kcal ?? 0} size={124}>
            <b>{targets ? Math.abs(Math.round(left)) : Math.round(total.kcal)}</b>
            <span>{targets ? (left >= 0 ? 'kcal zostało' : 'kcal ponad') : 'kcal'}</span>
          </Ring>
          <div className="stack" style={{ flex: 1, gap: 6 }}>
            <div className="stat"><span className="v">{Math.round(total.kcal)}<small>{targets ? `/ ${targets.kcal}` : ''} kcal</small></span><span className="l">zjedzone</span></div>
            {!targets && <Link to="/dieta/cele" className="small" style={{ color: 'var(--accent)', fontWeight: 600 }}>Ustaw swoje cele →</Link>}
          </div>
        </div>
        <MacroBars eaten={total} target={targets} />
        {log.length > 0 && (
          <button className="btn ghost sm" style={{ alignSelf: 'center' }} onClick={() => setDetails(!details)}>
            <Icon name={details ? 'up' : 'down'} size={16} /> {details ? 'Ukryj' : 'Pokaż'} witaminy, minerały, cukry i sól
          </button>
        )}
        {details && (
          <>
            <Nutrients v={total} showMissing />
            {total.withMicro < total.count && (
              <div className="tiny muted">Dane o witaminach i minerałach ma {total.withMicro} z {total.count} wpisów – prawdziwe spożycie jest wyższe niż pokazane.</div>
            )}
          </>
        )}
      </div>

      {MEALS.map((meal, mi) => {
        const items = log.filter((f) => f.meal === mi).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
        const s = totals(items)
        const time = items.find((f) => f.time)?.time
        return (
          <div key={mi} className="card flush">
            <div className="meal-head">
              <h3>{meal}</h3>
              {time && <span className="pill"><Icon name="clock" size={12} /> {time}</span>}
              <span className="small muted num">{Math.round(s.kcal)} kcal</span>
              <Link to={`/dieta/dodaj?meal=${mi}&d=${date}`} className="icon-btn" aria-label={`Dodaj do: ${meal}`} style={{ color: 'var(--accent)' }}>
                <Icon name="plus" />
              </Link>
            </div>
            {items.length > 0 ? (
              <>
                <div className="food-macros" style={{ padding: '0 16px 6px' }}>B {num(s.p)} g · W {num(s.c)} g · T {num(s.f)} g</div>
                <div className="list">
                  {items.map((f) => (
                    <button key={f.id} className="row" onClick={() => setEdit(f)}>
                      <div className="grow">
                        <div className="title small">{f.name}</div>
                        <div className="food-macros">
                          {f.grams ? `${num(f.grams, 0)} g · ` : ''}B {num(f.p)} · W {num(f.c)} · T {num(f.f)}
                        </div>
                      </div>
                      <span className="num small">{Math.round(f.kcal)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button className="btn ghost sm" style={{ margin: '0 8px 10px' }} onClick={() => copyYesterday(mi)}>
                <Icon name="copy" size={16} /> Kopiuj z poprzedniego dnia
              </button>
            )}
          </div>
        )
      })}

      <DayCard date={date} />

      {edit && <EditEntry entry={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function EditEntry({ entry, onClose }: { entry: FoodLogEntry; onClose: () => void }) {
  const [grams, setGrams] = useState(entry.grams)
  const [meal, setMeal] = useState(entry.meal)
  const [time, setTime] = useState(entry.time ?? '')
  const k = entry.grams && grams ? grams / entry.grams : 1
  const scaled = { ...entry, ...rescaleEntry(entry, k) }
  async function save() {
    await db.foodLog.update(entry.id!, { grams, meal, time: time || undefined, ...rescaleEntry(entry, k) })
    onClose()
  }
  async function remove() {
    await db.foodLog.delete(entry.id!)
    onClose()
  }
  return (
    <Sheet title={entry.name} onClose={onClose}>
      {entry.grams !== undefined && (
        <label className="field"><span>Ilość (g)</span><NumInput value={grams} onChange={setGrams} /></label>
      )}
      <MacroTiles kcal={scaled.kcal} p={scaled.p} c={scaled.c} f={scaled.f} />
      {(scaled.micro || scaled.sugar !== undefined) && <div className="card"><Nutrients v={scaled} /></div>}
      <div className="grid2">
        <label className="field">
          <span>Posiłek</span>
          <select className="input" value={meal} onChange={(e) => setMeal(Number(e.target.value))}>
            {MEALS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Godzina</span>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <button className="btn primary lg block" onClick={save}>Zapisz</button>
      <button className="btn danger block" onClick={remove}><Icon name="trash" size={18} /> Usuń wpis</button>
    </Sheet>
  )
}
