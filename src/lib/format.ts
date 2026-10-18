/** YYYY-MM-DD w lokalnej strefie czasowej */
export function isoDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseIso(s)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000)
}

/** poniedziałek tygodnia zawierającego datę */
export function weekStart(s: string): string {
  const d = parseIso(s)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return isoDate(d)
}

const DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']
const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
const MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']

export function fmtDate(s: string, withDay = false): string {
  const d = parseIso(s)
  const today = isoDate()
  if (s === today) return 'Dzisiaj'
  if (s === addDays(today, -1)) return 'Wczoraj'
  if (s === addDays(today, 1)) return 'Jutro'
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''
  return (withDay ? `${DAYS[d.getDay()]}, ` : '') + base + year
}

export function fmtShort(s: string): string {
  const d = parseIso(s)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function fmtDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** liczba po polsku: przecinek dziesiętny */
export function num(n: number | undefined, digits = 1): string {
  if (n === undefined || Number.isNaN(n)) return '–'
  const r = Math.round(n * 10 ** digits) / 10 ** digits
  return String(r).replace('.', ',')
}

/** odczyt liczby z pola – akceptuje przecinek */
export function parseNum(s: string): number | undefined {
  const t = s.replace(',', '.').trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const d = n % 10
  const t = n % 100
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return few
  return many
}
