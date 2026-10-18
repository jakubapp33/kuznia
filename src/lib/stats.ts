import { EXERCISE_MAP } from '../data/exercises'
import { GROUPS, groupOf } from '../data/muscles'
import type { Exercise, Workout } from '../types'
import { workingSets } from './progression'

/**
 * Tygodniowa liczba serii roboczych na grupę mięśniową.
 * Mięsień główny = 1 seria, pomocniczy = 0,5 serii (przyjęta w badaniach metoda liczenia „serii frakcyjnych”).
 */
export function weeklySets(workouts: Workout[], custom: Map<string, Exercise> = new Map()): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(GROUPS.map((g) => [g.id, 0]))
  for (const w of workouts) {
    if (!w.finishedAt) continue
    for (const we of w.exercises) {
      const ex = EXERCISE_MAP.get(we.exerciseId) ?? custom.get(we.exerciseId)
      if (!ex || ex.load === 'cardio') continue
      const n = workingSets(we).length
      if (!n) continue
      const credited = new Map<string, number>()
      for (const m of ex.primary) credited.set(groupOf(m).id, 1)
      for (const m of ex.secondary) {
        const g = groupOf(m).id
        if (!credited.has(g)) credited.set(g, 0.5)
      }
      for (const [g, v] of credited) out[g] += v * n
    }
  }
  return out
}

/** Ocena objętości tygodniowej względem zakresów z badań. */
export function volumeStatus(sets: number): { label: string; tone: 'low' | 'ok' | 'good' | 'high' } {
  if (sets < 4) return { label: 'mało', tone: 'low' }
  if (sets < 10) return { label: 'utrzymanie / start', tone: 'ok' }
  if (sets <= 20) return { label: 'optymalnie', tone: 'good' }
  return { label: 'bardzo dużo', tone: 'high' }
}

export function workoutVolume(w: Workout): number {
  let v = 0
  for (const we of w.exercises) for (const s of workingSets(we)) v += (s.w ?? 0) * (s.r ?? 0)
  return v
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((n, we) => n + workingSets(we).length, 0)
}
