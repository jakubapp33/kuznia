import { EXTRA_FOODS } from './foods-extra'
import { unitLabel, unitsFor } from '../lib/units'
import { norm, queryStems, searchExercises, stem, textScore } from '../lib/search'
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
      if (/^(Piwo|Wino|Wódka|Whisky|Cydr)/.test(f.name) || f.kcal < 5) continue
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

const EXTRA_IDS = new Set(EXTRA_FOODS.map((f) => f.id))

describe('szczegóły produktów lokalnych', () => {
  it('każdy produkt ma cukry, tłuszcze nasycone, sól i mikroskładniki', () => {
    for (const f of LOCAL_FOODS.filter((x) => !EXTRA_IDS.has(x.id))) {
      expect(f.micro, f.name).toBeTruthy()
      expect(f.sugar! <= f.c + 0.5, `${f.name}: cukry > węgle`).toBe(true)
      expect(f.satFat! <= f.f + 0.5, `${f.name}: nasycone > tłuszcz`).toBe(true)
    }
  })
})

describe('miary domowe', () => {
  const find = (name: string) => LOCAL_FOODS.find((f) => f.name === name)!
  const names = (name: string) => unitsFor(find(name)).map((u) => u.n[0])
  it('miód, chleb, jajko, olej, masło', () => {
    expect(names('Miód')).toContain('łyżeczka')
    expect(names('Chleb żytni razowy')).toContain('kromka')
    expect(names('Jajko kurze')[0]).toBe('jajko M')
    expect(names('Oliwa z oliwek')).toEqual(expect.arrayContaining(['łyżka', 'łyżeczka']))
    expect(names('Masło')).toContain('plasterek')
    expect(names('Masło orzechowe')).toContain('łyżeczka')
    expect(names('Mięso mielone wołowe 5% tł.')).not.toContain('sztuka')
    expect(names('Tortilla pszenna')).toContain('placek')
    expect(names('Winogrona')).not.toContain('kieliszek')
    expect(names('Wino czerwone wytrawne')).toContain('kieliszek')
  })
  it('odmiana', () => {
    const u = unitsFor(find('Miód')).find((x) => x.n[0] === 'łyżeczka')!
    expect(unitLabel(u, 1)).toBe('1 łyżeczka')
    expect(unitLabel(u, 2)).toBe('2 łyżeczki')
    expect(unitLabel(u, 5)).toBe('5 łyżeczek')
    expect(unitLabel(u, 0.5)).toBe('½ łyżeczki')
    expect(unitLabel(u, 12)).toBe('12 łyżeczek')
    expect(unitLabel(u, 22)).toBe('22 łyżeczki')
  })
  it('każdy produkt lokalny ma sensowne miary', () => {
    for (const f of LOCAL_FOODS) for (const u of unitsFor(f)) expect(u.g, f.name).toBeGreaterThan(0)
  })
})

describe('wyszukiwanie', () => {
  const ex = (q: string) => searchExercises(EXERCISES, q, '', '')
  it('partie potocznie i z odmianą', () => {
    expect(ex('łydki').list[0].primary).toContain('calves')
    expect(ex('lydek').list[0].primary).toContain('calves')
    expect(ex('klata').list[0].primary).toContain('chest')
    expect(ex('brzuch').list.slice(0, 5).every((e) => e.primary.some((m) => m === 'abs' || m === 'obliques'))).toBe(true)
    expect(ex('biceps hantle').list.every((e) => e.equipment === 'hantle')).toBe(true)
  })
  it('literówki i podobne', () => {
    expect(ex('przysiat').list[0].pl).toContain('Przysiad')
    expect(ex('wyciskanei').list.length).toBeGreaterThan(0)
  })
  it('rdzenie produktów', () => {
    expect(stem('jajka')).toBe('jajk')
    expect(stem(norm('ziemniaków'))).toBe('ziemniak')
    const st = queryStems('płatków owsianych')
    expect(textScore(norm('Płatki owsiane'), st)).toBeGreaterThan(0)
  })
})

describe('nowe ćwiczenia i literówki', () => {
  const ex = (q: string) => searchExercises(EXERCISES, q, '', '')
  it('baza ma ok. 300 ćwiczeń z unikalnymi id i poprawnymi mięśniami', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(290)
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length)
    for (const e of EXERCISES) for (const m of [...e.primary, ...e.secondary]) expect(MUSCLES[m], `${e.id}: ${m}`).toBeDefined()
  })
  it('potoczne nazwy i literówki', () => {
    expect(ex('allahy').list[0].id).toBe('cable-crunch')
    expect(ex('allachy').list[0].id).toBe('cable-crunch')
    expect(ex('hjak').list[0].id).toBe('hack-squat')
    expect(ex('przysiad na maszynie hjak').list[0].id).toBe('hack-squat')
    expect(ex('ludki siedzac').list[0].id).toBe('seated-calf-raise')
    expect(ex('ohp').list[0].id).toBe('ohp')
    expect(ex('francuz').list.length).toBeGreaterThan(1)
    expect(ex('wyciksanie lezac').list[0].pl).toContain('Wyciskanie')
  })
})
