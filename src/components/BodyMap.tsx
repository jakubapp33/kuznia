import type { MuscleId } from '../types'

/** Uproszczona sylwetka: kształty dla lewej połowy ciała, prawa połowa jest lustrzanym odbiciem. */
const SILHOUETTE = [
  'M100 62 L80 65 L66 70 L63 110 L69 190 L67 214 L100 222 Z',
  'M66 68 C52 70 46 84 47 100 C46 120 46 135 48 146 L62 146 C64 130 66 110 66 96 Z',
  'M48 144 C42 160 38 186 37 210 L49 212 C54 190 60 168 62 146 Z',
  'M37 208 C33 216 33 228 38 234 C43 236 48 230 49 222 L49 210 Z',
  'M68 200 C60 230 62 270 68 302 L97 304 C99 270 100 240 100 216 Z',
  'M68 300 C63 330 64 360 70 384 L86 386 C90 360 94 330 96 302 Z',
  'M70 382 C64 388 66 394 74 395 L90 395 C92 390 90 385 86 384 Z',
]

type Shapes = Partial<Record<MuscleId, string[]>>

const FRONT: Shapes = {
  traps: ['M98 58 L90 63 L72 69 L86 70 L98 66 Z'],
  'side-delts': ['M67 69 C56 70 49 80 50 96 L56 97 C56 85 60 76 70 71 Z'],
  'front-delts': ['M71 71 C61 76 57 86 57 98 L64 100 C66 90 70 82 79 75 Z'],
  chest: ['M98 72 L80 74 C70 80 65 92 67 105 C73 115 88 117 98 113 Z'],
  biceps: ['M57 101 C51 113 49 127 51 141 L60 143 C64 129 64 113 64 103 Z'],
  forearms: ['M50 147 C44 163 40 183 39 205 L48 207 C54 187 59 167 61 149 Z'],
  abs: ['M98 118 L87 119 C85 141 85 168 88 196 L98 200 Z'],
  obliques: ['M85 118 L69 110 C68 132 70 160 74 188 L86 196 C83 168 83 140 85 120 Z'],
  abductors: ['M71 200 L67 214 C65 226 66 236 68 242 C70 228 72 218 77 209 Z'],
  quads: ['M75 212 C66 236 66 270 71 296 L85 299 C90 278 93 250 93 226 Z'],
  adductors: ['M96 220 L94 228 C94 250 91 270 88 290 L96 282 C98 262 99 242 99 224 Z'],
  calves: ['M71 318 C66 334 66 352 70 370 L76 370 C77 352 77 334 75 318 Z'],
}

const BACK: Shapes = {
  traps: ['M100 54 L90 60 L70 70 L84 76 L100 82 Z'],
  'upper-back': ['M100 84 L84 78 L77 84 C81 101 90 116 100 128 Z'],
  'side-delts': ['M67 69 C57 70 50 80 50 95 L54 95 C55 84 59 76 69 71 Z'],
  'rear-delts': ['M70 71 C61 75 56 85 55 97 L62 99 C64 89 69 81 78 77 Z'],
  triceps: ['M55 101 C49 114 49 128 51 142 L62 143 C64 128 64 113 61 101 Z'],
  forearms: ['M50 147 C44 163 40 183 39 205 L48 207 C54 187 59 167 61 149 Z'],
  lats: ['M75 84 C67 98 67 122 73 150 C80 166 90 172 98 176 L98 134 C88 121 79 102 77 86 Z'],
  'lower-back': ['M99 138 L90 150 C88 168 88 182 90 196 L99 199 Z'],
  abductors: ['M80 194 C72 194 67 202 66 214 C69 205 75 200 84 199 Z'],
  glutes: ['M99 201 L82 199 C70 206 67 226 71 240 C80 250 92 249 99 243 Z'],
  hamstrings: ['M71 246 C67 266 69 290 75 302 L94 302 C96 282 98 262 98 249 Z'],
  calves: ['M71 312 C65 330 67 350 74 366 L85 366 C91 350 94 332 92 312 Z'],
}

const MIRROR = 'matrix(-1 0 0 1 200 0)'

function View({ shapes, primary, secondary, label }: { shapes: Shapes; primary: Set<MuscleId>; secondary: Set<MuscleId>; label: string }) {
  return (
    <svg viewBox="0 0 200 400" role="img" aria-label={label}>
      <ellipse className="base" cx="100" cy="32" rx="17" ry="21" />
      <rect className="base" x="91" y="48" width="18" height="16" rx="4" />
      {SILHOUETTE.map((d, i) => (
        <g key={i}>
          <path className="base" d={d} />
          <path className="base" d={d} transform={MIRROR} />
        </g>
      ))}
      {(Object.entries(shapes) as [MuscleId, string[]][]).map(([m, ds]) => {
        const cls = 'm' + (primary.has(m) ? ' p' : secondary.has(m) ? ' s' : '')
        return ds.map((d, i) => (
          <g key={m + i}>
            <path className={cls} d={d} />
            <path className={cls} d={d} transform={MIRROR} />
          </g>
        ))
      })}
    </svg>
  )
}

export function BodyMap({ primary, secondary = [], compact }: { primary: MuscleId[]; secondary?: MuscleId[]; compact?: boolean }) {
  const p = new Set(primary)
  const s = new Set(secondary)
  return (
    <div>
      <div className="bodymap" style={compact ? { maxWidth: 220, margin: '0 auto' } : undefined}>
        <View shapes={FRONT} primary={p} secondary={s} label="Przód ciała" />
        <View shapes={BACK} primary={p} secondary={s} label="Tył ciała" />
      </div>
      {!compact && (
        <div className="legend" style={{ marginTop: 8 }}>
          <span><i style={{ background: 'var(--accent)' }} />główne</span>
          <span><i style={{ background: 'color-mix(in srgb, var(--accent) 42%, var(--body-line))' }} />pomocnicze</span>
        </div>
      )}
    </div>
  )
}

/** mapa „ciepła” – intensywność koloru wg wartości 0..1 dla każdego mięśnia */
export function HeatMap({ values }: { values: Partial<Record<MuscleId, number>> }) {
  const render = (shapes: Shapes, label: string) => (
    <svg viewBox="0 0 200 400" role="img" aria-label={label}>
      <ellipse className="base" cx="100" cy="32" rx="17" ry="21" />
      <rect className="base" x="91" y="48" width="18" height="16" rx="4" />
      {SILHOUETTE.map((d, i) => (
        <g key={i}>
          <path className="base" d={d} />
          <path className="base" d={d} transform={MIRROR} />
        </g>
      ))}
      {(Object.entries(shapes) as [MuscleId, string[]][]).map(([m, ds]) => {
        const v = Math.max(0, Math.min(1, values[m] ?? 0))
        const fill = v > 0 ? `color-mix(in srgb, var(--accent) ${Math.round(20 + v * 80)}%, var(--body-line))` : undefined
        return ds.map((d, i) => (
          <g key={m + i}>
            <path className="m" d={d} style={fill ? { fill } : undefined} />
            <path className="m" d={d} transform={MIRROR} style={fill ? { fill } : undefined} />
          </g>
        ))
      })}
    </svg>
  )
  return (
    <div className="bodymap">
      {render(FRONT, 'Przód ciała')}
      {render(BACK, 'Tył ciała')}
    </div>
  )
}
