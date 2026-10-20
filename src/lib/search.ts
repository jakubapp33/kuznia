import { GROUPS, MUSCLES } from '../data/muscles'
import type { Exercise, MuscleId } from '../types'

export function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
}

const ENDINGS = ['ami', 'ach', 'ych', 'ymi', 'ego', 'emu', 'owa', 'owe', 'owy', 'ow', 'om', 'ie', 'ej', 'em', 'a', 'e', 'i', 'o', 'u', 'y']

/** prosty rdzeń polskiego słowa: „jajka” → „jajk”, „ziemniaków” → „ziemniak”, „owsianych” → „owsian” */
export function stem(w: string) {
  if (w.length < 5) return w
  for (const e of ENDINGS) if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, -e.length)
  return w
}

/** słowa zapytania jako rdzenie – do szukania produktów */
export function queryStems(q: string) {
  return norm(q).split(/\s+/).filter(Boolean).map(stem)
}

/** jak dobrze nazwa pasuje do zapytania: 0 = nie pasuje; wyżej, gdy nazwa zaczyna się od pierwszego słowa */
export function textScore(hay: string, stems: string[]) {
  if (!stems.length) return 1
  if (!stems.every((w) => hay.includes(w))) return 0
  let s = 1
  if (hay.startsWith(stems[0])) s += 2
  else if (hay.includes(' ' + stems[0])) s += 1
  return s - hay.length / 500
}

function tokens(s: string) {
  return norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1)
}

/** potoczne nazwy partii → mięśnie (po normalizacji, bez polskich znaków) */
const SYNONYMS: [string[], MuscleId[]][] = [
  [['klata', 'klatka', 'klatke', 'piersi', 'piersiowe', 'piersiowa', 'cycki', 'chest', 'pecs'], ['chest']],
  [['plecy', 'grzbiet', 'back', 'skrzydla', 'najszersze', 'lats'], ['lats', 'upper-back']],
  [['kaptury', 'trapez', 'czworoboczny', 'traps'], ['traps']],
  [['barki', 'bary', 'ramiona', 'naramienne', 'delty', 'delts', 'shoulders'], ['front-delts', 'side-delts', 'rear-delts']],
  [['biceps', 'bicek', 'bicki', 'dwuglowy', 'ramie'], ['biceps']],
  [['triceps', 'tricek', 'tricki', 'trojglowy'], ['triceps']],
  [['przedramie', 'przedramiona', 'chwyt', 'forearms', 'grip'], ['forearms']],
  [['brzuch', 'brzuszki', 'abs', 'kaloryfer', 'sixpack', 'core', 'prosty'], ['abs', 'obliques']],
  [['skosne', 'boczki', 'obliques'], ['obliques']],
  [['ledzwie', 'ledzwiowy', 'krzyz', 'prostowniki', 'dolny'], ['lower-back']],
  [['posladki', 'posladek', 'pupa', 'tylek', 'dupa', 'glute', 'glutes', 'pupe'], ['glutes', 'abductors']],
  [['nogi', 'noga', 'uda', 'udo', 'legs'], ['quads', 'hamstrings', 'glutes']],
  [['czworki', 'czworoglowe', 'czworoglowy', 'przod', 'quads'], ['quads']],
  [['dwojki', 'dwuglowe', 'tyl', 'hamstrings', 'kulszowo'], ['hamstrings']],
  [['lydki', 'lydka', 'lydek', 'calves', 'calf', 'palce'], ['calves']],
  [['przywodziciele', 'wewnetrzne'], ['adductors']],
  [['odwodziciele', 'zewnetrzne'], ['abductors']],
]

const EQUIP_SYN: [string[], string][] = [
  [['sztanga', 'sztangi', 'sztange', 'gryf', 'barbell'], 'sztanga'],
  [['hantle', 'hantel', 'hantla', 'hantlami', 'dumbbell', 'dumbbells'], 'hantle'],
  [['maszyna', 'maszynie', 'maszyny', 'suwnica', 'machine'], 'maszyna'],
  [['wyciag', 'wyciagu', 'linka', 'linki', 'brama', 'cable'], 'wyciąg'],
  [['dom', 'domu', 'bez', 'sprzetu', 'kalistenika', 'bodyweight', 'wlasna'], 'masa ciała'],
  [['kettlebell', 'kettle', 'odwazniki'], 'kettlebell'],
  [['cardio', 'kardio', 'bieganie', 'rower', 'kondycja'], 'cardio'],
]

/** wspólny początek dwóch słów */
function prefix(a: string, b: string) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

/** odległość edycyjna z limitem – do literówek */
function lev(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      rowMin = Math.min(rowMin, cur[j])
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

/**
 * Jak dobrze słowo z zapytania pasuje do słowa z opisu (0 = wcale).
 * Polska odmiana: „łydki” ~ „łydek”, „pleców” ~ „plecy” – wystarczy wspólny rdzeń.
 */
function wordMatch(q: string, t: string, fuzzy: boolean): number {
  if (t === q) return 3
  if (t.startsWith(q)) return q.length >= 3 ? 2.6 : 1.5
  if (q.length >= 4 && t.includes(q)) return 2
  const p = prefix(q, t)
  if (p >= 4 && p >= Math.min(q.length, t.length) - 2) return 2.2
  if (fuzzy && q.length >= 4) {
    const d = lev(q, t.slice(0, q.length + 1), q.length >= 7 ? 2 : 1)
    if (d <= (q.length >= 7 ? 2 : 1)) return 1.2
    if (lev(q, t, q.length >= 7 ? 2 : 1) <= (q.length >= 7 ? 2 : 1)) return 1.2
  }
  return 0
}

function bestIn(q: string, toks: string[], fuzzy: boolean) {
  let best = 0
  for (const t of toks) best = Math.max(best, wordMatch(q, t, fuzzy))
  return best
}

interface Indexed {
  e: Exercise
  name: string[]
  primary: Set<MuscleId>
  secondary: Set<MuscleId>
  muscleTok: string[]
  secTok: string[]
}

const cache = new WeakMap<Exercise, Indexed>()
function index(e: Exercise): Indexed {
  let ix = cache.get(e)
  if (!ix) {
    // prostowniki grzbietu liczą się do grupy „Brzuch” w statystykach, ale w szukaniu „brzuch” nie chodzi o martwy ciąg
    const groupNames = (ms: MuscleId[]) => ms.flatMap((m) => [MUSCLES[m], m === 'lower-back' ? '' : GROUPS.find((g) => g.muscles.includes(m))?.name ?? ''])
    ix = {
      e,
      name: tokens(e.pl + ' ' + e.en),
      primary: new Set(e.primary),
      secondary: new Set(e.secondary),
      muscleTok: tokens(groupNames(e.primary).join(' ') + ' ' + e.equipment),
      secTok: tokens(groupNames(e.secondary).join(' ')),
    }
    cache.set(e, ix)
  }
  return ix
}

function synMuscles(q: string, fuzzy: boolean): Set<MuscleId> {
  const out = new Set<MuscleId>()
  for (const [words, ms] of SYNONYMS) if (words.some((w) => wordMatch(q, w, fuzzy) >= 2.2 || (fuzzy && wordMatch(q, w, true) > 0))) ms.forEach((m) => out.add(m))
  return out
}

function synEquip(q: string): string | undefined {
  return EQUIP_SYN.find(([words]) => words.some((w) => wordMatch(q, w, false) >= 2.2))?.[1]
}

function scoreWord(ix: Indexed, q: string, fuzzy: boolean): number {
  let s = bestIn(q, ix.name, fuzzy) * 1.2
  s = Math.max(s, bestIn(q, ix.muscleTok, fuzzy))
  s = Math.max(s, bestIn(q, ix.secTok, fuzzy) * 0.4)
  const ms = synMuscles(q, fuzzy)
  if (ms.size) {
    if ([...ms].some((m) => ix.primary.has(m))) s = Math.max(s, 2.4)
    else if ([...ms].some((m) => ix.secondary.has(m))) s = Math.max(s, 0.9)
  }
  const eq = synEquip(q)
  if (eq && ix.e.equipment === eq) s = Math.max(s, 2)
  return s
}

export interface ExerciseSearch {
  list: Exercise[]
  /** true = brak dokładnych wyników, pokazujemy podobne */
  similar: boolean
}

/**
 * Wyszukiwanie po nazwie (PL/EN), mięśniach, potocznych nazwach partii („klata”, „łydki”), sprzęcie.
 * Każde słowo musi do czegoś pasować; gdy nic nie pasuje – podobne (literówki, choć jedno słowo).
 */
export function searchExercises(list: Exercise[], q: string, group: string, equipment: string): ExerciseSearch {
  const words = tokens(q)
  const g = GROUPS.find((x) => x.id === group)
  const base = list.filter((e) => (!g || e.primary.some((m) => g.muscles.includes(m))) && (!equipment || e.equipment === equipment))
  if (!words.length) return { list: base, similar: false }

  const rank = (fuzzy: boolean, every: boolean) =>
    base
      .map((e) => {
        const ix = index(e)
        const s = words.map((w) => scoreWord(ix, w, fuzzy))
        const ok = every ? s.every((x) => x > 0) : s.some((x) => x > 0)
        return { e, score: ok ? s.reduce((a, b) => a + b, 0) + (e.compound ? 0.05 : 0) : 0 }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.e)

  const exact = rank(false, true)
  if (exact.length) return { list: exact, similar: false }
  const fuzzy = rank(true, true)
  if (fuzzy.length) return { list: fuzzy, similar: false }
  return { list: rank(true, false).slice(0, 30), similar: true }
}

export function filterExercises(list: Exercise[], q: string, group: string, equipment: string): Exercise[] {
  return searchExercises(list, q, group, equipment).list
}
