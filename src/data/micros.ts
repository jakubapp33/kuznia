import type { Sex } from '../types'

export interface MicroInfo {
  key: string
  name: string
  unit: string
  group: 'mineral' | 'vitamin' | 'other'
  /** dzienna norma dla mężczyzn i kobiet (RDA lub AI, normy żywienia dla populacji Polski, dorośli 19–30 lat) */
  norm: [number, number]
  /** dla nastolatków 13–18 lat, gdy norma wyraźnie inna */
  teen?: [number, number]
}

export const MICRO_INFO: MicroInfo[] = [
  { key: 'na', name: 'Sód', unit: 'mg', group: 'mineral', norm: [1500, 1500] },
  { key: 'k', name: 'Potas', unit: 'mg', group: 'mineral', norm: [3500, 3500] },
  { key: 'ca', name: 'Wapń', unit: 'mg', group: 'mineral', norm: [1000, 1000], teen: [1300, 1300] },
  { key: 'mg', name: 'Magnez', unit: 'mg', group: 'mineral', norm: [400, 310], teen: [410, 360] },
  { key: 'fe', name: 'Żelazo', unit: 'mg', group: 'mineral', norm: [10, 18], teen: [11, 15] },
  { key: 'zn', name: 'Cynk', unit: 'mg', group: 'mineral', norm: [11, 8], teen: [11, 9] },
  { key: 'p', name: 'Fosfor', unit: 'mg', group: 'mineral', norm: [700, 700], teen: [1250, 1250] },
  { key: 'vc', name: 'Witamina C', unit: 'mg', group: 'vitamin', norm: [90, 75], teen: [75, 65] },
  { key: 'vd', name: 'Witamina D', unit: 'µg', group: 'vitamin', norm: [15, 15] },
  { key: 'b12', name: 'Witamina B12', unit: 'µg', group: 'vitamin', norm: [2.4, 2.4] },
  { key: 'va', name: 'Witamina A', unit: 'µg', group: 'vitamin', norm: [900, 700] },
  { key: 've', name: 'Witamina E', unit: 'mg', group: 'vitamin', norm: [10, 8] },
  { key: 'b1', name: 'Witamina B1', unit: 'mg', group: 'vitamin', norm: [1.3, 1.1], teen: [1.2, 1.0] },
  { key: 'b2', name: 'Witamina B2', unit: 'mg', group: 'vitamin', norm: [1.3, 1.1], teen: [1.3, 1.0] },
  { key: 'b3', name: 'Niacyna (B3)', unit: 'mg', group: 'vitamin', norm: [16, 14] },
  { key: 'b6', name: 'Witamina B6', unit: 'mg', group: 'vitamin', norm: [1.3, 1.3], teen: [1.3, 1.2] },
  { key: 'b9', name: 'Foliany (B9)', unit: 'µg', group: 'vitamin', norm: [400, 400] },
  { key: 'chol', name: 'Cholesterol', unit: 'mg', group: 'other', norm: [0, 0] },
]

export const MICRO_MAP = new Map(MICRO_INFO.map((m) => [m.key, m]))

export function microNorm(m: MicroInfo, sex: Sex = 'm', age = 25): number {
  const n = age < 19 && m.teen ? m.teen : m.norm
  return sex === 'm' ? n[0] : n[1]
}

/** limity „nie więcej niż” liczone od kaloryczności (WHO / normy) */
export function limits(kcal: number) {
  return {
    sugar: (kcal * 0.1) / 4, // cukry ≤ 10% energii
    satFat: (kcal * 0.1) / 9, // kwasy nasycone ≤ 10% energii
    salt: 5, // sól ≤ 5 g
  }
}
