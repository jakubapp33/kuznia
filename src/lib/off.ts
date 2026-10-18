import type { Food } from '../types'

/** Open Food Facts – otwarta, darmowa baza produktów (dużo polskich produktów z kodami kreskowymi). */
const FIELDS = 'code,product_name,product_name_pl,brands,nutriments,serving_quantity'

interface OffProduct {
  code?: string
  product_name?: string
  product_name_pl?: string
  brands?: string
  serving_quantity?: number | string
  nutriments?: Record<string, number | string | undefined>
}

/** mikroskładniki: klucz OFF → [nasz klucz, mnożnik z g] */
const MICROS: Record<string, [string, number]> = {
  sodium_100g: ['na', 1000], potassium_100g: ['k', 1000], calcium_100g: ['ca', 1000], magnesium_100g: ['mg', 1000],
  iron_100g: ['fe', 1000], zinc_100g: ['zn', 1000], phosphorus_100g: ['p', 1000], 'vitamin-c_100g': ['vc', 1000],
  'vitamin-d_100g': ['vd', 1e6], 'vitamin-b12_100g': ['b12', 1e6], 'vitamin-a_100g': ['va', 1e6], 'vitamin-e_100g': ['ve', 1000],
  'vitamin-b6_100g': ['b6', 1000], 'vitamin-b1_100g': ['b1', 1000], 'vitamin-b2_100g': ['b2', 1000], 'vitamin-pp_100g': ['b3', 1000],
  'vitamin-b9_100g': ['b9', 1e6], cholesterol_100g: ['chol', 1000],
}

function n(v: unknown): number {
  const x = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(x) ? Math.round(x * 10) / 10 : 0
}

export function fromOff(p: OffProduct): Food | undefined {
  const nu = p.nutriments ?? {}
  const name = (p.product_name_pl || p.product_name || '').trim()
  let kcal = n(nu['energy-kcal_100g'])
  if (!kcal && nu['energy_100g']) kcal = Math.round(n(nu['energy_100g']) / 4.184)
  if (!name || !p.code || (!kcal && !n(nu['proteins_100g']))) return undefined
  const portion = n(p.serving_quantity)
  const micro: Record<string, number> = {}
  for (const [k, [key, mul]] of Object.entries(MICROS)) {
    const v = n(nu[k])
    if (v > 0) micro[key] = Math.round(v * mul * 10) / 10
  }
  const opt = (k: string) => (nu[k] !== undefined && nu[k] !== '' ? n(nu[k]) : undefined)
  const salt = opt('salt_100g')
  if (micro.na === undefined && salt !== undefined) micro.na = Math.round((salt / 2.5) * 1000)
  return {
    id: 'off:' + p.code,
    barcode: p.code,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    kcal: Math.round(kcal),
    p: n(nu['proteins_100g']),
    f: n(nu['fat_100g']),
    c: n(nu['carbohydrates_100g']),
    fiber: opt('fiber_100g'),
    sugar: opt('sugars_100g'),
    satFat: opt('saturated-fat_100g'),
    salt,
    micro: Object.keys(micro).length ? micro : undefined,
    portion: portion > 0 ? portion : undefined,
  }
}

export async function searchOff(q: string, signal?: AbortSignal): Promise<Food[]> {
  const url = new URL('https://pl.openfoodfacts.org/cgi/search.pl')
  url.search = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '30',
    fields: FIELDS,
    sort_by: 'unique_scans_n',
  }).toString()
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Baza produktów nie odpowiada. Spróbuj za chwilę.')
  const j = (await res.json()) as { products?: OffProduct[] }
  return (j.products ?? []).map(fromOff).filter((x): x is Food => !!x)
}

export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<Food | undefined> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, { signal })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error('Baza produktów nie odpowiada. Spróbuj za chwilę.')
  const j = (await res.json()) as { status?: number; product?: OffProduct }
  if (!j.product || j.status === 0) return undefined
  return fromOff({ ...j.product, code: j.product.code ?? code })
}
