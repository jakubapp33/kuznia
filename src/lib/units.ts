import type { Food } from '../types'
import { norm } from './search'

/** miara domowa: formy [1, 2–4, 5+] i masa jednej miary w gramach */
export interface Unit {
  n: [string, string, string]
  g: number
}

const U = (one: string, few: string, many: string, g: number): Unit => ({ n: [one, few, many], g })

const LYZECZKA = (g: number) => U('łyżeczka', 'łyżeczki', 'łyżeczek', g)
const LYZKA = (g: number) => U('łyżka', 'łyżki', 'łyżek', g)
const SZTUKA = (g: number) => U('sztuka', 'sztuki', 'sztuk', g)
const PLACEK = (g: number) => U('placek', 'placki', 'placków', g)
const PLASTER = (g: number) => U('plaster', 'plastry', 'plastrów', g)
const KROMKA = (g: number) => U('kromka', 'kromki', 'kromek', g)
const SZKLANKA = (g: number) => U('szklanka', 'szklanki', 'szklanek', g)
const GARSC = (g: number) => U('garść', 'garści', 'garści', g)
const KUBEK = (g: number) => U('kubek', 'kubki', 'kubków', g)
const TALERZ = (g: number) => U('talerz', 'talerze', 'talerzy', g)
const KOSTKA = (g: number) => U('kostka', 'kostki', 'kostek', g)
const PLASTEREK = (g: number) => U('plasterek', 'plasterki', 'plasterków', g)
const ZABEK = (g: number) => U('ząbek', 'ząbki', 'ząbków', g)
const MIARKA = (g: number) => U('miarka', 'miarki', 'miarek', g)
const KAWALEK = (g: number) => U('kawałek', 'kawałki', 'kawałków', g)
const PUSZKA = (g: number) => U('puszka', 'puszki', 'puszek', g)
const BUTELKA = (g: number) => U('butelka', 'butelki', 'butelek', g)
const WOREK = (g: number) => U('woreczek', 'woreczki', 'woreczków', g)
const GALKA = (g: number) => U('gałka', 'gałki', 'gałek', g)
const ML = U('ml', 'ml', 'ml', 1)

/**
 * Reguły po nazwie produktu (po normalizacji: małe litery, bez polskich znaków).
 * Kolejność ma znaczenie – pierwsza pasująca wygrywa, więc bardziej szczegółowe są wyżej.
 * Masy miar wg typowych tabel miar domowych (IŻŻ, tabele Kunachowicz) – w przybliżeniu.
 */
const RULES: [RegExp, Unit[]][] = [
  [/odzywk|bialko w proszku|protein powder|\bwhey\b|\bwpc\b|\bwpi\b|gainer|kreatyn/, [MIARKA(30), LYZKA(10)]],
  [/maslo orzech|krem orzech|krem czekolad|nutella|maslo migdal|tahini|pasta sezam/, [LYZECZKA(8), LYZKA(16)]],
  [/\bmiod/, [LYZECZKA(12), LYZKA(24)]],
  [/dzem|konfitur|powidl|marmolad|syrop|melas/, [LYZECZKA(10), LYZKA(20)]],
  [/cukier puder/, [LYZECZKA(3), LYZKA(9)]],
  [/\bcukier|ksylitol|erytrytol|slodzik/, [LYZECZKA(5), LYZKA(14)]],
  [/\bsol\b|\bsol /, [U('szczypta', 'szczypty', 'szczypt', 0.5), LYZECZKA(6)]],
  [/kakao|cynamon|przyprawa|papryka slodka mielona|curry/, [LYZECZKA(3), LYZKA(8)]],
  [/\bolej|oliwa|oliwy/, [LYZECZKA(4.5), LYZKA(13), ML]],
  [/maslo klarowane|ghee|smalec/, [LYZECZKA(5), LYZKA(13)]],
  [/\bmaslo\b|margaryn|maselko/, [LYZECZKA(5), PLASTEREK(10), LYZKA(15)]],
  [/majonez|ketchup|musztard|sos |sos$|dressing|chrzan|pesto|hummus/, [LYZECZKA(6), LYZKA(15)]],
  [/smietan|smietank/, [LYZECZKA(6), LYZKA(15), SZKLANKA(240)]],
  [/serek homogen|serek waniliow|danio|skyr|jogurt|kefir|maslank|zsiadle|actimel|jogobella/, [LYZKA(20), KUBEK(150), SZKLANKA(250)]],
  [/serek wiejski|twarozek|serek kanapk|serek smietank|almette|philadelphia|mascarpone|ricotta|serek topion/, [LYZKA(20), LYZECZKA(8)]],
  [/twarog/, [PLASTER(30), LYZKA(20)]],
  [/mozzarell/, [U('kulka', 'kulki', 'kulek', 125), PLASTER(20)]],
  [/parmezan|grana padano/, [LYZKA(8)]],
  [/\bser\b|gouda|edam|cheddar|ementaler|morski|salami|mortadel/, [PLASTER(18)]],
  [/szynk|poledwic|wedlin|baleron|pieczen|schab wedz|indyk wedz|kurczak wedz|filet z kurczaka wedz|poledwiczk/, [PLASTER(12)]],
  [/kabanos/, [SZTUKA(25)]],
  [/parowk|frankfurt/, [SZTUKA(40)]],
  [/kielbas/, [PLASTER(10), KAWALEK(100)]],
  [/pasztet|smarowidlo/, [PLASTER(25), LYZKA(20)]],
  [/jajk|jaja|\bjajo|omlet/, [SZTUKA(55)]],
  [/bialko jaj/, [SZTUKA(33)]],
  [/pieczywo chrupk|wasa|knackebrod/, [SZTUKA(10)]],
  [/bulka tarta|panierk/, [LYZKA(10)]],
  [/chleb tost|tostow/, [KROMKA(25)]],
  [/chleb|pieczywo|razow|graham|orkisz.*chleb|zytni/, [KROMKA(35)]],
  [/wafl.*ryz|wafle ryz|wafel ryz|wafle kukur/, [SZTUKA(10)]],
  [/kajzerk|bulk|grahamk|rogal|croissant|paczek|drozdzowk|bajgiel|bagel|obwarzan|kaiser/, [SZTUKA(60)]],
  [/bagiet/, [KAWALEK(60), SZTUKA(250)]],
  [/tortill|wrap|pita|lawasz/, [PLACEK(60)]],
  [/platki owsian|platki jaglan|platki zyt|platki jeczm|platki orkisz|owsiank|otreby/, [LYZKA(10), SZKLANKA(90), GARSC(30)]],
  [/musli|granola|platki/, [LYZKA(10), SZKLANKA(80), GARSC(30)]],
  [/maka/, [LYZKA(10), SZKLANKA(130)]],
  [/kaszank/, [PLASTER(30)]],
  [/ryz|kasz|kuskus|bulgur|quinoa|komos|amarantus|pęczak|peczak/, [LYZKA(15), WOREK(100), SZKLANKA(180)]],
  [/makaron|spaghetti|penne|fusilli|tagliatelle|lasagne/, [GARSC(50), SZKLANKA(100)]],
  [/orzech|migdal|nerkowc|pistacj|laskow|arachid|pekan|makadami|pestk|slonecznik|rodzynk|zurawin|suszon|daktyl|figi|morel.*susz|sliwk.*susz|mieszank.*studenck|bakali/, [GARSC(30), LYZKA(12), SZTUKA(4)]],
  [/siemie|chia|sezam|\bmak\b|len /, [LYZECZKA(4), LYZKA(10)]],
  [/czekolad(?!ow)/, [KOSTKA(5), U('rząd', 'rzędy', 'rzędów', 20), U('tabliczka', 'tabliczki', 'tabliczek', 100)]],
  [/lody/, [GALKA(50)]],
  [/pierog|uszk|kolduny|pielmieni|gyoza/, [SZTUKA(35)]],
  [/nalesnik/, [SZTUKA(80)]],
  [/placki ziem|placek ziem|racuch|pancake|placuszk/, [SZTUKA(60)]],
  [/mieso mielon|mielone (wol|wiep|z indyk|z kurcz)|mielony (wol|wiep)/, []],
  [/kotlet|schabow|mielon|de volaille|sznycel|filet panier/, [SZTUKA(130)]],
  [/nugget/, [SZTUKA(18)]],
  [/pizza/, [KAWALEK(110)]],
  [/zupa|rosol|zurek|barszcz|krupnik|ogorkow|grochow|kapusniak|zalewajk|flaki|krem z/, [TALERZ(300), U('miseczka', 'miseczki', 'miseczek', 250)]],
  [/ciast|sernik|szarlotk|makowiec|babk|tort|brownie|tiramisu|keks|piernik/, [KAWALEK(100)]],
  [/herbatnik|ciastk|biszkopt|krakers|markiz|delicj|wafelek|wafl/, [SZTUKA(8)]],
  [/baton/, [SZTUKA(45)]],
  [/zelk|cukierk|landryn/, [SZTUKA(4)]],
  [/chips|chrupk|paluszk|popcorn|precel/, [GARSC(20)]],
  [/puszk|cola|pepsi|sprite|fanta|energet|monster|red bull|tiger|oshee|izoton/, [PUSZKA(330), BUTELKA(500), SZKLANKA(250), ML]],
  [/piwo/, [BUTELKA(500), PUSZKA(500), ML]],
  [/\bwino\b/, [U('kieliszek', 'kieliszki', 'kieliszków', 150), ML]],
  [/wodk|whisk|\brum\b|\bgin\b|likier/, [U('kieliszek', 'kieliszki', 'kieliszków', 40), ML]],
  [/\bkawa|herbat|latte|cappuccino|espresso/, [U('filiżanka', 'filiżanki', 'filiżanek', 150), KUBEK(250), ML]],
  [/mleko|napoj|sok|nektar|lemoniad|kompot|smoothie|koktajl|woda|maslank|kefir/, [SZKLANKA(250), BUTELKA(500), ML]],
  [/czosn/, [ZABEK(5)]],
  [/banan/, [SZTUKA(120)]],
  [/jablk/, [SZTUKA(180)]],
  [/grusz/, [SZTUKA(170)]],
  [/pomarancz|grejpfrut/, [SZTUKA(200)]],
  [/mandaryn|klementyn/, [SZTUKA(70)]],
  [/kiwi/, [SZTUKA(75)]],
  [/brzoskwin|nektaryn/, [SZTUKA(140)]],
  [/sliwk/, [SZTUKA(35)]],
  [/morel/, [SZTUKA(40)]],
  [/cytryn|limonk/, [SZTUKA(80), PLASTEREK(8)]],
  [/awokado/, [SZTUKA(140)]],
  [/mango/, [SZTUKA(300)]],
  [/arbuz|melon/, [KAWALEK(250)]],
  [/ananas/, [PLASTER(80)]],
  [/truskaw|borowk|malin|jagod|winogron|porzeczk|wisni|czeresn|agrest|jezyn/, [GARSC(70), SZKLANKA(150), SZTUKA(10)]],
  [/pomidory (krojone|z puszki|w puszce|pelne)|passat|przecier pomid|koncentrat pomid/, [LYZKA(20), PUSZKA(400)]],
  [/pomidork|koktajlow/, [SZTUKA(15)]],
  [/pomidor/, [SZTUKA(120), PLASTER(15)]],
  [/ogorek kisz|ogorki kisz|ogorek konserw|korniszon/, [SZTUKA(60)]],
  [/ogor/, [SZTUKA(180), PLASTER(8)]],
  [/papryk/, [SZTUKA(160)]],
  [/marchew|marchewk/, [SZTUKA(80)]],
  [/cebul/, [SZTUKA(100)]],
  [/ziemniak|ziemniaki|bataty|batat/, [SZTUKA(100)]],
  [/rzodkiew/, [SZTUKA(12)]],
  [/salata|rukola|szpinak|roszponk|jarmuz/, [GARSC(20), U('liść', 'liście', 'liści', 10)]],
  [/brokul|kalafior/, [U('różyczka', 'różyczki', 'różyczek', 20), SZTUKA(500)]],
  [/cukini|baklazan/, [SZTUKA(300)]],
  [/kukurydz|groszek|fasol|ciecierzyc|soczewic/, [LYZKA(20), PUSZKA(240)]],
  [/tunczyk|sardyn|szprot|makrel.*puszk/, [PUSZKA(120)]],
  [/oliwk/, [SZTUKA(4)]],
  [/tofu/, [KOSTKA(180)]],
]

const cache = new Map<string, Unit[]>()

/** miary domowe dla produktu: z reguł po nazwie + porcja producenta; zawsze na końcu gramy */
export function unitsFor(food: Food): Unit[] {
  const key = food.id + '|' + food.name + '|' + (food.portion ?? '')
  let out = cache.get(key)
  if (out) return out
  const name = norm(food.name)
  out = [...(food.units ?? RULES.find(([re]) => re.test(name))?.[1] ?? [])]
  if (food.portion && !out.some((u) => Math.abs(u.g - food.portion!) < 0.5)) {
    const label = food.portionName?.replace(/^1\s+/, '') || 'porcja'
    out.unshift(U(label, label === 'porcja' ? 'porcje' : label, label === 'porcja' ? 'porcji' : label, food.portion))
  }
  cache.set(key, out)
  return out
}

export function unitLabel(u: Unit, qty: number) {
  if (u.g === 1 && u.n[0] === 'ml') return `${fmtQty(qty)} ml`
  const n = Math.abs(qty)
  const form = !Number.isInteger(qty) ? u.n[1] : n === 1 ? u.n[0] : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? u.n[1] : u.n[2]
  return `${fmtQty(qty)} ${form}`
}

export function fmtQty(q: number) {
  if (q === 0.5) return '½'
  if (q === 0.25) return '¼'
  if (q === 1.5) return '1½'
  return String(Math.round(q * 100) / 100).replace('.', ',')
}
