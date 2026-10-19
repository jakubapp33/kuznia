import { describe, expect, it } from 'vitest'
import { EXERCISE_MAP } from '../data/exercises'
import type { BodyEntry, DayLog, FoodLogEntry, Profile, Workout } from '../types'
import { addDays } from './format'
import { analyze, workoutFactors } from './insights'
import { analyzeWeight, weeklyAverages } from './weight'
import { analyzeEnergy } from './energy'
import { parseHealthText, parseLooseNumber } from './healthPaste'

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

describe('bilans energii', () => {
  const profile: Profile = { sex: 'm', age: 20, height: 180, weight: 80, activity: 1.55, goal: 'cut', rate: 0.5, experience: 'początkujący' }
  const today = '2026-10-18'
  const days: DayLog[] = Array.from({ length: 14 }, (_, i) => ({ date: addDays(today, -14 + i), kcalRest: 1800, kcalActive: 600, steps: 10000 }))
  const food: FoodLogEntry[] = days.map((d) => ({ date: d.date, meal: 0, name: 'x', kcal: 2000, p: 150, f: 60, c: 200 }))
  const body = (perWeek: number): BodyEntry[] => Array.from({ length: 28 }, (_, i) => ({ date: addDays(today, -27 + i), weight: 80 + (perWeek / 7) * i }))

  it('średni deficyt 400 kcal zgodny z wagą', () => {
    const a = analyzeEnergy(food, days, body(-0.36), today, profile)
    expect(a.avgBalance).toBeCloseTo(-400)
    expect(a.avgSteps).toBe(10000)
    expect(a.verdict!.title).toContain('deficyt ok. 400')
    expect(a.verdict!.text).toContain('tendencję spadkową')
    expect(a.verdict!.tone).toBe('good')
  })
  it('zegarek mówi deficyt, a waga stoi = ostrzeżenie', () => {
    expect(analyzeEnergy(food, days, body(0), today, profile).verdict!.tone).toBe('warn')
  })
  it('bez danych z zegarka – bilans z samej wagi', () => {
    const a = analyzeEnergy([], [], body(0.3), today, profile)
    expect(a.verdict!.text).toContain('nadwyżka')
  })
})

describe('wklejanie ze Skrótu', () => {
  it('liczby w różnych formatach', () => {
    expect(parseLooseNumber('8\u00a0532')).toBe(8532)
    expect(parseLooseNumber('1 734,5 kcal')).toBe(1734.5)
    expect(parseLooseNumber('1,734.5')).toBe(1734.5)
    expect(parseLooseNumber('12,345')).toBe(12345)
    expect(parseLooseNumber('534,2')).toBe(534.2)
    expect(parseLooseNumber('')).toBeUndefined()
  })
  it('tekst ze skrótu', () => {
    expect(parseHealthText('kroki=8 532\naktywne=534,6\nspoczynkowe=1 745')).toEqual({ steps: 8532, kcalActive: 535, kcalRest: 1745 })
    expect(parseHealthText('Kroki: 10000; Aktywne: 400')).toEqual({ steps: 10000, kcalActive: 400 })
    expect(parseHealthText('kroki=')).toBeUndefined()
    expect(parseHealthText('jakiś tekst')).toBeUndefined()
  })
})
