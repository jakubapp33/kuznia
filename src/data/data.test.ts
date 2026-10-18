import { describe, expect, it } from 'vitest'
import { EXERCISES, EXERCISE_MAP } from './exercises'
import { LOCAL_FOODS } from './foods'
import { MUSCLES } from './muscles'
import { TEMPLATES } from './plans'

describe('baza ćwiczeń', () => {
  it('ma ok. 150 ćwiczeń z unikalnymi id', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(140)
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
  })
  it('każde ćwiczenie ma poprawne mięśnie, nazwy PL/EN i technikę', () => {
    for (const e of EXERCISES) {
      expect(e.pl, e.id).toBeTruthy()
      expect(e.en, e.id).toBeTruthy()
      expect(e.primary.length, e.id).toBeGreaterThan(0)
      for (const m of [...e.primary, ...e.secondary]) expect(MUSCLES[m], `${e.id}: ${m}`).toBeTruthy()
      expect(e.primary.some((m) => e.secondary.includes(m)), e.id).toBe(false)
      expect(e.steps.filter(Boolean).length, e.id).toBeGreaterThan(0)
    }
  })
  it('plany używają istniejących ćwiczeń', () => {
    for (const t of TEMPLATES) for (const d of t.days) for (const pe of d.exercises) {
      expect(EXERCISE_MAP.has(pe.exerciseId), `${t.id}/${pe.exerciseId}`).toBe(true)
      expect(pe.repMin).toBeLessThanOrEqual(pe.repMax)
    }
  })
})

describe('baza produktów', () => {
  it('kalorie zgadzają się z makro (±20%) i id są unikalne', () => {
    expect(new Set(LOCAL_FOODS.map((f) => f.id)).size).toBe(LOCAL_FOODS.length)
    const bad: string[] = []
    for (const f of LOCAL_FOODS) {
      // alkohol (7 kcal/g) i błonnik zaburzają bilans – pomijamy piwo
      if (f.name.startsWith('Piwo')) continue
      // błonnik ok. 2 kcal/g, w tabelach często wliczony do węglowodanów
      const fib = f.fiber ?? 0
      const calc = f.p * 4 + f.f * 9 + (f.c - fib) * 4 + fib * 2
      const calcAlt = f.p * 4 + f.f * 9 + f.c * 4
      const err = Math.min(Math.abs(calc - f.kcal), Math.abs(calcAlt - f.kcal)) / f.kcal
      bad.push(...(err >= 0.2 ? [`${f.name}: ${Math.round(calc)} vs ${f.kcal}`] : []))
    }
    expect(bad).toEqual([])
  })
})
