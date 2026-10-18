// Generuje ikony PNG z public/favicon.svg (npm run icons)
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
// iOS sam zaokrągla rogi – dla apple-touch-icon i maskable rysujemy pełny kwadrat
const square = svg.replace('rx="114"', 'rx="0"')
// maskable: znak pomniejszony do bezpiecznej strefy (80%)
const maskable = square.replace(/(<path[\s\S]*<\/g>)/, '<g transform="translate(51 51) scale(0.8)">$1</g>')

const out = [
  [svg, 192, 'icon-192.png'],
  [svg, 512, 'icon-512.png'],
  [maskable, 512, 'icon-maskable-512.png'],
  [square, 180, 'apple-touch-icon.png'],
]
for (const [src, size, name] of out) {
  const png = new Resvg(src, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), png)
  console.log('✓', name)
}
