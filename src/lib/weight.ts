import type { BodyEntry, Profile } from '../types'
import { addDays, daysBetween, num, weekStart } from './format'
import { weightSlope } from './nutrition'

export interface WeekAvg {
  ws: string
  avg?: number
  n: number
}

/** średnia masa ciała w kolejnych tygodniach (pon–ndz), najstarszy pierwszy */
export function weeklyAverages(entries: BodyEntry[], today: string, weeks = 8): WeekAvg[] {
  const first = addDays(weekStart(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, i) => {
    const ws = addDays(first, i * 7)
    const we = addDays(ws, 7)
    const xs = entries.filter((e) => e.weight && e.date >= ws && e.date < we).map((e) => e.weight!)
    return { ws, n: xs.length, avg: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined }
  })
}

export interface Verdict {
  tone: 'good' | 'warn' | 'info'
  title: string
  text: string
}

export interface WeightTrend {
  perWeekKg: number
  perWeekPct: number
  days: number
  points: number
  /** zmiana średniej z ostatnich 7 dni względem średniej sprzed 4 tygodni */
  change4w?: number
  verdict: Verdict
}

function kg(x: number) {
  return `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x), 2)} kg`
}

/** trend z ostatnich 4 tygodni (regresja liniowa – odporna na dzienne wahania wody) */
export function analyzeWeight(entries: BodyEntry[], today: string, profile?: Profile): WeightTrend | undefined {
  const from = addDays(today, -28)
  const recent = entries.filter((e) => e.weight && e.date > from && e.date <= today)
  if (recent.length < 5) return undefined
  const span = daysBetween(recent[0].date, recent[recent.length - 1].date)
  if (span < 10) return undefined
  const slope = weightSlope(recent.map((e) => ({ day: daysBetween(from, e.date), weight: e.weight! })))
  if (slope === undefined) return undefined
  const avgW = recent.reduce((s, e) => s + e.weight!, 0) / recent.length
  const perWeekKg = slope * 7
  const perWeekPct = (perWeekKg / avgW) * 100

  const avgIn = (a: string, b: string) => {
    const xs = entries.filter((e) => e.weight && e.date > a && e.date <= b).map((e) => e.weight!)
    return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : undefined
  }
  const now = avgIn(addDays(today, -7), today)
  const then = avgIn(addDays(today, -35), addDays(today, -28))
  const change4w = now !== undefined && then !== undefined ? now - then : undefined

  const rate = `${kg(perWeekKg)} tygodniowo (${perWeekPct > 0 ? '+' : ''}${num(perWeekPct, 2)}% masy ciała)`
  let verdict: Verdict
  if (!profile) {
    verdict = { tone: 'info', title: 'Trend wagi', text: `Zmieniasz się o ${rate}. Ustaw cel w zakładce Dieta, a ocenię, czy to dobre tempo.` }
  } else if (profile.goal === 'cut') {
    const target = -profile.rate
    if (perWeekPct > -0.1) {
      verdict = { tone: 'warn', title: 'Waga stoi', text: `Trend: ${rate}. Jeśli tak jest od 2–3 tygodni, zmniejsz kalorie o 100–200 kcal albo dodaj ok. 2000 kroków dziennie.` }
    } else if (perWeekPct < target * 1.6 && perWeekPct < -0.75) {
      verdict = { tone: 'warn', title: 'Chudniesz szybciej niż w planie', text: `Trend: ${rate}, plan to ${num(-target, 2)}%. Dodaj 100–200 kcal, żeby lepiej chronić mięśnie i siłę.` }
    } else {
      verdict = { tone: 'good', title: 'Redukcja idzie zgodnie z planem', text: `Trend: ${rate}. Tak trzymaj – nie zmieniaj kalorii.` }
    }
  } else if (profile.goal === 'bulk') {
    const target = profile.rate / 4.33
    if (perWeekPct < 0.05) {
      verdict = { tone: 'warn', title: 'Waga nie rośnie', text: `Trend: ${rate}. Przy budowaniu masy dodaj 100–200 kcal dziennie (np. większa porcja węglowodanów).` }
    } else if (perWeekPct > target * 2 + 0.1) {
      verdict = { tone: 'warn', title: 'Rośniesz szybciej niż w planie', text: `Trend: ${rate}. Nadmiar idzie głównie w tłuszcz – odejmij 100–200 kcal.` }
    } else {
      verdict = { tone: 'good', title: 'Masa rośnie w dobrym tempie', text: `Trend: ${rate}. To tempo sprzyja budowie mięśni przy małym przyroście tłuszczu.` }
    }
  } else {
    verdict = Math.abs(perWeekPct) <= 0.2
      ? { tone: 'good', title: 'Waga stabilna', text: `Trend: ${rate} – utrzymujesz wagę zgodnie z celem.` }
      : { tone: 'info', title: perWeekPct > 0 ? 'Waga lekko rośnie' : 'Waga lekko spada', text: `Trend: ${rate}. Jeśli chcesz utrzymać wagę, skoryguj kalorie o ok. 100–150 kcal.` }
  }
  return { perWeekKg, perWeekPct, days: span, points: recent.length, change4w, verdict }
}
