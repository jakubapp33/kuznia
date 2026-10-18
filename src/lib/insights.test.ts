import { describe, expect, it } from 'vitest'
import { EXERCISE_MAP } from '../data/exercises'
import type { BodyEntry, DayLog, FoodLogEntry, Profile, Workout } from '../types'
import { addDays } from './format'
import { analyze, workoutFactors } from './insights'
import { analyzeWeight, weeklyAverages } from './weight'

const START = '2026-09-01'

function mk(i: number, reps: number, hour = 18): Workout {
  const date = addDays(START, i * 2)
  const t = new Date(date + 'T00:00:00').getTime() + hour * 3600e3
  return {
    id: i + 1, name: 'T', date, startedAt: t, finishedAt: t + 3600e3,
    exercises: [{ exerciseId: 'bench-press', restSec: 120, sets: [{ w: 80, r: reps, done: true }, { w: 80, r: reps, done: true }] }],
  }
}

describe('wnioski', () => {
  it('wykrywa, że po dłuższym śnie wyniki są lepsze', () => {
    const workouts: Workout[] = []
    const days: DayLog[] = []
    for (let i = 0; i < 16; i++) {
      const good = i % 2 === 0
      workouts.push(mk(i, good ? 10 : 8))
      days.push({ date: addDays(START, i * 2), sleepH: good ? 8 : 5 })
    }
    const res = analyze(workouts, [], days, EXERCISE_MAP)
    expect(res.scored).toBeGreaterThanOrEqual(8)
    const sleep = res.insights.find((x) => x.id === 'sleep')
    expect(sleep).toBeTruthy()
    expect(sleep!.text).toMatch(/snu.*lepsze/)
    expect(sleep!.diff).toBeGreaterThan(3)
  })

  it('wykrywa wpływ węglowodanów przed treningiem i nie wymyśla zależności od snu', () => {
    const workouts: Workout[] = []
    const food: FoodLogEntry[] = []
    const days: DayLog[] = []
    for (let i = 0; i < 16; i++) {
      const fed = i % 2 === 0
      const w = mk(i, fed ? 10 : 8, 17)
      workouts.push(w)
      food.push({ date: w.date, time: '14:30', meal: 2, name: 'obiad', kcal: 600, p: 35, f: 15, c: fed ? 80 : 10 })
      days.push({ date: w.date, sleepH: i % 4 < 2 ? 8 : 6 })
    }
    const res = analyze(workouts, food, days, EXERCISE_MAP)
    expect(res.insights.find((x) => x.id === 'carbs')?.better).toBe(true)
    expect(res.insights.find((x) => x.id === 'sleep')).toBeUndefined()
  })

  it('mniej niż 8 treningów – brak wniosków', () => {
    const ws = Array.from({ length: 5 }, (_, i) => mk(i, 8 + (i % 2)))
    expect(analyze(ws, [], [], EXERCISE_MAP).insights).toEqual([])
  })

  it('czynniki: węglowodany w ciągu 4 h i odstęp od posiłku', () => {
    const w = mk(0, 8, 18)
    const f = workoutFactors(w, [
      { date: w.date, time: '08:00', meal: 0, name: 'a', kcal: 400, p: 20, f: 10, c: 60 },
      { date: w.date, time: '16:00', meal: 2, name: 'b', kcal: 500, p: 30, f: 10, c: 50 },
    ], new Map())
    expect(f.preCarbs).toBe(50)
    expect(f.mealGapH).toBe(2)
    expect(f.hour).toBe(18)
  })
})

describe('waga', () => {
  const profile: Profile = { sex: 'm', age: 20, height: 180, weight: 80, activity: 1.55, goal: 'cut', rate: 0.5, experience: 'początkujący' }
  const today = '2026-10-18'
  const series = (perWeek: number): BodyEntry[] =>
    Array.from({ length: 28 }, (_, i) => ({ date: addDays(today, -27 + i), weight: 80 + (perWeek / 7) * i + (i % 3 === 0 ? 0.4 : -0.2) }))

  it('redukcja w tempie planu = dobrze', () => {
    const t = analyzeWeight(series(-0.4), today, profile)!
    expect(t.verdict.tone).toBe('good')
    expect(t.perWeekKg).toBeCloseTo(-0.4, 1)
  })
  it('waga stoi na redukcji = ostrzeżenie', () => {
    expect(analyzeWeight(series(0), today, profile)!.verdict.title).toBe('Waga stoi')
  })
  it('za mało pomiarów = brak oceny', () => {
    expect(analyzeWeight(series(-0.4).slice(-3), today, profile)).toBeUndefined()
  })
  it('średnie tygodniowe', () => {
    const w = weeklyAverages(series(-0.4), today, 4)
    expect(w).toHaveLength(4)
    expect(w[3].avg!).toBeLessThan(w[0].avg!)
  })
})
