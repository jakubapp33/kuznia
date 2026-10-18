import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { Empty, TopBar } from '../components/ui'
import { db } from '../db/db'
import { fmtDate, fmtDuration, num } from '../lib/format'
import { workoutSetCount, workoutVolume } from '../lib/stats'

export function History() {
  const workouts = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().filter((w) => !!w.finishedAt).toArray(), [], [])
  const byMonth = new Map<string, typeof workouts>()
  for (const w of workouts) {
    const k = new Date(w.startedAt).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
    byMonth.set(k, [...(byMonth.get(k) ?? []), w])
  }
  return (
    <div className="page">
      <TopBar title="Historia treningów" back="/trening" />
      {workouts.length === 0 && <Empty icon="calendar">Tu pojawią się zakończone treningi.</Empty>}
      {[...byMonth].map(([month, list]) => (
        <div key={month} className="stack" style={{ gap: 8 }}>
          <div className="section-title">{month} · {list.length}</div>
          <div className="card flush list">
            {list.map((w) => (
              <Link key={w.id} to={`/trening/historia/${w.id}`} className="row">
                <div className="grow">
                  <div className="title">{w.name}</div>
                  <div className="meta">
                    {fmtDate(w.date, true)} · {fmtDuration(w.finishedAt! - w.startedAt)} · {workoutSetCount(w)} serii · {num(workoutVolume(w) / 1000)} t
                  </div>
                </div>
                <Icon name="chev" className="chev" size={18} />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
