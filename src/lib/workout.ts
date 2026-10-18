import { EXERCISE_MAP } from '../data/exercises'
import { db, getSetting } from '../db/db'
import type { Exercise, Plan, PlanDay, PlanExercise, SetEntry, Workout, WorkoutExercise } from '../types'
import { isoDate } from './format'
import { exerciseHistory, suggest } from './progression'

async function findExercise(id: string): Promise<Exercise | undefined> {
  return EXERCISE_MAP.get(id) ?? (await db.customExercises.get(id))
}

/** serie wstępnie wypełnione ciężarem z podpowiedzi progresji */
export async function buildExercise(pe: Omit<PlanExercise, 'note'> & { note?: string }, history: Workout[]): Promise<WorkoutExercise> {
  const ex = await findExercise(pe.exerciseId)
  const hist = exerciseHistory(history, pe.exerciseId).map((h) => h.we)
  const s = ex ? suggest(ex, pe.repMin, pe.repMax, hist) : undefined
  const sets: SetEntry[] = Array.from({ length: pe.sets }, () => ({
    done: false,
    w: s?.weight,
  }))
  return { exerciseId: pe.exerciseId, repMin: pe.repMin, repMax: pe.repMax, rir: pe.rir, restSec: pe.restSec, note: pe.note, sets }
}

export async function startWorkout(plan?: Plan, day?: PlanDay): Promise<number> {
  const active = await db.workouts.filter((w) => !w.finishedAt).first()
  if (active?.id) return active.id
  const history = await db.workouts.orderBy('startedAt').reverse().limit(300).toArray()
  const exercises = day ? await Promise.all(day.exercises.map((pe) => buildExercise(pe, history))) : []
  const w: Workout = {
    name: day ? day.name : 'Trening',
    date: isoDate(),
    startedAt: Date.now(),
    planId: plan?.id,
    dayId: day?.id,
    exercises,
  }
  return (await db.workouts.add(w)) as number
}

export async function defaultRest(ex: Exercise): Promise<number> {
  const custom = await getSetting<{ compound: number; isolation: number }>('restDefaults')
  if (ex.load === 'cardio') return 0
  return ex.compound ? custom?.compound ?? 150 : custom?.isolation ?? 75
}

/** następny dzień planu: po ostatnio wykonanym dniu z tego planu */
export function nextDay(plan: Plan, workouts: Workout[]): PlanDay | undefined {
  if (!plan.days.length) return undefined
  const last = workouts
    .filter((w) => w.finishedAt && w.planId === plan.id && w.dayId)
    .sort((a, b) => b.startedAt - a.startedAt)[0]
  if (!last) return plan.days[0]
  const idx = plan.days.findIndex((d) => d.id === last.dayId)
  return plan.days[(idx + 1) % plan.days.length]
}

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}
