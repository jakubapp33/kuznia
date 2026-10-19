import type { BodyEntry, DayLog, FoodLogEntry, Profile } from '../types'
import { addDays, num } from './format'
import { bmr } from './nutrition'
import { analyzeWeight, type Verdict } from './weight'

const KCAL_PER_KG = 7700

export interface EnergyDay {
  date: string
  eaten: number
  burned: number
  balance: number
  /** spoczynkowe oszacowane wzorem, bo nie wpisano ich z zegarka */
  estRest: boolean
}

/** spalone kcal danego dnia: spoczynkowe (z zegarka lub wzoru) + aktywne */
export function burnedOf(d: DayLog | undefined, profile?: Profile): { kcal: number; est: boolean } | undefined {
  if (!d || (!d.kcalRest && !d.kcalActive)) return undefined
  if (d.kcalRest) return { kcal: d.kcalRest + (d.kcalActive ?? 0), est: false }
  if (!profile) return undefined
  return { kcal: bmr(profile) + (d.kcalActive ?? 0), est: true }
}

export function energyDays(food: FoodLogEntry[], days: DayLog[], from: string, to: string, profile?: Profile): EnergyDay[] {
  const eaten = new Map<string, number>()
  for (const f of food) if (f.date >= from && f.date <= to) eaten.set(f.date, (eaten.get(f.date) ?? 0) + f.kcal)
  const out: EnergyDay[] = []
  for (const d of days) {
    if (d.date < from || d.date > to) continue
    const e = eaten.get(d.date) ?? 0
    const b = burnedOf(d, profile)
    // dzień z prawie pustym dziennikiem jedzenia zafałszowałby średnią
    if (!b || e < 800) continue
    out.push({ date: d.date, eaten: e, burned: b.kcal, balance: e - b.kcal, estRest: b.est })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export interface EnergyAnalysis {
  n: number
  avgEaten: number
  avgBurned: number
  avgBalance: number
  avgSteps?: number
  stepsDays: number
  /** bilans wynikający ze zmiany wagi (kcal/dzień) */
  fromWeight?: number
  perWeekKg?: number
  verdict?: Verdict
}

function signed(kcal: number) {
  return `${Math.round(Math.abs(kcal))} kcal`
}

/** bilans z ostatnich 14 pełnych dni (bez dzisiejszego, bo jeszcze trwa) */
export function analyzeEnergy(food: FoodLogEntry[], days: DayLog[], body: BodyEntry[], today: string, profile?: Profile): EnergyAnalysis {
  const from = addDays(today, -14)
  const to = addDays(today, -1)
  const ed = energyDays(food, days, from, to, profile)
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
  const steps = days.filter((d) => d.steps && d.date >= from && d.date <= to).map((d) => d.steps!)
  const trend = analyzeWeight(body, today, profile)
  const res: EnergyAnalysis = {
    n: ed.length,
    avgEaten: avg(ed.map((d) => d.eaten)),
    avgBurned: avg(ed.map((d) => d.burned)),
    avgBalance: avg(ed.map((d) => d.balance)),
    avgSteps: steps.length ? avg(steps) : undefined,
    stepsDays: steps.length,
    perWeekKg: trend?.perWeekKg,
    fromWeight: trend ? (trend.perWeekKg * KCAL_PER_KG) / 7 : undefined,
  }

  const tendency = trend
    ? Math.abs(trend.perWeekKg) < 0.1
      ? 'Waga jest stabilna'
      : `Waga ma tendencję ${trend.perWeekKg < 0 ? 'spadkową' : 'wzrostową'} (${trend.perWeekKg > 0 ? '+' : '−'}${num(Math.abs(trend.perWeekKg), 2)} kg/tydz.)`
    : undefined

  if (ed.length >= 4) {
    const b = res.avgBalance
    const kind = Math.abs(b) < 100 ? 'balance' : b < 0 ? 'deficit' : 'surplus'
    const title = kind === 'balance' ? 'Jesz mniej więcej tyle, ile spalasz' : kind === 'deficit' ? `Średni deficyt ok. ${signed(b)} dziennie` : `Średnia nadwyżka ok. ${signed(b)} dziennie`
    const predicted = (b * 7) / KCAL_PER_KG
    let text = `Z ${ed.length} dni z zapisanym jedzeniem i spalaniem: zjadasz średnio ${Math.round(res.avgEaten)} kcal, spalasz ${Math.round(res.avgBurned)} kcal.`
    if (kind !== 'balance') text += ` To odpowiada zmianie ok. ${predicted > 0 ? '+' : '−'}${num(Math.abs(predicted), 2)} kg tygodniowo.`
    let tone: Verdict['tone'] = 'info'
    if (res.fromWeight !== undefined) {
      const gap = b - res.fromWeight
      text += ` ${tendency}, co odpowiada ${res.fromWeight < -100 ? `deficytowi ok. ${signed(res.fromWeight)}` : res.fromWeight > 100 ? `nadwyżce ok. ${signed(res.fromWeight)}` : 'bilansowi bliskiemu zera'} dziennie.`
      if (Math.abs(gap) <= 250) {
        text += ' Dane z zegarka zgadzają się z wagą 👍'
        tone = 'good'
      } else if (gap < 0) {
        text += ' Waga spada wolniej, niż wynika z liczb – zegarki zwykle zawyżają spalone kalorie, a część jedzenia łatwo pominąć. Przy decyzjach bardziej ufaj trendowi wagi.'
        tone = 'warn'
      } else {
        text += ' Waga spada szybciej, niż wynika z liczb – możliwe, że zegarek zaniża spalanie albo przeszacowujesz porcje. Bardziej ufaj trendowi wagi.'
        tone = 'warn'
      }
    } else {
      text += ' Waż się regularnie, a sprawdzę, czy waga to potwierdza – zegarki często zawyżają spalanie o 10–30%.'
    }
    res.verdict = { tone, title, text }
  } else if (trend) {
    res.verdict = {
      tone: 'info',
      title: tendency!,
      text: `Ze zmiany wagi wynika ${res.fromWeight! < -100 ? `średni deficyt ok. ${signed(res.fromWeight!)}` : res.fromWeight! > 100 ? `średnia nadwyżka ok. ${signed(res.fromWeight!)}` : 'bilans bliski zera'} dziennie. Wpisuj spalone kalorie z zegarka (min. 4 dni), a porównam to z jedzeniem.`,
    }
  }
  return res
}
