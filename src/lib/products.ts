import type { Food, Micro } from '../types'
import { norm, queryStems, textScore } from './search'

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
      out.push({ f: it.food, sc })
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
