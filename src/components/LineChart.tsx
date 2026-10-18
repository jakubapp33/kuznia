import { fmtShort, num } from '../lib/format'

export interface Point {
  date: string
  value: number
}

/** prosty wykres liniowy w SVG – bez zewnętrznych bibliotek */
export function LineChart({ points, unit = '', height = 160, digits = 1 }: { points: Point[]; unit?: string; height?: number; digits?: number }) {
  if (points.length === 0) return null
  const W = 340
  const H = height
  const padL = 34
  const padR = 10
  const padT = 12
  const padB = 22
  const xs = points.map((p) => new Date(p.date).getTime())
  const ys = points.map((p) => p.value)
  let minY = Math.min(...ys)
  let maxY = Math.max(...ys)
  if (minY === maxY) {
    minY -= 1
    maxY += 1
  }
  const pad = (maxY - minY) * 0.12
  minY -= pad
  maxY += pad
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const sx = (x: number) => (maxX === minX ? (padL + W - padR) / 2 : padL + ((x - minX) / (maxX - minX)) * (W - padL - padR))
  const sy = (y: number) => padT + (1 - (y - minY) / (maxY - minY)) * (H - padT - padB)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(xs[i]).toFixed(1)} ${sy(p.value).toFixed(1)}`).join(' ')
  const area = `${d} L${sx(xs[xs.length - 1]).toFixed(1)} ${H - padB} L${sx(xs[0]).toFixed(1)} ${H - padB} Z`
  const ticks = [minY + pad, (minY + maxY) / 2, maxY - pad]
  const xLabels = points.length === 1 ? [0] : [0, Math.floor((points.length - 1) / 2), points.length - 1]
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Wykres, ostatnia wartość ${num(ys[ys.length - 1], digits)} ${unit}`}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid" x1={padL} x2={W - padR} y1={sy(t)} y2={sy(t)} />
          <text className="axis" x={padL - 6} y={sy(t) + 3} textAnchor="end">{num(t, t >= 100 ? 0 : digits)}</text>
        </g>
      ))}
      {[...new Set(xLabels)].map((i) => (
        <text key={i} className="axis" x={sx(xs[i])} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
          {fmtShort(points[i].date)}
        </text>
      ))}
      {points.length > 1 && <path className="area" d={area} />}
      {points.length > 1 && <path className="line" d={d} />}
      {points.length <= 30 && points.map((p, i) => <circle key={i} className="dot" cx={sx(xs[i])} cy={sy(p.value)} r={3.5} />)}
    </svg>
  )
}
