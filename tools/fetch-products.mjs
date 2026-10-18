// Pobiera polskie produkty z kompletnymi wartościami odżywczymi z Open Food Facts (licencja ODbL)
// i zapisuje je w kompaktowym formacie do public/data/products.json.
// Uruchomienie: node tools/fetch-products.mjs   (trwa kilka–kilkanaście minut, zapytania co ~1 s)
import { mkdirSync, writeFileSync } from 'node:fs'

const API = 'https://search.openfoodfacts.org/search'
const UA = 'Kuznia/0.2 (https://github.com/jakubapp33/kuznia)'
const BASE = 'countries_tags:"en:poland" AND states_tags:"en:nutrition-facts-completed"'
const FIELDS = 'code,product_name,product_name_pl,brands,nutriments,serving_quantity,unique_scans_n'

/** mikroskładniki: klucz OFF → [nasz klucz, mnożnik z g do jednostki docelowej] */
const MICROS = {
  sodium_100g: ['na', 1000], // mg
  potassium_100g: ['k', 1000],
  calcium_100g: ['ca', 1000],
  magnesium_100g: ['mg', 1000],
  iron_100g: ['fe', 1000],
  zinc_100g: ['zn', 1000],
  phosphorus_100g: ['p', 1000],
  'vitamin-c_100g': ['vc', 1000], // mg
  'vitamin-d_100g': ['vd', 1e6], // µg
  'vitamin-b12_100g': ['b12', 1e6], // µg
  'vitamin-a_100g': ['va', 1e6], // µg
  'vitamin-e_100g': ['ve', 1000], // mg
  'vitamin-b6_100g': ['b6', 1000],
  'vitamin-b1_100g': ['b1', 1000],
  'vitamin-b2_100g': ['b2', 1000],
  'vitamin-pp_100g': ['b3', 1000],
  'vitamin-b9_100g': ['b9', 1e6], // µg (foliany)
  cholesterol_100g: ['chol', 1000], // mg
}

// partycje, żeby każda miała < 10 000 wyników (limit wyszukiwarki)
const PARTS = [
  ...Array.from({ length: 10 }, (_, i) => `code:590${i}*`),
  'NOT code:590*',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const r1 = (x) => Math.round(x * 10) / 10

async function get(q, page) {
  const url = new URL(API)
  url.search = new URLSearchParams({ q, page_size: '100', page: String(page), sort_by: '-unique_scans_n', fields: FIELDS }).toString()
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.ok) return await res.json()
      console.warn(`HTTP ${res.status} – ponawiam`)
    } catch (e) {
      console.warn('błąd sieci – ponawiam', e.message)
    }
    await sleep(3000 * (attempt + 1))
  }
  throw new Error('Nie udało się pobrać: ' + url)
}

function num(v) {
  const x = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(x) && x >= 0 ? x : undefined
}

function clean(s) {
  return (s ?? '').replace(/\s+/g, ' ').trim()
}

const out = new Map()
for (const part of PARTS) {
  const q = `${BASE} AND ${part}`
  let page = 1
  let pages = 1
  do {
    const d = await get(q, page)
    pages = Math.min(d.page_count ?? 1, 100)
    for (const h of d.hits ?? []) {
      const n = h.nutriments ?? {}
      const name = clean(h.product_name_pl || h.product_name)
      let kcal = num(n['energy-kcal_100g'])
      if (kcal === undefined && num(n.energy_100g)) kcal = n.energy_100g / 4.184
      const p = num(n.proteins_100g)
      const f = num(n.fat_100g)
      const c = num(n.carbohydrates_100g)
      if (!h.code || !name || name.length < 2 || kcal === undefined || p === undefined || f === undefined || c === undefined) continue
      if (kcal > 950 || p + f + c > 105) continue // błędne dane
      const brand = clean(Array.isArray(h.brands) ? h.brands[0] : String(h.brands ?? '').split(',')[0])
      const micro = {}
      for (const [k, [key, mul]] of Object.entries(MICROS)) {
        const v = num(n[k])
        if (v !== undefined && v > 0) micro[key] = r1(v * mul)
      }
      const salt = num(n.salt_100g)
      if (micro.na === undefined && salt !== undefined) micro.na = r1((salt / 2.5) * 1000)
      out.set(h.code, [
        h.code,
        name.slice(0, 80),
        brand.slice(0, 40),
        Math.round(kcal),
        r1(p), r1(f), r1(c),
        r1(num(n.fiber_100g) ?? -1),
        r1(num(n.sugars_100g) ?? -1),
        r1(num(n['saturated-fat_100g']) ?? -1),
        r1(salt ?? -1),
        Math.round(num(h.serving_quantity) ?? 0),
        Object.keys(micro).length ? micro : 0,
      ])
    }
    process.stdout.write(`\r${part}: strona ${page}/${pages} · łącznie ${out.size} produktów   `)
    page++
    await sleep(900)
  } while (page <= pages)
  console.log()
}

mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true })
const data = {
  source: 'Open Food Facts (openfoodfacts.org), licencja ODbL',
  fetchedAt: new Date().toISOString().slice(0, 10),
  // kolejność pól: kod, nazwa, marka, kcal, białko, tłuszcz, węgle, błonnik, cukry, kw. nasycone, sól, porcja g, mikro
  products: [...out.values()],
}
writeFileSync(new URL('../public/data/products.json', import.meta.url), JSON.stringify(data))
console.log(`✓ Zapisano ${out.size} produktów`)
