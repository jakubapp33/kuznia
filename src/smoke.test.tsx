// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { TEMPLATES } from './data/plans'
import { db, setSetting } from './db/db'
import { isoDate, addDays } from './lib/format'
import { startWorkout } from './lib/workout'

let router: typeof import('./App').router

beforeAll(async () => {
  // baza produktów z dysku zamiast sieci
  const products = readFileSync(process.cwd() + '/public/data/products.json', 'utf8')
  globalThis.fetch = (async (url: string | URL) => {
    if (String(url).includes('data/products.json')) return new Response(products, { status: 200 })
    return new Response('{}', { status: 404 })
  }) as typeof fetch
  // zapis danych przykładowych
  await setSetting('profile', { sex: 'm', age: 18, height: 178, weight: 72, activity: 1.55, goal: 'bulk', rate: 1, experience: 'początkujący' })
  const t = TEMPLATES[1]
  const planId = (await db.plans.add({ name: t.name, days: structuredClone(t.days), createdAt: Date.now() })) as number
  await setSetting('activePlanId', planId)
  for (let i = 0; i < 6; i++) {
    const day = t.days[i % t.days.length]
    await db.workouts.add({
      name: day.name, date: addDays(isoDate(), -14 + i * 2), startedAt: Date.now() - (14 - i * 2) * 864e5, finishedAt: Date.now() - (14 - i * 2) * 864e5 + 3600e3,
      planId, dayId: day.id,
      exercises: day.exercises.map((pe) => ({ exerciseId: pe.exerciseId, restSec: pe.restSec, repMin: pe.repMin, repMax: pe.repMax, sets: Array.from({ length: pe.sets }, () => ({ w: 40 + i * 2.5, r: 8 + (i % 3), done: true })) })),
    })
    await db.body.add({ date: addDays(isoDate(), -14 + i * 2), weight: 72 + i * 0.1, waist: 80 })
  }
  await db.foodLog.add({ date: isoDate(), time: '08:00', meal: 0, name: 'Owsianka', grams: 80, kcal: 300, p: 10, f: 6, c: 50, fiber: 8, sugar: 1, satFat: 1, salt: 0, micro: { mg: 112, fe: 3.4 } })
  await db.days.put({ date: isoDate(), sleepH: 7, water: 750, energy: 4 })
  await startWorkout((await db.plans.get(planId))!, t.days[1])
  router = (await import('./App')).router
})

afterEach(cleanup)

const ROUTES = [
  '/', '/trening', '/trening/plan/1', '/trening/szablon/ppl-6', '/trening/sesja', '/trening/historia', '/trening/historia/1',
  '/cwiczenia', '/cwiczenia/bench-press', '/cwiczenia/plank', '/cwiczenia/nowe', '/dieta', '/dieta/dodaj?meal=2', '/dieta/produkt', '/dieta/cele',
  '/postep', '/postep?tab=insights', '/ustawienia', '/garmin',
]

describe('każdy ekran renderuje się bez błędów', () => {
  for (const path of ROUTES) {
    it(path, async () => {
      const errors: unknown[] = []
      const orig = console.error
      console.error = (...a: unknown[]) => { errors.push(a); }
      window.location.hash = '#' + path
      await act(async () => { await router.navigate(path) })
      const { container } = render(<RouterProvider router={router} />)
      await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
      console.error = orig
      const text = container.textContent ?? ''
      expect(text).not.toMatch(/Unexpected Application Error|Error/)
      expect(text.length).toBeGreaterThan(50)
      const real = errors.filter((e) => !String((e as unknown[])[0]).includes('not wrapped in act'))
      expect(real.map((e) => String((e as unknown[])[0]).slice(0, 300))).toEqual([])
    })
  }
})

describe('treść i interakcje', () => {
  async function show(path: string) {
    await act(async () => { await router.navigate(path) })
    const r = render(<RouterProvider router={router} />)
    await act(async () => { await new Promise((res) => setTimeout(res, 300)) })
    return r
  }
  it('Dziś pokazuje trening w toku i makro', async () => {
    const { container } = await show('/')
    expect(container.textContent).toContain('Trening w toku')
    expect(container.textContent).toContain('kcal')
  })
  it('sesja: zaliczenie serii zapisuje ją w bazie i uzupełnia ciężar', async () => {
    const { container, getAllByLabelText } = await show('/trening/sesja')
    expect(container.textContent).toContain('Przysiad ze sztangą')
    expect(container.textContent).toMatch(/zwiększ|Zostań|Pierwsza sesja|dołóż/i)
    await act(async () => { getAllByLabelText('Zalicz serię')[0].click() })
    await act(async () => { await new Promise((res) => setTimeout(res, 400)) })
    const w = await db.workouts.filter((x) => !x.finishedAt).first()
    const s = w!.exercises[0].sets[0]
    expect(s.done).toBe(true)
    expect(s.r).toBeGreaterThan(0)
    expect(container.textContent).toContain('Przerwa')
  })
  it('postęp: objętość tygodniowa i wykres siły', async () => {
    const { container } = await show('/postep')
    expect(container.textContent).toContain('Serie na partię')
  })
  it('kalkulator: pokazuje wynik kcal', async () => {
    const { container } = await show('/dieta/cele')
    expect(container.textContent).toMatch(/\d{4}kcal dziennie/)
  })
})

describe('nowe funkcje', () => {
  async function show(path: string) {
    await act(async () => { await router.navigate(path) })
    const r = render(<RouterProvider router={router} />)
    await act(async () => { await new Promise((res) => setTimeout(res, 400)) })
    return r
  }
  it('wyszukiwanie w dużej bazie i filtr sklepu Lidl', async () => {
    const { container, getByPlaceholderText, getByText } = await show('/dieta/dodaj?meal=0')
    fireEvent.change(getByPlaceholderText(/skyr/), { target: { value: 'kefir' } })
    await act(async () => { await new Promise((res) => setTimeout(res, 500)) })
    expect(container.textContent).toContain('Produkty ze sklepów')
    await act(async () => { getByText('Lidl').click() })
    await act(async () => { await new Promise((res) => setTimeout(res, 500)) })
    expect(container.textContent).toMatch(/Pilos|Milbona/)
  })
  it('karta produktu pokazuje mikroskładniki i godzinę', async () => {
    const { container, getByPlaceholderText, findAllByText } = await show('/dieta/dodaj?meal=0')
    fireEvent.change(getByPlaceholderText(/skyr/), { target: { value: 'szpinak' } })
    await act(async () => { await new Promise((res) => setTimeout(res, 300)) })
    ;(await findAllByText('Szpinak'))[0].click()
    await act(async () => { await new Promise((res) => setTimeout(res, 300)) })
    expect(container.ownerDocument.body.textContent).toContain('Witamina C')
    expect(container.ownerDocument.body.textContent).toContain('Godzina posiłku')
  })
  it('miary domowe: 2 łyżeczki miodu', async () => {
    const { getByPlaceholderText, findAllByText } = await show('/dieta/dodaj?meal=0')
    fireEvent.change(getByPlaceholderText(/skyr/), { target: { value: 'miód' } })
    await act(async () => { await new Promise((res) => setTimeout(res, 300)) })
    ;(await findAllByText('Miód'))[0].click()
    await act(async () => { await new Promise((res) => setTimeout(res, 300)) })
    const body = document.body
    const chip = [...body.querySelectorAll<HTMLButtonElement>('[role=radio]')].find((b) => b.textContent?.startsWith('łyżeczka'))!
    await act(async () => { chip.click() })
    const two = [...body.querySelectorAll<HTMLButtonElement>('.chip')].find((b) => b.textContent === '2')!
    await act(async () => { two.click() })
    expect(body.textContent).toContain('= 24 g')
    const add = [...body.querySelectorAll<HTMLButtonElement>('.btn.primary.lg')].find((b) => b.textContent === 'Dodaj')!
    await act(async () => { add.click() })
    await act(async () => { await new Promise((res) => setTimeout(res, 300)) })
    const e = (await db.foodLog.toArray()).find((x) => x.name === 'Miód')!
    expect([e.grams, e.amount]).toEqual([24, '2 łyżeczki'])
  })
  it('dziennik diety: dzienniczek i szczegóły dnia', async () => {
    const { container, getByText } = await show('/dieta')
    expect(container.textContent).toContain('Dzienniczek')
    expect(container.textContent).toContain('08:00')
    await act(async () => { getByText(/witaminy, minerały/).click() })
    expect(container.textContent).toContain('Magnez')
  })
  it('woda: dodanie szklanki zapisuje się', async () => {
    const { getAllByText } = await show('/')
    await act(async () => { getAllByText('+ szklanka 250 ml')[0].click() })
    await act(async () => { await new Promise((res) => setTimeout(res, 200)) })
    expect((await db.days.get(isoDate()))?.water).toBe(1000)
  })
  it('aktywność: kroki i spalone kcal pokazują bilans dnia', async () => {
    await db.days.update(isoDate(), { kcalRest: 1700, kcalActive: 500 })
    const { container, getByText } = await show('/dieta')
    expect(container.textContent).toContain('2200 kcal spalone')
    expect(container.textContent).toContain('Bilans dnia')
    await act(async () => { getByText('Bieganie').click() })
    await act(async () => { await new Promise((res) => setTimeout(res, 200)) })
    expect((await db.days.get(isoDate()))?.activity).toBe('Bieganie')
  })
  it('wklej z Garmina: bez schowka otwiera pole do wklejenia', async () => {
    const { getAllByText, getByLabelText, getByText } = await show('/')
    await act(async () => { getAllByText('Wklej z Garmina')[0].click() })
    const ta = getByLabelText('Dane ze Skrótu') as HTMLTextAreaElement
    await act(async () => { fireEvent.change(ta, { target: { value: 'kroki=9 120\naktywne=610\nspoczynkowe=1 760' } }) })
    await act(async () => { (ta.closest('.sheet, [role=dialog]') ?? document.body).querySelector<HTMLButtonElement>('.btn.primary.lg')!.click() })
    await act(async () => { await new Promise((res) => setTimeout(res, 200)) })
    expect(getByText(/Wklejono: 9/)).toBeTruthy()
    const d = await db.days.get(isoDate())
    expect([d?.steps, d?.kcalActive, d?.kcalRest]).toEqual([9120, 610, 1760])
  })
})
