import type { Food, FoodLogEntry, Micro } from '../types'

const r = (x: number) => Math.round(x * 100) / 100

/** wartości dla porcji w gramach (do zapisu w dzienniku) */
export function scaleFood(food: Food, grams: number) {
  const k = grams / 100
  const opt = (v: number | undefined) => (v === undefined ? undefined : r(v * k))
  let micro: Micro | undefined
  if (food.micro) {
    micro = {}
    for (const [key, v] of Object.entries(food.micro)) micro[key] = r(v * k)
  }
  return {
    kcal: food.kcal * k, p: food.p * k, f: food.f * k, c: food.c * k,
    fiber: opt(food.fiber), sugar: opt(food.sugar), satFat: opt(food.satFat), salt: opt(food.salt), micro,
  }
}

/** przeskalowanie istniejącego wpisu (zmiana gramatury) */
export function rescaleEntry(e: FoodLogEntry, factor: number): Partial<FoodLogEntry> {
  const opt = (v: number | undefined) => (v === undefined ? undefined : r(v * factor))
  let micro: Micro | undefined
  if (e.micro) {
    micro = {}
    for (const [key, v] of Object.entries(e.micro)) micro[key] = r(v * factor)
  }
  return {
    kcal: e.kcal * factor, p: e.p * factor, f: e.f * factor, c: e.c * factor,
    fiber: opt(e.fiber), sugar: opt(e.sugar), satFat: opt(e.satFat), salt: opt(e.salt), micro,
  }
}

export interface DayTotals {
  kcal: number
  p: number
  f: number
  c: number
  fiber: number
  sugar: number
  satFat: number
  salt: number
  micro: Micro
  /** ile wpisów ma dane o mikroskładnikach */
  withMicro: number
  count: number
}

export function totals(list: FoodLogEntry[]): DayTotals {
  const t: DayTotals = { kcal: 0, p: 0, f: 0, c: 0, fiber: 0, sugar: 0, satFat: 0, salt: 0, micro: {}, withMicro: 0, count: list.length }
  for (const e of list) {
    t.kcal += e.kcal
    t.p += e.p
    t.f += e.f
    t.c += e.c
    t.fiber += e.fiber ?? 0
    t.sugar += e.sugar ?? 0
    t.satFat += e.satFat ?? 0
    t.salt += e.salt ?? 0
    if (e.micro && Object.keys(e.micro).length > 1) t.withMicro++
    for (const [k, v] of Object.entries(e.micro ?? {})) t.micro[k] = (t.micro[k] ?? 0) + v
  }
  return t
}

export function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** typowa godzina posiłku, gdy dodajesz wpis do innego dnia */
export const MEAL_TIMES = ['08:00', '11:00', '14:00', '19:00', '16:30']
