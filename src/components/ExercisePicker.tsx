import { useState } from 'react'
import { GROUPS, MUSCLES } from '../data/muscles'
import { useExercises } from '../lib/hooks'
import { filterExercises } from '../lib/search'
import type { Exercise } from '../types'
import { Icon } from './Icon'
import { Sheet } from './ui'

export function ExerciseFilters({ q, setQ, group, setGroup }: { q: string; setQ: (s: string) => void; group: string; setGroup: (s: string) => void }) {
  return (
    <>
      <div className="search">
        <Icon name="search" size={18} />
        <input className="input" type="search" placeholder="Szukaj (PL lub EN)…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        <button className={'chip' + (group === '' ? ' on' : '')} onClick={() => setGroup('')}>Wszystkie</button>
        {GROUPS.map((g) => (
          <button key={g.id} className={'chip' + (group === g.id ? ' on' : '')} onClick={() => setGroup(g.id)}>{g.name}</button>
        ))}
      </div>
    </>
  )
}

export function ExerciseRow({ e, onClick, right }: { e: Exercise; onClick?: () => void; right?: React.ReactNode }) {
  return (
    <button className="row" onClick={onClick}>
      <div className="grow">
        <div className="title">{e.pl}</div>
        <div className="meta">{e.en} · {e.primary.map((m) => MUSCLES[m]).join(', ')}</div>
      </div>
      {right ?? <Icon name="plus" className="chev" />}
    </button>
  )
}

export function ExercisePicker({ onPick, onClose, title = 'Dodaj ćwiczenie' }: { onPick: (e: Exercise) => void; onClose: () => void; title?: string }) {
  const { all } = useExercises()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const list = filterExercises(all, q, group, '')
  return (
    <Sheet title={title} onClose={onClose}>
      <ExerciseFilters q={q} setQ={setQ} group={group} setGroup={setGroup} />
      <div className="card flush list">
        {list.slice(0, 120).map((e) => (
          <ExerciseRow key={e.id} e={e} onClick={() => onPick(e)} />
        ))}
        {list.length === 0 && <div className="empty">Nic nie znaleziono. Możesz dodać własne ćwiczenie w zakładce Ćwiczenia.</div>}
      </div>
    </Sheet>
  )
}
