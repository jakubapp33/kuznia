import type { MuscleId } from '../types'

export const MUSCLES: Record<MuscleId, string> = {
  chest: 'Klatka piersiowa',
  'front-delts': 'Przedni akton barków',
  'side-delts': 'Boczny akton barków',
  'rear-delts': 'Tylny akton barków',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Przedramiona',
  abs: 'Mięsień prosty brzucha',
  obliques: 'Mięśnie skośne brzucha',
  traps: 'Czworoboczny (kaptury)',
  lats: 'Najszerszy grzbietu',
  'upper-back': 'Środek pleców (równoległoboczne)',
  'lower-back': 'Prostowniki grzbietu',
  glutes: 'Pośladki',
  abductors: 'Odwodziciele (pośladek średni)',
  adductors: 'Przywodziciele',
  quads: 'Czworogłowe uda',
  hamstrings: 'Tył uda (dwugłowe)',
  calves: 'Łydki',
}

/** grupy do liczenia tygodniowej objętości i filtrów */
export interface MuscleGroup {
  id: string
  name: string
  muscles: MuscleId[]
}

export const GROUPS: MuscleGroup[] = [
  { id: 'chest', name: 'Klatka', muscles: ['chest'] },
  { id: 'back', name: 'Plecy', muscles: ['lats', 'upper-back', 'traps'] },
  { id: 'shoulders', name: 'Barki', muscles: ['front-delts', 'side-delts', 'rear-delts'] },
  { id: 'biceps', name: 'Biceps', muscles: ['biceps'] },
  { id: 'triceps', name: 'Triceps', muscles: ['triceps'] },
  { id: 'quads', name: 'Czworogłowe', muscles: ['quads'] },
  { id: 'hamstrings', name: 'Tył uda', muscles: ['hamstrings'] },
  { id: 'glutes', name: 'Pośladki', muscles: ['glutes', 'abductors', 'adductors'] },
  { id: 'calves', name: 'Łydki', muscles: ['calves'] },
  { id: 'core', name: 'Brzuch', muscles: ['abs', 'obliques', 'lower-back'] },
  { id: 'forearms', name: 'Przedramiona', muscles: ['forearms'] },
]

export function groupOf(m: MuscleId): MuscleGroup {
  return GROUPS.find((g) => g.muscles.includes(m))!
}
