import type { DayLog, Exercise, FoodLogEntry, Workout } from '../types'
import { addDays, daysBetween, num } from './format'
import { e1rm, workingSets } from './progression'

/**
 * Wynik treningu: średnia zmiana (%) najlepszej serii każdego ćwiczenia względem mediany
 * z 2–5 poprzednich sesji tego ćwiczenia. Porównanie z „Twoją ostatnią normą” usuwa
 * naturalny wzrost siły w czasie, więc zostaje to, czy dany dzień był lepszy czy gorszy.
 */
export function workoutScores(workouts: Workout[], exMap: Map<string, Exercise>): Map<number, number> {
  const done = workouts.filter((w) => w.finishedAt && w.id !== undefined).sort((a, b) => a.startedAt - b.startedAt)
  const history = new Map<string, number[]>()
  const scores = new Map<number, number>()
  for (const w of done) {
    const ratios: number[] = []
    for (const we of w.exercises) {
      const ex = exMap.get(we.exerciseId)
      if (!ex || ex.load === 'cardio') continue
      const sets = workingSets(we)
      if (!sets.length) continue
      const weighted = sets.some((s) => s.w)
      const metric = weighted
        ? Math.max(...sets.map((s) => ((s.r ?? 0) <= 15 ? e1rm(s.w ?? 0, s.r ?? 0) : s.w ?? 0)))
        : Math.max(...sets.map((s) => (ex.load === 'time' ? s.t ?? 0 : s.r ?? 0)))
      if (!metric) continue
      const key = we.exerciseId + (weighted ? ':w' : ':r')
      const prev = history.get(key) ?? []
      if (prev.length >= 2) {
        const recent = prev.slice(-5).sort((a, b) => a - b)
        const median = recent[Math.floor(recent.length / 2)]
        if (median > 0) ratios.push(Math.max(-0.3, Math.min(0.3, metric / median - 1)))
      }
      history.set(key, [...prev, metric])
    }
    if (ratios.length) scores.set(w.id!, (ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100)
  }
  return scores
}

export interface Factors {
  sleepH?: number
  sleepQ?: number
  energy?: number
  water?: number
  preCarbs?: number
  preProtein?: number
  mealGapH?: number
  hour: number
  restDays?: number
  prevDayKcal?: number
  prevSteps?: number
}

function minutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function workoutFactors(w: Workout, food: FoodLogEntry[], days: Map<string, DayLog>, prev?: Workout): Factors {
  const start = new Date(w.startedAt)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const day = days.get(w.date)
  const todays = food.filter((f) => f.date === w.date)
  const timed = todays.filter((f) => f.time)
  const f: Factors = {
    sleepH: day?.sleepH,
    sleepQ: day?.sleepQ,
    energy: day?.energy,
    water: day?.water,
    hour: start.getHours(),
  }
  if (timed.length) {
    const before = timed.filter((x) => minutes(x.time!) <= startMin)
    const window = before.filter((x) => startMin - minutes(x.time!) <= 240)
    f.preCarbs = window.reduce((s, x) => s + x.c, 0)
    f.preProtein = window.reduce((s, x) => s + x.p, 0)
    const last = Math.max(-1, ...before.map((x) => minutes(x.time!)))
    f.mealGapH = last >= 0 ? (startMin - last) / 60 : undefined
  }
  if (prev) f.restDays = Math.min(7, daysBetween(prev.date, w.date))
  const y = food.filter((x) => x.date === addDays(w.date, -1)).reduce((s, x) => s + x.kcal, 0)
  if (y >= 800) f.prevDayKcal = y
  const pd = days.get(addDays(w.date, -1))
  if (pd?.steps) f.prevSteps = pd.steps
  return f
}

export interface Insight {
  id: string
  text: string
  better: boolean
  diff: number
  nA: number
  nB: number
  strength: 'wyraźna' | 'możliwa'
}

interface Sample {
  score: number
  f: Factors
}

function stats(xs: number[]) {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1)
  return { m, v, n: xs.length }
}

/** test Welcha dla dwóch grup – zwraca różnicę średnich i statystykę t */
function compare(a: number[], b: number[]) {
  const A = stats(a)
  const B = stats(b)
  const se = Math.sqrt(A.v / A.n + B.v / B.n) || 1e-9
  return { diff: A.m - B.m, t: (A.m - B.m) / se }
}

interface Rule {
  id: string
  get: (f: Factors) => number | undefined
  thresholds: number[]
  /** opis grupy „wysokiej” (≥ próg) i „niskiej” */
  hi: (t: number) => string
  lo: (t: number) => string
}

const RULES: Rule[] = [
  { id: 'sleep', get: (f) => f.sleepH, thresholds: [6, 7, 8], hi: (t) => `po nocy z co najmniej ${t} h snu`, lo: (t) => `po nocy z mniej niż ${t} h snu` },
  { id: 'sleepQ', get: (f) => f.sleepQ, thresholds: [4], hi: () => 'po dobrze przespanej nocy (jakość 4–5)', lo: () => 'po gorzej przespanej nocy' },
  { id: 'carbs', get: (f) => f.preCarbs, thresholds: [30, 50, 80], hi: (t) => `gdy w ciągu 4 h przed treningiem zjesz co najmniej ${t} g węglowodanów`, lo: (t) => `gdy przed treningiem zjesz mniej niż ${t} g węglowodanów` },
  { id: 'protein', get: (f) => f.preProtein, thresholds: [20, 30], hi: (t) => `gdy w ciągu 4 h przed treningiem zjesz co najmniej ${t} g białka`, lo: (t) => `gdy przed treningiem zjesz mniej niż ${t} g białka` },
  { id: 'gap', get: (f) => (f.mealGapH === undefined ? (f.preCarbs !== undefined ? 12 : undefined) : f.mealGapH), thresholds: [2, 3], hi: (t) => `gdy ostatni posiłek był ponad ${t} h przed treningiem (lub na czczo)`, lo: (t) => `gdy jesz posiłek w ciągu ${t} h przed treningiem` },
  { id: 'rest', get: (f) => f.restDays, thresholds: [2, 3], hi: (t) => `po co najmniej ${t} dniach przerwy od poprzedniego treningu`, lo: (t) => `gdy trenujesz po krótszej przerwie niż ${t} dni` },
  { id: 'water', get: (f) => f.water, thresholds: [1500, 2000, 2500], hi: (t) => `w dni, gdy wypijesz co najmniej ${num(t / 1000)} l wody`, lo: (t) => `w dni, gdy wypijesz mniej niż ${num(t / 1000)} l wody` },
  { id: 'energy', get: (f) => f.energy, thresholds: [4], hi: () => 'gdy oceniasz energię na 4–5', lo: () => 'gdy oceniasz energię na 1–3' },
  { id: 'steps', get: (f) => f.prevSteps, thresholds: [8000, 12000, 15000], hi: (t) => `gdy dzień wcześniej zrobisz co najmniej ${t.toLocaleString('pl-PL')} kroków`, lo: (t) => `gdy dzień wcześniej zrobisz mniej niż ${t.toLocaleString('pl-PL')} kroków` },
  { id: 'kcal', get: (f) => f.prevDayKcal, thresholds: [], hi: (t) => `gdy dzień wcześniej zjesz co najmniej ${Math.round(t)} kcal`, lo: (t) => `gdy dzień wcześniej zjesz mniej niż ${Math.round(t)} kcal` },
]

const DAYPARTS = [
  { id: 'rano', test: (h: number) => h < 12, label: 'rano (przed 12:00)' },
  { id: 'popoludnie', test: (h: number) => h >= 12 && h < 17, label: 'po południu (12–17)' },
  { id: 'wieczor', test: (h: number) => h >= 17, label: 'wieczorem (po 17:00)' },
]

const MIN_GROUP = 3

function describe(diff: number, nA: number, nB: number, t: number, id: string, phrase: string): Insight {
  const better = diff > 0
  return {
    id,
    better,
    diff,
    nA,
    nB,
    strength: Math.abs(t) >= 2.5 ? 'wyraźna' : 'możliwa',
    text: `${phrase[0].toUpperCase()}${phrase.slice(1)} Twoje wyniki są średnio o ${num(Math.abs(diff))}% ${better ? 'lepsze' : 'słabsze'}.`,
  }
}

export interface Analysis {
  insights: Insight[]
  scored: number
  samples: Sample[]
}

export const MIN_WORKOUTS = 8

export function analyze(workouts: Workout[], food: FoodLogEntry[], days: DayLog[], exMap: Map<string, Exercise>): Analysis {
  const scores = workoutScores(workouts, exMap)
  const dayMap = new Map(days.map((d) => [d.date, d]))
  const done = workouts.filter((w) => w.finishedAt).sort((a, b) => a.startedAt - b.startedAt)
  const samples: Sample[] = []
  done.forEach((w, i) => {
    const s = scores.get(w.id!)
    if (s === undefined) return
    samples.push({ score: s, f: workoutFactors(w, food, dayMap, done[i - 1]) })
  })
  const insights: Insight[] = []
  if (samples.length < MIN_WORKOUTS) return { insights, scored: samples.length, samples }

  for (const rule of RULES) {
    const vals = samples.map((s) => ({ v: rule.get(s.f), score: s.score })).filter((x): x is { v: number; score: number } => x.v !== undefined)
    if (vals.length < MIN_GROUP * 2) continue
    let ths = rule.thresholds
    if (!ths.length) {
      const sorted = vals.map((x) => x.v).sort((a, b) => a - b)
      ths = [sorted[Math.floor(sorted.length / 2)]]
    }
    let best: { t: number; diff: number; th: number; nA: number; nB: number } | undefined
    for (const th of ths) {
      const a = vals.filter((x) => x.v >= th).map((x) => x.score)
      const b = vals.filter((x) => x.v < th).map((x) => x.score)
      if (a.length < MIN_GROUP || b.length < MIN_GROUP) continue
      const c = compare(a, b)
      if (!best || Math.abs(c.t) > Math.abs(best.t)) best = { ...c, th, nA: a.length, nB: b.length }
    }
    if (!best || Math.abs(best.t) < 1.5 || Math.abs(best.diff) < 1.5) continue
    // opisujemy grupę, w której wyniki są lepsze
    const phrase = best.diff > 0 ? rule.hi(best.th) : rule.lo(best.th)
    insights.push(describe(Math.abs(best.diff), best.diff > 0 ? best.nA : best.nB, best.diff > 0 ? best.nB : best.nA, best.t, rule.id, phrase + ','))
  }

  // pora dnia: każda pora kontra pozostałe
  let bestPart: { t: number; diff: number; label: string; nA: number; nB: number } | undefined
  for (const p of DAYPARTS) {
    const a = samples.filter((s) => p.test(s.f.hour)).map((s) => s.score)
    const b = samples.filter((s) => !p.test(s.f.hour)).map((s) => s.score)
    if (a.length < MIN_GROUP || b.length < MIN_GROUP) continue
    const c = compare(a, b)
    if (c.diff > 0 && (!bestPart || c.t > bestPart.t)) bestPart = { ...c, label: p.label, nA: a.length, nB: b.length }
  }
  if (bestPart && bestPart.t >= 1.5 && bestPart.diff >= 1.5) {
    insights.push(describe(bestPart.diff, bestPart.nA, bestPart.nB, bestPart.t, 'daypart', `gdy trenujesz ${bestPart.label},`))
  }

  insights.sort((a, b) => (a.strength === b.strength ? b.diff - a.diff : a.strength === 'wyraźna' ? -1 : 1))
  return { insights, scored: samples.length, samples }
}

/** ile treningów ma zapisany dany czynnik – do pokazania, czego brakuje */
export function coverage(samples: Sample[]) {
  const c = (fn: (f: Factors) => unknown) => samples.filter((s) => fn(s.f) !== undefined).length
  return {
    sleep: c((f) => f.sleepH),
    food: c((f) => f.preCarbs),
    water: c((f) => f.water),
    energy: c((f) => f.energy),
  }
}
