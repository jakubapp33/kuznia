import type { DayLog } from '../types'

/**
 * Liczba w formacie z iOS (pl lub en): „8 532”, „1 734,5”, „1,734.5”, „534 kcal”.
 * Spacje (też niełamliwe) to separatory tysięcy.
 */
export function parseLooseNumber(raw: string): number | undefined {
  let s = raw.replace(/[\s  ]/g, '').replace(/[^\d.,-]/g, '')
  if (!s) return undefined
  if (s.includes(',') && s.includes('.')) {
    // ostatni separator jest dziesiętny
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (/^\d{1,3}(,\d{3})+$/.test(s)) {
    s = s.replace(/,/g, '')
  } else {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

const KEYS: [RegExp, keyof DayLog][] = [
  [/^(kroki|steps?)$/i, 'steps'],
  [/^(aktywne|active|aktywna)$/i, 'kcalActive'],
  [/^(spoczynkowe|spoczynkowa|resting|rest|basal)$/i, 'kcalRest'],
]

/** tekst ze Skrótu iOS: „kroki=8532; aktywne=534; spoczynkowe=1745” (linie lub średniki) */
export function parseHealthText(text: string): Pick<DayLog, 'steps' | 'kcalActive' | 'kcalRest'> | undefined {
  const out: Pick<DayLog, 'steps' | 'kcalActive' | 'kcalRest'> = {}
  for (const part of text.split(/[\n;]+/)) {
    const m = part.match(/^\s*([a-ząćęłńóśźż]+)\s*[=:]\s*(.*)$/i)
    if (!m) continue
    const key = KEYS.find(([re]) => re.test(m[1]))?.[1] as 'steps' | 'kcalActive' | 'kcalRest' | undefined
    const v = parseLooseNumber(m[2])
    if (key && v !== undefined) out[key] = Math.round(v)
  }
  return Object.keys(out).length ? out : undefined
}
