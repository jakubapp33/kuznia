import Dexie, { type EntityTable } from 'dexie'
import type { BodyEntry, DayLog, Exercise, Food, FoodLogEntry, Plan, Workout } from '../types'

export interface SettingRow {
  key: string
  value: unknown
}

export const db = new Dexie('kuznia') as Dexie & {
  plans: EntityTable<Plan, 'id'>
  workouts: EntityTable<Workout, 'id'>
  body: EntityTable<BodyEntry, 'id'>
  foods: EntityTable<Food, 'id'>
  foodLog: EntityTable<FoodLogEntry, 'id'>
  customExercises: EntityTable<Exercise, 'id'>
  settings: EntityTable<SettingRow, 'key'>
  days: EntityTable<DayLog, 'date'>
}

db.version(1).stores({
  plans: '++id, createdAt',
  workouts: '++id, date, startedAt, finishedAt, planId',
  body: '++id, &date',
  foods: 'id, name, barcode, lastUsed, fav',
  foodLog: '++id, date, foodId',
  customExercises: 'id',
  settings: 'key',
})

db.version(2).stores({
  days: 'date',
})

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await db.settings.get(key))?.value as T | undefined
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

export const TABLES = ['plans', 'workouts', 'body', 'foods', 'foodLog', 'customExercises', 'settings', 'days'] as const

/** kopia zapasowa całej bazy do obiektu JSON */
export async function exportAll() {
  const out: Record<string, unknown[]> = {}
  for (const t of TABLES) out[t] = await db.table(t).toArray()
  return { app: 'kuznia', version: 1, exportedAt: new Date().toISOString(), data: out }
}

export async function importAll(json: unknown) {
  const j = json as { app?: string; data?: Record<string, unknown[]> }
  if (j?.app !== 'kuznia' || !j.data) throw new Error('To nie jest plik kopii zapasowej Kuźni.')
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      if (Array.isArray(j.data![t])) await db.table(t).bulkPut(j.data![t])
    }
  })
}

export async function updateDay(date: string, patch: Partial<DayLog>) {
  const cur = await db.days.get(date)
  await db.days.put({ ...(cur ?? { date }), ...patch, date })
}
