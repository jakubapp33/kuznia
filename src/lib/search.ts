import { GROUPS } from '../data/muscles'
import type { Exercise } from '../types'

export function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
}

export function filterExercises(list: Exercise[], q: string, group: string, equipment: string): Exercise[] {
  const words = norm(q).split(/\s+/).filter(Boolean)
  const g = GROUPS.find((x) => x.id === group)
  return list.filter((e) => {
    if (g && !e.primary.some((m) => g.muscles.includes(m))) return false
    if (equipment && e.equipment !== equipment) return false
    if (!words.length) return true
    const hay = norm(e.pl + ' ' + e.en)
    return words.every((w) => hay.includes(w))
  })
}
