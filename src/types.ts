export type MuscleId =
  | 'chest' | 'front-delts' | 'side-delts' | 'rear-delts' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques' | 'traps' | 'lats' | 'upper-back' | 'lower-back'
  | 'glutes' | 'abductors' | 'adductors' | 'quads' | 'hamstrings' | 'calves'

export type Equipment = 'sztanga' | 'hantle' | 'maszyna' | 'wyciąg' | 'masa ciała' | 'kettlebell' | 'inne' | 'cardio'

/** weight: kg × powt., bodyweight: powt. (+ opcjonalnie kg), time: sekundy, cardio: minuty + km */
export type LoadType = 'weight' | 'bodyweight' | 'time' | 'cardio'

export interface Exercise {
  id: string
  pl: string
  en: string
  compound: boolean
  equipment: Equipment
  load: LoadType
  primary: MuscleId[]
  secondary: MuscleId[]
  steps: string[]
  tips: string[]
  /** krok zwiększania ciężaru w kg */
  inc: number
  custom?: boolean
  /** inne, potoczne nazwy (do wyszukiwania), np. „allahy” */
  aliases?: string[]
}

export interface PlanExercise {
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
  /** docelowy zapas powtórzeń (RIR) */
  rir: number
  restSec: number
  note?: string
}

export interface PlanDay {
  id: string
  name: string
  exercises: PlanExercise[]
}

export interface Plan {
  id?: number
  name: string
  description?: string
  days: PlanDay[]
  templateId?: string
  createdAt: number
}

export interface PlanTemplate {
  id: string
  name: string
  level: 'początkujący' | 'średniozaawansowany' | 'każdy'
  perWeek: string
  equipment: string
  description: string
  why: string[]
  days: PlanDay[]
}

export interface SetEntry {
  w?: number
  r?: number
  /** sekundy (time) lub minuty (cardio) */
  t?: number
  /** km (cardio) */
  d?: number
  rir?: number
  warmup?: boolean
  done: boolean
}

export interface WorkoutExercise {
  exerciseId: string
  repMin?: number
  repMax?: number
  rir?: number
  restSec: number
  note?: string
  sets: SetEntry[]
}

export interface Workout {
  id?: number
  name: string
  /** YYYY-MM-DD */
  date: string
  startedAt: number
  finishedAt?: number
  planId?: number
  dayId?: string
  exercises: WorkoutExercise[]
  note?: string
  /** subiektywna ocena treningu 1–5 */
  rating?: number
}

export interface BodyEntry {
  id?: number
  date: string
  weight?: number
  waist?: number
  chest?: number
  arm?: number
  thigh?: number
  hips?: number
  bodyFat?: number
}

/** mikroskładniki na 100 g (lub w porcji – we wpisach dziennika); klucze jak w MICRO_INFO */
export type Micro = Record<string, number>

export interface Food {
  /** 'pl:…' baza lokalna, 'off:<kod>' Open Food Facts, 'my:…' własny */
  id: string
  name: string
  brand?: string
  /** wartości na 100 g */
  kcal: number
  p: number
  f: number
  c: number
  fiber?: number
  sugar?: number
  satFat?: number
  salt?: number
  micro?: Micro
  /** typowa porcja w gramach */
  portion?: number
  portionName?: string
  /** miary domowe (gdy brak – dobierane po nazwie, patrz lib/units) */
  units?: { n: [string, string, string]; g: number }[]
  barcode?: string
  /** produkt z bazy bez wartości odżywczych – do uzupełnienia z etykiety */
  incomplete?: boolean
  lastUsed?: number
  fav?: 0 | 1
}

export interface FoodLogEntry {
  id?: number
  date: string
  /** godzina posiłku HH:MM */
  time?: string
  meal: number
  foodId?: string
  name: string
  grams?: number
  /** jak wpisano ilość, np. „2 łyżeczki” */
  amount?: string
  kcal: number
  p: number
  f: number
  c: number
  fiber?: number
  sugar?: number
  satFat?: number
  salt?: number
  micro?: Micro
}

/** dzienniczek dnia: sen (z nocy poprzedzającej ten dzień), woda, samopoczucie, notatka */
export interface DayLog {
  date: string
  sleepH?: number
  sleepQ?: number
  water?: number
  energy?: number
  note?: string
  /** aktywność – wpisywana ręcznie, np. z zegarka */
  steps?: number
  kcalRest?: number
  kcalActive?: number
  activity?: string
}

export type Sex = 'm' | 'f'
export type Goal = 'cut' | 'maintain' | 'bulk'

export interface Profile {
  sex: Sex
  age: number
  height: number
  weight: number
  bodyFat?: number
  activity: number
  goal: Goal
  /** cut: % masy ciała / tydzień, bulk: % masy ciała / miesiąc */
  rate: number
  experience: 'początkujący' | 'średniozaawansowany' | 'zaawansowany'
}

export interface MacroTargets {
  kcal: number
  p: number
  f: number
  c: number
  fiber?: number
}
