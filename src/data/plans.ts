import type { PlanDay, PlanExercise, PlanTemplate } from '../types'

/** id, serie, zakres powtórzeń „8-12”, RIR, przerwa w sekundach */
function e(exerciseId: string, sets: number, reps: string, rir = 2, restSec = 120): PlanExercise {
  const [a, b] = reps.split('-').map(Number)
  return { exerciseId, sets, repMin: a, repMax: b ?? a, rir, restSec }
}

function day(id: string, name: string, exercises: PlanExercise[]): PlanDay {
  return { id, name, exercises }
}

const COMMON_WHY = [
  'Każda partia mięśniowa trenowana 2× w tygodniu – częstotliwość, która przy tej samej objętości daje co najmniej tak dobre efekty jak 1×.',
  'Serie kończone 1–3 powtórzenia przed upadkiem mięśniowym (RIR 1–3) – blisko maksymalnego bodźca przy mniejszym zmęczeniu.',
  'Progresja podwójna: gdy zrobisz górę zakresu powtórzeń we wszystkich seriach, zwiększ ciężar.',
]

export const TEMPLATES: PlanTemplate[] = [
  {
    id: 'fbw-3',
    name: 'FBW – całe ciało 3× w tygodniu',
    level: 'początkujący',
    perWeek: '3 treningi (np. pon / śr / pt)',
    equipment: 'siłownia',
    description: 'Dwa treningi całego ciała (A i B) wykonywane naprzemiennie. Najlepszy start: dużo nauki techniki i szybki postęp siły.',
    why: [
      'U początkujących trening całego ciała 3× w tygodniu daje szybki przyrost siły i masy – każdy ruch ćwiczysz często.',
      'Ok. 9–14 serii tygodniowo na główne partie – w zakresie skutecznym dla osób zaczynających.',
      ...COMMON_WHY.slice(1),
    ],
    days: [
      day('a', 'Trening A', [
        e('back-squat', 3, '6-10', 2, 180),
        e('bench-press', 3, '6-10', 2, 180),
        e('barbell-row', 3, '8-12', 2, 120),
        e('rdl', 2, '8-12', 2, 120),
        e('lateral-raise', 2, '12-20', 1, 60),
        e('db-curl', 2, '10-15', 1, 60),
      ]),
      day('b', 'Trening B', [
        e('leg-press', 3, '10-15', 2, 120),
        e('ohp', 3, '6-10', 2, 150),
        e('lat-pulldown', 3, '8-12', 2, 120),
        e('incline-db-press', 2, '8-12', 2, 120),
        e('lying-leg-curl', 2, '10-15', 1, 90),
        e('rope-pushdown', 2, '10-15', 1, 60),
        e('plank', 2, '30-60', 2, 60),
      ]),
    ],
  },
  {
    id: 'upper-lower-4',
    name: 'Góra / Dół 4× w tygodniu',
    level: 'średniozaawansowany',
    perWeek: '4 treningi (np. pon / wt / czw / pt)',
    equipment: 'siłownia',
    description: 'Dwa treningi górnej i dwa dolnej części ciała. Więcej objętości na partię i krótsze treningi niż w FBW.',
    why: [
      'Ok. 12–18 serii tygodniowo na partię – w zakresie 10–20 serii, który w metaanalizach daje największy przyrost masy.',
      ...COMMON_WHY,
      'Ćwiczenia w pozycji rozciągnięcia mięśnia (np. uginanie na ławce skośnej, prostowanie nad głową, uginanie nóg siedząc) – badania wskazują na lepszą hipertrofię.',
    ],
    days: [
      day('u1', 'Góra 1', [
        e('bench-press', 3, '5-8', 2, 180),
        e('barbell-row', 3, '6-10', 2, 150),
        e('seated-db-press', 2, '8-12', 2, 120),
        e('lat-pulldown', 3, '8-12', 2, 120),
        e('lateral-raise', 3, '12-20', 1, 60),
        e('incline-db-curl', 2, '10-15', 1, 60),
        e('overhead-cable-extension', 2, '10-15', 1, 60),
      ]),
      day('l1', 'Dół 1', [
        e('back-squat', 3, '5-8', 2, 180),
        e('rdl', 3, '6-10', 2, 150),
        e('leg-press', 2, '10-15', 1, 120),
        e('seated-leg-curl', 3, '10-15', 1, 90),
        e('standing-calf-raise', 3, '10-15', 1, 60),
        e('cable-crunch', 3, '10-15', 1, 60),
      ]),
      day('u2', 'Góra 2', [
        e('incline-db-press', 3, '8-12', 2, 150),
        e('pull-up', 3, '6-10', 2, 150),
        e('machine-chest-press', 2, '10-15', 1, 120),
        e('chest-supported-row', 3, '10-15', 1, 120),
        e('cable-lateral-raise', 3, '12-20', 1, 60),
        e('reverse-pec-deck', 2, '12-20', 1, 60),
        e('hammer-curl', 2, '10-15', 1, 60),
        e('rope-pushdown', 2, '10-15', 1, 60),
      ]),
      day('l2', 'Dół 2', [
        e('hack-squat', 3, '8-12', 2, 150),
        e('hip-thrust', 3, '8-12', 2, 120),
        e('bulgarian-split-squat', 2, '8-12', 2, 90),
        e('leg-extension', 2, '12-15', 1, 60),
        e('lying-leg-curl', 2, '10-15', 1, 60),
        e('seated-calf-raise', 3, '12-20', 1, 60),
        e('hanging-leg-raise', 3, '8-15', 1, 60),
      ]),
    ],
  },
  {
    id: 'ppl-6',
    name: 'Push / Pull / Legs (PPL)',
    level: 'średniozaawansowany',
    perWeek: '6 treningów (P/P/L × 2) lub 3 treningi w wersji lżejszej',
    equipment: 'siłownia',
    description: 'Pchanie (klatka, barki, triceps), przyciąganie (plecy, biceps), nogi. Przy 6 dniach każda partia 2× w tygodniu.',
    why: [
      'Przy 6 treningach: ok. 14–20 serii na partię tygodniowo – górny zakres skutecznej objętości dla osób z doświadczeniem.',
      'Przy 3 treningach (każdy dzień raz) objętość spada do ok. 7–10 serii – wystarczy na utrzymanie lub powolny postęp.',
      ...COMMON_WHY.slice(1),
    ],
    days: [
      day('push', 'Push – pchanie', [
        e('bench-press', 3, '6-10', 2, 180),
        e('seated-db-press', 3, '8-12', 2, 120),
        e('incline-db-press', 2, '8-12', 2, 120),
        e('cable-fly', 2, '12-15', 1, 60),
        e('lateral-raise', 3, '12-20', 1, 60),
        e('overhead-cable-extension', 3, '10-15', 1, 60),
      ]),
      day('pull', 'Pull – przyciąganie', [
        e('pull-up', 3, '6-10', 2, 150),
        e('barbell-row', 3, '8-12', 2, 120),
        e('seated-cable-row', 2, '10-15', 1, 90),
        e('face-pull', 3, '12-20', 1, 60),
        e('incline-db-curl', 2, '10-15', 1, 60),
        e('hammer-curl', 2, '10-15', 1, 60),
      ]),
      day('legs', 'Legs – nogi', [
        e('back-squat', 3, '6-10', 2, 180),
        e('rdl', 3, '8-12', 2, 150),
        e('leg-press', 2, '10-15', 1, 120),
        e('seated-leg-curl', 3, '10-15', 1, 90),
        e('standing-calf-raise', 3, '10-15', 1, 60),
        e('hanging-knee-raise', 3, '10-15', 1, 60),
      ]),
    ],
  },
  {
    id: 'fbw-2-minimal',
    name: 'Minimum – całe ciało 2× w tygodniu',
    level: 'każdy',
    perWeek: '2 treningi po ok. 45 minut',
    equipment: 'siłownia',
    description: 'Dla zabieganych. Mało ćwiczeń, same najważniejsze. Wystarcza, by budować siłę i masę na starcie albo utrzymać formę.',
    why: [
      'Badania pokazują, że nawet ok. 4–6 ciężkich serii na partię tygodniowo daje wyraźne efekty, szczególnie u początkujących.',
      'Ćwiczenia wielostawowe pokrywają wiele mięśni jednocześnie.',
      ...COMMON_WHY.slice(1),
    ],
    days: [
      day('a', 'Trening A', [
        e('back-squat', 3, '6-10', 2, 180),
        e('bench-press', 3, '6-10', 2, 180),
        e('lat-pulldown', 3, '8-12', 2, 120),
        e('lateral-raise', 2, '12-20', 1, 60),
      ]),
      day('b', 'Trening B', [
        e('rdl', 3, '6-10', 2, 150),
        e('incline-db-press', 3, '8-12', 2, 120),
        e('seated-cable-row', 3, '8-12', 2, 120),
        e('leg-press', 2, '10-15', 1, 120),
      ]),
    ],
  },
  {
    id: 'home-3',
    name: 'Dom – hantle i masa ciała 3×',
    level: 'początkujący',
    perWeek: '3 treningi',
    equipment: 'para hantli, drążek (opcjonalnie), krzesło',
    description: 'Trening całego ciała w domu. Postęp robisz, dokładając powtórzenia i przechodząc na trudniejsze wersje ćwiczeń.',
    why: [
      'Masa mięśniowa rośnie podobnie przy lekkich i ciężkich ciężarach (ok. 6–30 powtórzeń), jeśli serie są blisko upadku – w domu to kluczowe.',
      'Wyższe zakresy powtórzeń (do 30) są tu w porządku, ale kończ serie z zapasem 0–2 powtórzeń.',
      COMMON_WHY[2],
    ],
    days: [
      day('a', 'Trening A', [
        e('goblet-squat', 3, '10-20', 1, 90),
        e('push-up', 3, '8-20', 1, 90),
        e('db-row', 3, '10-15', 1, 90),
        e('db-rdl', 3, '10-15', 1, 90),
        e('lateral-raise', 2, '12-20', 1, 60),
        e('plank', 2, '30-60', 1, 60),
      ]),
      day('b', 'Trening B', [
        e('bulgarian-split-squat', 3, '8-15', 1, 90),
        e('pike-push-up', 3, '6-15', 1, 90),
        e('chin-up', 3, '5-12', 1, 120),
        e('glute-bridge', 3, '12-20', 1, 60),
        e('db-curl', 2, '10-15', 1, 60),
        e('bench-dip', 2, '10-20', 1, 60),
      ]),
    ],
  },
]

export const TEMPLATE_MAP = new Map(TEMPLATES.map((t) => [t.id, t]))
