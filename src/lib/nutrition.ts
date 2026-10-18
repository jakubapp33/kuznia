import type { MacroTargets, Profile } from '../types'

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Siedzący tryb życia', hint: 'praca przy biurku, mało ruchu, brak treningów' },
  { value: 1.375, label: 'Lekka aktywność', hint: '1–3 treningi w tygodniu lub ok. 5–7 tys. kroków dziennie' },
  { value: 1.55, label: 'Umiarkowana aktywność', hint: '3–5 treningów w tygodniu, ok. 8–10 tys. kroków' },
  { value: 1.725, label: 'Wysoka aktywność', hint: '6–7 treningów w tygodniu lub dużo chodzenia' },
  { value: 1.9, label: 'Bardzo wysoka', hint: 'praca fizyczna + regularne treningi' },
]

export const CUT_RATES = [
  { value: 0.25, label: 'Powoli', hint: '~0,25% masy ciała / tydz. – najlepsze utrzymanie mięśni, gdy jesteś już szczupły' },
  { value: 0.5, label: 'Optymalnie', hint: '~0,5% masy ciała / tydz. – zalecane dla większości' },
  { value: 0.75, label: 'Szybciej', hint: '~0,75% / tydz. – przy wyższym poziomie tkanki tłuszczowej' },
  { value: 1, label: 'Agresywnie', hint: '~1% / tydz. – tylko krótko i przy dużej nadwadze' },
]

export const BULK_RATES = [
  { value: 0.5, label: 'Czysto', hint: '~0,5% masy ciała / mies. – dla średniozaawansowanych i zaawansowanych' },
  { value: 1, label: 'Standardowo', hint: '~1% / mies. – dobry wybór dla początkujących' },
  { value: 1.5, label: 'Szybciej', hint: '~1,5% / mies. – zaczynasz, jesteś szczupły; więcej tłuszczu po drodze' },
]

/** kcal w 1 kg masy ciała (tkanka tłuszczowa ~7700 kcal) */
const KCAL_PER_KG = 7700

export function bmr(p: Profile): number {
  if (p.bodyFat && p.bodyFat > 3 && p.bodyFat < 60) {
    // Katch-McArdle – dokładniejszy, gdy znamy beztłuszczową masę ciała
    const lbm = p.weight * (1 - p.bodyFat / 100)
    return 370 + 21.6 * lbm
  }
  // Mifflin-St Jeor – najdokładniejszy wzór populacyjny bez pomiaru składu ciała
  return 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161)
}

export function tdee(p: Profile): number {
  return bmr(p) * p.activity
}

/** zmiana kcal dziennie względem TDEE wynikająca z celu */
export function goalAdjustment(p: Profile): number {
  if (p.goal === 'cut') return -(p.weight * (p.rate / 100) * KCAL_PER_KG) / 7
  if (p.goal === 'bulk') return Math.min(500, (p.weight * (p.rate / 100) * KCAL_PER_KG) / 30)
  return 0
}

/** masa referencyjna do białka – przy otyłości liczymy z masy przy BMI 25, a nie z całkowitej */
export function proteinReferenceWeight(p: Profile): number {
  const bmi = p.weight / (p.height / 100) ** 2
  if (bmi > 30) return 25 * (p.height / 100) ** 2
  return p.weight
}

export function proteinPerKg(p: Profile): number {
  // 1,6–2,2 g/kg maksymalizuje przyrost masy; na redukcji wyższa podaż chroni mięśnie
  if (p.goal === 'cut') return 2.2
  return 1.8
}

export interface TargetBreakdown extends MacroTargets {
  bmr: number
  tdee: number
  adjustment: number
  minKcal: number
  warnings: string[]
}

export function computeTargets(p: Profile): TargetBreakdown {
  const b = bmr(p)
  const t = b * p.activity
  const adj = goalAdjustment(p)
  const minKcal = p.sex === 'm' ? 1500 : 1200
  const warnings: string[] = []
  let kcal = t + adj
  if (kcal < minKcal) {
    warnings.push(`Wyliczony cel był poniżej ${minKcal} kcal – podniesiono go do bezpiecznego minimum. Rozważ wolniejsze tempo.`)
    kcal = minKcal
  }
  kcal = Math.round(kcal / 10) * 10

  const protein = Math.round(proteinReferenceWeight(p) * proteinPerKg(p))
  // tłuszcze: ok. 25% energii, ale nie mniej niż 0,6 g/kg (gospodarka hormonalna)
  let fat = Math.max(Math.round((kcal * 0.25) / 9), Math.round(p.weight * 0.6))
  let carbs = Math.round((kcal - protein * 4 - fat * 9) / 4)
  if (carbs < 50) {
    warnings.push('Przy tak niskiej kaloryczności węglowodany są bardzo niskie – trening może być trudniejszy.')
    carbs = Math.max(carbs, 0)
    fat = Math.max(Math.round((kcal - protein * 4 - carbs * 4) / 9), 0)
  }
  if (p.age < 18) warnings.push('Masz mniej niż 18 lat – nie stosuj dużych deficytów. Rośniesz, więc priorytetem jest wystarczająca ilość energii.')
  const fiber = Math.round((kcal / 1000) * 14)
  return { kcal, p: protein, f: fat, c: carbs, fiber, bmr: Math.round(b), tdee: Math.round(t), adjustment: Math.round(adj), minKcal, warnings }
}

/** prędkość zmiany masy ciała – regresja liniowa, kg/dzień */
export function weightSlope(points: { day: number; weight: number }[]): number | undefined {
  if (points.length < 4) return undefined
  const n = points.length
  const mx = points.reduce((s, q) => s + q.day, 0) / n
  const my = points.reduce((s, q) => s + q.weight, 0) / n
  let num = 0
  let den = 0
  for (const q of points) {
    num += (q.day - mx) * (q.weight - my)
    den += (q.day - mx) ** 2
  }
  if (den === 0) return undefined
  return num / den
}

/**
 * Rzeczywiste zapotrzebowanie z danych: średnie spożycie minus energia zmagazynowana/utracona
 * (zmiana masy × 7700 kcal). Wymaga min. 10 dni z wpisanym jedzeniem i 4 pomiarów wagi w ciągu 14–28 dni.
 */
export function adaptiveTdee(dailyKcal: number[], weights: { day: number; weight: number }[]): number | undefined {
  if (dailyKcal.length < 10) return undefined
  const slope = weightSlope(weights)
  if (slope === undefined) return undefined
  const avg = dailyKcal.reduce((a, b) => a + b, 0) / dailyKcal.length
  return Math.round((avg - slope * KCAL_PER_KG) / 10) * 10
}

export function macroKcal(m: { p: number; f: number; c: number }) {
  return m.p * 4 + m.f * 9 + m.c * 4
}
