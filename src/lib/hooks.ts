import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { EXERCISES } from '../data/exercises'
import { db } from '../db/db'
import type { Exercise, MacroTargets, Profile } from '../types'
import { computeTargets } from './nutrition'

export function useCustomExercises(): Exercise[] {
  return useLiveQuery(() => db.customExercises.toArray(), [], [])
}

export function useExercises() {
  const custom = useCustomExercises()
  return useMemo(() => {
    const all = [...EXERCISES, ...custom].sort((a, b) => a.pl.localeCompare(b.pl, 'pl'))
    const map = new Map(all.map((e) => [e.id, e]))
    return { all, map, custom: new Map(custom.map((e) => [e.id, e])) }
  }, [custom])
}

export function useSetting<T>(key: string): T | undefined {
  return useLiveQuery(async () => (await db.settings.get(key))?.value as T | undefined, [key])
}

/** null = jeszcze się ładuje, undefined = brak profilu */
export function useProfile(): Profile | undefined | null {
  const row = useLiveQuery(async () => (await db.settings.get('profile')) ?? false, [])
  if (row === undefined) return null
  return row === false ? undefined : (row.value as Profile)
}

/** cele makro: ręczne nadpisanie albo wyliczone z profilu */
export function useTargets(): MacroTargets | undefined {
  const profile = useProfile()
  const manual = useSetting<MacroTargets | null>('manualTargets')
  return useMemo(() => {
    if (manual) return manual
    if (profile) return computeTargets(profile)
    return undefined
  }, [profile, manual])
}

export function useActiveWorkout() {
  return useLiveQuery(async () => (await db.workouts.filter((w) => !w.finishedAt).first()) ?? null, [])
}
