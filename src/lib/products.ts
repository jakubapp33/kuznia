import type { Food, Micro } from '../types'
import { norm, queryStems, textScore, typoDistance, typoLimit } from './search'

/** Wbudowana baza polskich produktów (Open Food Facts, ODbL) – pobierana raz, potem działa offline. */
type Row = [string, string, string, number, number, number, number, number, number, number, number, number, Micro | 0]

interface Indexed {
  food: Food
  hay: string
}

let cache: Promise<Indexed[]> | undefined

function toFood(r: Row): Food {
  const opt = (v: number) => (v >= 0 ? v : undefined)
  return {
    id: 'off:' + r[0],
    barcode: r[0],
    name: r[1],
    brand: r[2] || undefined,
    kcal: r[3], p: r[4], f: r[5], c: r[6],
    fiber: opt(r[7]), sugar: opt(r[8]), satFat: opt(r[9]), salt: opt(r[10]),
    portion: r[11] || undefined,
    micro: r[12] || undefined,
    incomplete: r[3] < 0 || undefined,
  }
}

export function loadProducts(): Promise<Indexed[]> {
  cache ??= fetch(new URL('data/products.json', document.baseURI))
    .then((r) => {
      if (!r.ok) throw new Error('Nie udało się wczytać bazy produktów.')
      return r.json() as Promise<{ products: Row[] }>
    })
    .then((d) => d.products.map((r) => {
      const food = toFood(r)
      return { food, hay: norm(food.name + ' ' + (food.brand ?? '')) }
    }))
    .catch((e) => {
      cache = undefined
      throw e
    })
  return cache
}

/** marki własne sieci (do filtrowania „sklepów”) */
export const STORES: { id: string; name: string; brands: string[] }[] = [
  { id: 'lidl', name: 'Lidl', brands: ['lidl', 'pilos', 'milbona', 'go active', 'alesto', 'chef select', 'combino', 'vitasia', 'fin carre', 'solevita', 'crownfield', 'freshona', 'pikok', 'vemondo', 'snack day', 'baresa', 'deluxe', 'favorina'] },
  { id: 'biedronka', name: 'Biedronka', brands: ['biedronka', 'marletto', 'go vege', 'kraina wedlin', 'mleczna dolina', 'vital fresh', 'magnetic', 'kraina mies'] },
  { id: 'carrefour', name: 'Carrefour', brands: ['carrefour'] },
  { id: 'auchan', name: 'Auchan', brands: ['auchan'] },
  { id: 'kaufland', name: 'Kaufland', brands: ['kaufland', 'k-classic', 'k-bio', 'k-take it veggie'] },
  { id: 'zabka', name: 'Żabka', brands: ['zabka', 'szamamm'] },
]

export async function searchProducts(q: string, store = '', limit = 60): Promise<Food[]> {
  const all = await loadProducts()
  const words = queryStems(q)
  const st = STORES.find((s) => s.id === store)
  const out: { f: Food; sc: number }[] = []
  for (const it of all) {
    if (st) {
      const b = norm(it.food.brand ?? '')
      if (!st.brands.some((x) => b === x || b.startsWith(x + ' '))) continue
    }
    // baza jest posortowana od najpopularniejszych – najlepsze dopasowania z pierwszych trafień
    const sc = textScore(it.hay, words)
    if (sc > 0) {
      // produkty bez wartości na końcu listy
      out.push({ f: it.food, sc: it.food.incomplete ? sc - 2 : sc })
      if (out.length >= limit * 3) break
    }
  }
  return out.sort((a, b) => b.sc - a.sc).slice(0, limit).map((x) => x.f)
}

export async function findBarcode(code: string): Promise<Food | undefined> {
  try {
    const all = await loadProducts()
    return all.find((it) => it.food.barcode === code)?.food
  } catch {
    return undefined
  }
}

let vocab: Map<string, number> | undefined

/** słownik wyrazów z nazw i marek (do poprawiania literówek) */
async function getVocab(extra: string[]) {
  if (!vocab) {
    vocab = new Map()
    const add = (t: string) => t.length >= 3 && vocab!.set(t, (vocab!.get(t) ?? 0) + 1)
    for (const it of await loadProducts()) for (const t of it.hay.split(/[^a-z0-9]+/)) add(t)
    for (const e of extra) for (const t of norm(e).split(/[^a-z0-9]+/)) add(t)
  }
  return vocab
}

/**
 * Poprawia literówki w zapytaniu: każde słowo, którego nie ma w żadnej nazwie,
 * zamienia na najbliższe istniejące (np. „granila viutanella” → „granola vitanella”).
 * Zwraca poprawione zapytanie albo undefined, gdy nie było czego poprawiać.
 */
export async function correctQuery(q: string, extraNames: string[] = []): Promise<string | undefined> {
  const words = norm(q).split(/\s+/).filter(Boolean)
  if (!words.length) return undefined
  const v = await getVocab(extraNames)
  const keys = [...v.keys()]
  let changed = false
  const out = words.map((w) => {
    if (w.length < 3) return w
    // ile razy w bazie są słowa zaczynające się dokładnie od tego, co wpisano
    let known = 0
    for (const k of keys) if (k.startsWith(w)) known += v.get(k)!
    const lim = typoLimit(w.length)
    let best: { k: string; d: number; n: number } | undefined
    for (const k of keys) {
      if (k.startsWith(w) || Math.abs(k.length - w.length) > lim + 3) continue
      const d = Math.min(typoDistance(w, k, lim), k.length > w.length ? typoDistance(w, k.slice(0, w.length), lim) : lim + 1)
      if (d > lim) continue
      const n = v.get(k)!
      // przy równej liczbie literówek wygrywa słowo częstsze w bazie
      if (!best || d < best.d - 0.01 || (Math.abs(d - best.d) < 0.01 && n > best.n)) best = { k, d, n }
    }
    // poprawiamy, gdy wpisanego słowa nie ma albo jest rzadką literówką w bazie (np. „kurczka” vs „kurczak”)
    if (!best || (known > 0 && best.n < known * 10)) return w
    changed = true
    return best.k
  })
  return changed ? out.join(' ') : undefined
}
