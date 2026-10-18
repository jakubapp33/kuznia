import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router'
import { HeatMap } from '../components/BodyMap'
import { Icon } from '../components/Icon'
import { LineChart } from '../components/LineChart'
import { Empty, Field, NumInput, PageHead, Seg, Sheet } from '../components/ui'
import { GROUPS } from '../data/muscles'
import { db } from '../db/db'
import { addDays, fmtDate, fmtShort, isoDate, num, weekStart } from '../lib/format'
import { useExercises } from '../lib/hooks'
import { e1rm, exerciseHistory, records, workingSets } from '../lib/progression'
import { volumeStatus, weeklySets } from '../lib/stats'
import type { BodyEntry, MuscleId } from '../types'

type Tab = 'body' | 'strength' | 'volume'

function readTab(): Tab {
  try {
    return (sessionStorage.getItem('kuznia.progressTab') as Tab) || 'volume'
  } catch {
    return 'volume'
  }
}

export function Progress() {
  const [tab, setTabState] = useState<Tab>(readTab)
  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      sessionStorage.setItem('kuznia.progressTab', t)
    } catch {
      /* ignoruj */
    }
  }
  return (
    <div className="page">
      <PageHead title="Postęp" />
      <Seg<Tab> value={tab} onChange={setTab} options={[{ value: 'volume', label: 'Objętość' }, { value: 'strength', label: 'Siła' }, { value: 'body', label: 'Ciało' }]} />
      {tab === 'volume' && <VolumeTab />}
      {tab === 'strength' && <StrengthTab />}
      {tab === 'body' && <BodyTab />}
    </div>
  )
}

function VolumeTab() {
  const [offset, setOffset] = useState(0)
  const start = addDays(weekStart(isoDate()), -7 * offset)
  const end = addDays(start, 7)
  const workouts = useLiveQuery(() => db.workouts.where('date').between(start, end, true, false).toArray(), [start], [])
  const weeks = useLiveQuery(async () => {
    const from = addDays(weekStart(isoDate()), -7 * 7)
    const list = await db.workouts.where('date').aboveOrEqual(from).filter((w) => !!w.finishedAt).toArray()
    return Array.from({ length: 8 }, (_, i) => {
      const ws = addDays(from, i * 7)
      return { ws, n: list.filter((w) => w.date >= ws && w.date < addDays(ws, 7)).length }
    })
  }, [], [])
  const { custom } = useExercises()
  const sets = weeklySets(workouts, custom)
  const heat: Partial<Record<MuscleId, number>> = {}
  for (const g of GROUPS) for (const m of g.muscles) heat[m] = Math.min(1, sets[g.id] / 20)
  const maxWeek = Math.max(1, ...weeks.map((w) => w.n))

  return (
    <>
      <div className="hstack">
        <button className="icon-btn filled" aria-label="Poprzedni tydzień" onClick={() => setOffset(offset + 1)}><Icon name="back" /></button>
        <div className="spacer" style={{ textAlign: 'center', fontWeight: 700 }}>
          {offset === 0 ? 'Ten tydzień' : offset === 1 ? 'Poprzedni tydzień' : `${fmtShort(start)} – ${fmtShort(addDays(end, -1))}`}
        </div>
        <button className="icon-btn filled" aria-label="Następny tydzień" disabled={offset === 0} onClick={() => setOffset(offset - 1)}><Icon name="chev" /></button>
      </div>
      <div className="card stack">
        <HeatMap values={heat} />
        <div className="tiny muted" style={{ textAlign: 'center' }}>Im mocniejszy kolor, tym bliżej 20 serii w tygodniu.</div>
      </div>
      <div className="card stack">
        <div className="hstack"><h3 style={{ flex: 1 }}>Serie na partię</h3><span className="tiny muted">cel 10–20</span></div>
        {GROUPS.map((g) => {
          const v = sets[g.id]
          const st = volumeStatus(v)
          return (
            <div key={g.id} className="stack" style={{ gap: 4 }}>
              <div className="hstack small">
                <span style={{ flex: 1, fontWeight: 600 }}>{g.name}</span>
                {v > 0 && <span className={'pill ' + (st.tone === 'good' ? 'good' : st.tone === 'high' ? 'warn' : '')}>{st.label}</span>}
                <b className="num" style={{ minWidth: 30, textAlign: 'right' }}>{num(v)}</b>
              </div>
              <div className="bar" style={{ position: 'relative' }}>
                <i style={{ width: `${Math.min(100, (v / 25) * 100)}%`, background: st.tone === 'good' ? 'var(--good)' : st.tone === 'high' ? 'var(--warn)' : 'var(--accent)' }} />
              </div>
            </div>
          )
        })}
        <div className="tiny muted">Ćwiczenie liczy się jako 1 seria dla mięśni głównych i ½ serii dla pomocniczych. Rozgrzewki się nie liczą.</div>
      </div>
      <div className="card stack">
        <h3>Treningi w tygodniu</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, alignItems: 'end', height: 110 }}>
          {weeks.map((w) => (
            <div key={w.ws} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <b className="num tiny">{w.n || ''}</b>
              <div style={{ width: '70%', height: `${(w.n / maxWeek) * 70}%`, minHeight: 3, borderRadius: 6, background: w.n ? 'var(--accent)' : 'var(--surface-2)' }} />
              <span className="tiny muted" style={{ fontSize: 10 }}>{fmtShort(w.ws).split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function StrengthTab() {
  const workouts = useLiveQuery(() => db.workouts.toArray(), [], [])
  const { map } = useExercises()
  const done = new Map<string, number>()
  for (const w of workouts) {
    if (!w.finishedAt) continue
    for (const we of w.exercises) {
      const ex = map.get(we.exerciseId)
      if (ex && ex.load !== 'cardio' && workingSets(we).length) done.set(we.exerciseId, (done.get(we.exerciseId) ?? 0) + 1)
    }
  }
  const ids = [...done.keys()].sort((a, b) => done.get(b)! - done.get(a)!)
  const [sel, setSel] = useState<string>('')
  const current = sel || ids[0]
  if (!ids.length) return <Empty icon="trophy">Zrób pierwszy trening – tu pojawią się Twoje rekordy i wykresy siły.</Empty>

  const ex = map.get(current)
  const hist = exerciseHistory(workouts, current)
  const rec = records(hist)
  const weighted = hist.some((h) => workingSets(h.we).some((s) => s.w))
  const chart = [...hist].reverse().map(({ workout, we }) => {
    const s = workingSets(we)
    return {
      date: workout.date,
      value: weighted ? Math.max(...s.map((x) => ((x.r ?? 0) <= 15 ? e1rm(x.w ?? 0, x.r ?? 0) : x.w ?? 0))) : Math.max(...s.map((x) => x.r ?? x.t ?? 0)),
    }
  })
  const first = chart[0]?.value
  const last = chart[chart.length - 1]?.value

  return (
    <>
      <select className="input" value={current} onChange={(e) => setSel(e.target.value)} aria-label="Ćwiczenie">
        {ids.map((id) => <option key={id} value={id}>{map.get(id)?.pl ?? id} ({done.get(id)})</option>)}
      </select>
      <div className="card stack">
        <div className="hstack">
          <h3 style={{ flex: 1 }}>{weighted ? 'Szacowany max (1RM)' : 'Najlepsza seria'}</h3>
          {chart.length > 1 && first > 0 && (
            <span className={'pill ' + (last >= first ? 'good' : 'warn')}>{last >= first ? '+' : ''}{num(((last - first) / first) * 100, 0)}%</span>
          )}
        </div>
        {chart.length > 1 ? <LineChart points={chart} unit={weighted ? 'kg' : ''} /> : <div className="small muted">Wykres pojawi się po drugiej sesji tego ćwiczenia.</div>}
      </div>
      <div className="card grid2">
        {rec.e1rm && weighted && <div className="stat"><span className="v">{num(rec.e1rm.value)}<small>kg</small></span><span className="l">1RM · {fmtDate(rec.e1rm.date)}</span></div>}
        {rec.weight && <div className="stat"><span className="v">{num(rec.weight.w)}<small>× {rec.weight.r}</small></span><span className="l">najcięższa seria</span></div>}
        {rec.reps && <div className="stat"><span className="v">{rec.reps.r}<small>powt.</small></span><span className="l">najwięcej powtórzeń</span></div>}
        {rec.volume && <div className="stat"><span className="v">{num(rec.volume.value, 0)}<small>kg</small></span><span className="l">najw. objętość w sesji</span></div>}
      </div>
      {ex && <Link to={`/cwiczenia/${ex.id}`} className="btn block">Szczegóły ćwiczenia</Link>}

      <div className="section-title">Rekordy</div>
      <div className="card flush list">
        {ids.slice(0, 15).map((id) => {
          const r = records(exerciseHistory(workouts, id))
          return (
            <button key={id} className="row" onClick={() => setSel(id)}>
              <div className="grow">
                <div className="title small">{map.get(id)?.pl ?? id}</div>
                <div className="meta num">
                  {r.weight ? `${num(r.weight.w)} kg × ${r.weight.r}` : r.reps ? `${r.reps.r} powt.` : ''}
                  {r.e1rm ? ` · 1RM ≈ ${num(r.e1rm.value)} kg` : ''}
                </div>
              </div>
              <Icon name="trophy" className="chev" size={18} />
            </button>
          )
        })}
      </div>
    </>
  )
}

const MEASURES: { k: keyof BodyEntry; label: string; unit: string }[] = [
  { k: 'weight', label: 'Waga', unit: 'kg' },
  { k: 'waist', label: 'Talia (w pępku)', unit: 'cm' },
  { k: 'chest', label: 'Klatka', unit: 'cm' },
  { k: 'arm', label: 'Ramię (napięte)', unit: 'cm' },
  { k: 'thigh', label: 'Udo', unit: 'cm' },
  { k: 'hips', label: 'Biodra', unit: 'cm' },
  { k: 'bodyFat', label: 'Tkanka tłuszczowa', unit: '%' },
]

function BodyTab() {
  const entries = useLiveQuery(() => db.body.orderBy('date').toArray(), [], [])
  const [range, setRange] = useState<'30' | '90' | 'all'>('90')
  const [metric, setMetric] = useState<keyof BodyEntry>('weight')
  const [adding, setAdding] = useState(false)
  const from = range === 'all' ? '0000' : addDays(isoDate(), -Number(range))
  const m = MEASURES.find((x) => x.k === metric)!
  const pts = entries.filter((e) => e.date >= from && typeof e[metric] === 'number').map((e) => ({ date: e.date, value: e[metric] as number }))

  // tempo zmiany wagi: średnia z ostatnich 7 dni vs 7 dni wcześniej
  const w = entries.filter((e) => e.weight)
  const avg = (a: string, b: string) => {
    const x = w.filter((e) => e.date > a && e.date <= b).map((e) => e.weight!)
    return x.length ? x.reduce((s, v) => s + v, 0) / x.length : undefined
  }
  const today = isoDate()
  const nowAvg = avg(addDays(today, -7), today)
  const prevAvg = avg(addDays(today, -14), addDays(today, -7))
  const delta = nowAvg !== undefined && prevAvg !== undefined ? nowAvg - prevAvg : undefined

  return (
    <>
      <div className="chips">
        {MEASURES.map((x) => (
          <button key={x.k} className={'chip' + (metric === x.k ? ' on' : '')} onClick={() => setMetric(x.k)}>{x.label}</button>
        ))}
      </div>
      <div className="card stack">
        <div className="hstack">
          <h3 style={{ flex: 1 }}>{m.label}</h3>
          <Seg value={range} onChange={setRange} options={[{ value: '30', label: '30 dni' }, { value: '90', label: '90 dni' }, { value: 'all', label: 'Całość' }]} />
        </div>
        {pts.length ? <LineChart points={pts} unit={m.unit} /> : <div className="small muted">Brak pomiarów w tym okresie.</div>}
        {metric === 'weight' && delta !== undefined && (
          <div className="small">
            Średnia tygodniowa: <b className="num">{num(nowAvg)} kg</b> ({delta >= 0 ? '+' : ''}{num(delta, 2)} kg vs poprzedni tydzień, {num((delta / prevAvg!) * 100, 2)}%)
          </div>
        )}
      </div>
      <button className="btn primary block" onClick={() => setAdding(true)}><Icon name="plus" /> Dodaj pomiar</button>
      <div className="tiny muted">Waż się rano, po toalecie, przed jedzeniem. Obwody mierz raz na 1–2 tygodnie w tych samych warunkach.</div>
      {entries.length > 0 && (
        <div className="card flush list">
          {[...entries].reverse().slice(0, 20).map((e) => (
            <div key={e.id} className="row">
              <div className="grow">
                <div className="title small">{fmtDate(e.date)}</div>
                <div className="meta num">
                  {MEASURES.filter((x) => typeof e[x.k] === 'number').map((x) => `${x.label.split(' ')[0]} ${num(e[x.k] as number)}${x.unit === '%' ? '%' : ''}`).join(' · ')}
                </div>
              </div>
              <button className="icon-btn" aria-label="Usuń pomiar" onClick={() => confirm('Usunąć ten pomiar?') && db.body.delete(e.id!)}><Icon name="trash" size={18} /></button>
            </div>
          ))}
        </div>
      )}
      {adding && <AddMeasure onClose={() => setAdding(false)} />}
    </>
  )
}

function AddMeasure({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(isoDate())
  const existing = useLiveQuery(() => db.body.where('date').equals(date).first(), [date])
  const [vals, setVals] = useState<Partial<BodyEntry>>({})
  async function save() {
    const clean = Object.fromEntries(Object.entries(vals).filter(([, v]) => v !== undefined))
    if (existing) await db.body.update(existing.id!, clean)
    else await db.body.add({ date, ...clean })
    onClose()
  }
  return (
    <Sheet title="Nowy pomiar" onClose={onClose}>
      <Field label="Data"><input className="input" type="date" value={date} max={isoDate()} onChange={(e) => setDate(e.target.value || isoDate())} /></Field>
      <div className="grid2">
        {MEASURES.map((x) => (
          <Field key={x.k} label={`${x.label} (${x.unit})`}>
            <NumInput value={vals[x.k] as number | undefined} placeholder={existing?.[x.k] !== undefined ? num(existing[x.k] as number) : ''} onChange={(v) => setVals((s) => ({ ...s, [x.k]: v }))} />
          </Field>
        ))}
      </div>
      <button className="btn primary lg block" onClick={save} disabled={!Object.values(vals).some((v) => v !== undefined)}>Zapisz</button>
    </Sheet>
  )
}
