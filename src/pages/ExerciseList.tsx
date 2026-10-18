import { useState } from 'react'
import { Link } from 'react-router'
import { ExerciseFilters } from '../components/ExercisePicker'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/ui'
import { MUSCLES } from '../data/muscles'
import { useExercises } from '../lib/hooks'
import { filterExercises } from '../lib/search'
import type { Equipment } from '../types'

const EQUIPMENT: Equipment[] = ['sztanga', 'hantle', 'maszyna', 'wyciąg', 'masa ciała', 'kettlebell', 'inne', 'cardio']

function readSaved(): { q: string; group: string; eq: string } {
  try {
    return JSON.parse(sessionStorage.getItem('kuznia.exfilter') ?? '') as { q: string; group: string; eq: string }
  } catch {
    return { q: '', group: '', eq: '' }
  }
}

export function ExerciseList() {
  const { all } = useExercises()
  const saved = readSaved()
  const [q, setQ] = useState(saved.q)
  const [group, setGroup] = useState(saved.group)
  const [eq, setEq] = useState(saved.eq)
  try {
    sessionStorage.setItem('kuznia.exfilter', JSON.stringify({ q, group, eq }))
  } catch {
    /* ignoruj */
  }
  const list = filterExercises(all, q, group, eq)
  return (
    <div className="page">
      <PageHead
        title="Ćwiczenia"
        sub={`${all.length} ćwiczeń z opisem techniki`}
        right={<Link to="/cwiczenia/nowe" className="icon-btn filled" aria-label="Dodaj własne ćwiczenie"><Icon name="plus" /></Link>}
      />
      <ExerciseFilters q={q} setQ={setQ} group={group} setGroup={setGroup} />
      <select className="input" value={eq} onChange={(e) => setEq(e.target.value)} aria-label="Sprzęt">
        <option value="">Każdy sprzęt</option>
        {EQUIPMENT.map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
      </select>
      <div className="card flush list">
        {list.map((e) => (
          <Link key={e.id} to={`/cwiczenia/${e.id}`} className="row">
            <div className="grow">
              <div className="title">{e.pl} {e.custom && <span className="pill">własne</span>}</div>
              <div className="meta">{e.en}</div>
              <div className="tiny" style={{ color: 'var(--accent)', marginTop: 2 }}>{e.primary.map((m) => MUSCLES[m]).join(' · ')}</div>
            </div>
            <Icon name="chev" className="chev" size={18} />
          </Link>
        ))}
        {list.length === 0 && <div className="empty">Brak ćwiczeń dla tych filtrów.</div>}
      </div>
    </div>
  )
}
