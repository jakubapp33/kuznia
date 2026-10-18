import { describe, expect, it } from 'vitest'
import { EXERCISE_MAP } from '../data/exercises'
import type { Profile, Workout, WorkoutExercise } from '../types'
import { adaptiveTdee, bmr, computeTargets } from './nutrition'
import { e1rm, exerciseHistory, suggest } from './progression'
import { weeklySets } from './stats'
import { nextDay } from './workout'

const base: Profile = { sex: 'm', age: 25, height: 180, weight: 80, activity: 1.55, goal: 'maintain', rate: 0.5, experience: 'początkujący' }

describe('kalkulator', () => {
  it('Mifflin-St Jeor', () => {
    expect(bmr(base)).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 25 + 5)
    expect(bmr({ ...base, sex: 'f' })).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 25 - 161)
  })
  it('Katch-McArdle przy podanym % tłuszczu', () => {
    expect(bmr({ ...base, bodyFat: 15 })).toBeCloseTo(370 + 21.6 * 68)
  })
  it('redukcja 0,5%/tydz. daje deficyt ok. 440 kcal i białko 2,2 g/kg', () => {
    const m = computeTargets(base)
    const c = computeTargets({ ...base, goal: 'cut', rate: 0.5 })
    expect(m.kcal - c.kcal).toBeGreaterThan(420)
    expect(m.kcal - c.kcal).toBeLessThan(460)
    expect(c.p).toBe(176)
    expect(c.p * 4 + c.f * 9 + c.c * 4).toBeGreaterThan(c.kcal - 15)
  })
  it('nie schodzi poniżej minimum kalorii', () => {
    const t = computeTargets({ ...base, sex: 'f', weight: 50, height: 155, activity: 1.2, goal: 'cut', rate: 1 })
    expect(t.kcal).toBeGreaterThanOrEqual(1200)
  })
  it('adaptacyjne TDEE: stała waga = średnie spożycie', () => {
    const days = Array(14).fill(2500)
    const w = [0, 3, 7, 10, 13].map((day) => ({ day, weight: 80 }))
    expect(adaptiveTdee(days, w)).toBe(2500)
    const losing = [0, 7, 14, 21].map((day) => ({ day, weight: 80 - day * (0.5 / 7) }))
    expect(adaptiveTdee(days, losing)).toBe(3050)
  })
})

function we(sets: [number, number][]): WorkoutExercise {
  return { exerciseId: 'bench-press', restSec: 120, sets: sets.map(([w, r]) => ({ w, r, done: true })) }
}

describe('progresja', () => {
  const bench = EXERCISE_MAP.get('bench-press')!
  it('e1RM Epley', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1)
  })
  it('wszystkie serie na górze zakresu → więcej ciężaru', () => {
    const s = suggest(bench, 6, 10, [we([[80, 10], [80, 10], [80, 10]])])
    expect(s.kind).toBe('increase')
    expect(s.weight).toBe(82.5)
  })
  it('w środku zakresu → dołóż powtórzenie', () => {
    const s = suggest(bench, 6, 10, [we([[80, 8], [80, 7], [80, 7]])])
    expect(s.kind).toBe('reps')
    expect(s.weight).toBe(80)
    expect(s.reps).toBe(8)
  })
  it('dwa razy poniżej zakresu → zmniejsz ciężar', () => {
    const s = suggest(bench, 6, 10, [we([[80, 4], [80, 4]]), we([[80, 5], [80, 4]])])
    expect(s.kind).toBe('decrease')
    expect(s.weight).toBe(72.5)
  })
  it('brak historii → instrukcja startowa', () => {
    expect(suggest(bench, 6, 10, []).kind).toBe('start')
  })
})

describe('statystyki', () => {
  const w = (id: number, ex: WorkoutExercise[], day = 'a', planId = 1): Workout => ({ id, name: 'x', date: '2026-10-1' + id, startedAt: id, finishedAt: id + 1, exercises: ex, planId, dayId: day })
  it('serie tygodniowe: główne 1, pomocnicze 0,5, bez rozgrzewek', () => {
    const ex = we([[80, 8], [80, 8]])
    ex.sets.push({ w: 40, r: 10, done: true, warmup: true })
    const s = weeklySets([w(1, [ex])])
    expect(s.chest).toBe(2)
    expect(s.shoulders).toBe(1)
    expect(s.triceps).toBe(1)
  })
  it('historia ćwiczenia od najnowszych', () => {
    const h = exerciseHistory([w(1, [we([[60, 8]])]), w(2, [we([[62.5, 8]])])], 'bench-press')
    expect(h[0].we.sets[0].w).toBe(62.5)
  })
  it('następny dzień planu', () => {
    const plan = { id: 1, name: 'p', createdAt: 0, days: [{ id: 'a', name: 'A', exercises: [] }, { id: 'b', name: 'B', exercises: [] }] }
    expect(nextDay(plan, [])?.id).toBe('a')
    expect(nextDay(plan, [w(1, [], 'a')])?.id).toBe('b')
    expect(nextDay(plan, [w(1, [], 'a'), w(2, [], 'b')])?.id).toBe('a')
  })
})
