import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { Icon } from '../components/Icon'
import { Nutrients } from '../components/Nutrients'
import { MacroTiles, NumInput, Seg, Sheet, TopBar } from '../components/ui'
import { LOCAL_FOODS } from '../data/foods'
import { db } from '../db/db'
import { MEAL_TIMES, nowTime, scaleFood } from '../lib/foodcalc'
import { isoDate, num } from '../lib/format'
import { lookupBarcode, searchOff } from '../lib/off'
import { STORES, findBarcode, loadProducts, searchProducts } from '../lib/products'
import { norm, queryStems, textScore } from '../lib/search'
import { fmtQty, unitLabel, unitsFor } from '../lib/units'
import type { Food } from '../types'
import { MEALS } from './Diet'

type Tab = 'search' | 'scan' | 'quick'

export function FoodAdd() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const meal = Number(params.get('meal') ?? 0)
  const date = params.get('d') ?? isoDate()
  const [tab, setTab] = useState<Tab>('search')
  const [picked, setPicked] = useState<Food | null>(null)
  const defaultTime = date === isoDate() ? nowTime() : MEAL_TIMES[meal] ?? '12:00'

  const done = () => nav(`/dieta${date === isoDate() ? '' : `?d=${date}`}`, { replace: true })

  return (
    <div className="page">
      <TopBar title={`Dodaj: ${MEALS[meal]}`} />
      <Seg<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'search', label: 'Szukaj' },
          { value: 'scan', label: 'Skanuj kod' },
          { value: 'quick', label: 'Szybko' },
        ]}
      />
      {tab === 'search' && <SearchTab onPick={setPicked} />}
      {tab === 'scan' && <ScanTab onPick={setPicked} />}
      {tab === 'quick' && <QuickTab meal={meal} date={date} defaultTime={defaultTime} onDone={done} />}
      {picked && <AmountSheet food={picked} meal={meal} date={date} defaultTime={defaultTime} onClose={() => setPicked(null)} onDone={done} />}
    </div>
  )
}

function FoodRow({ f, onClick }: { f: Food; onClick: () => void }) {
  return (
    <button className="row" onClick={onClick}>
      <div className="grow">
        <div className="title small">{f.fav ? '★ ' : ''}{f.name}</div>
        <div className="food-macros">
          {f.brand ? <b>{f.brand} · </b> : ''}{f.kcal} kcal · B {num(f.p)} · W {num(f.c)} · T {num(f.f)} <span className="muted">/100 g</span>
        </div>
      </div>
      <Icon name="plus" className="chev" size={18} />
    </button>
  )
}

function SearchTab({ onPick }: { onPick: (f: Food) => void }) {
  const [q, setQ] = useState('')
  const [store, setStore] = useState('')
  const [big, setBig] = useState<Food[]>([])
  const [dbState, setDbState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [online, setOnline] = useState<Food[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const saved = useLiveQuery(() => db.foods.toArray(), [], [])

  useEffect(() => {
    loadProducts().then(() => setDbState('ready'), () => setDbState('error'))
  }, [])

  // wyszukiwanie w dużej bazie (offline) z lekkim opóźnieniem
  useEffect(() => {
    if (dbState !== 'ready' || (!q.trim() && !store)) {
      setBig([])
      return
    }
    const t = setTimeout(() => void searchProducts(q, store).then(setBig), 150)
    return () => clearTimeout(t)
  }, [q, store, dbState])

  const mine = useMemo(() => {
    const words = queryStems(q)
    if (store) return []
    const savedIds = new Set(saved.map((f) => f.id))
    if (!words.length) {
      return saved.filter((f) => f.lastUsed || f.fav).sort((a, b) => (b.fav ?? 0) - (a.fav ?? 0) || (b.lastUsed ?? 0) - (a.lastUsed ?? 0)).slice(0, 30)
    }
    return [...saved, ...LOCAL_FOODS.filter((f) => !savedIds.has(f.id))]
      .map((f) => ({ f, sc: textScore(norm(f.name + ' ' + (f.brand ?? '')), words) }))
      .filter((x) => x.sc > 0)
      .sort((a, b) => (b.f.fav ?? 0) - (a.f.fav ?? 0) || (b.f.lastUsed ? 1 : 0) - (a.f.lastUsed ? 1 : 0) || b.sc - a.sc)
      .slice(0, 30)
      .map((x) => x.f)
  }, [q, saved, store])

  const mineIds = new Set(mine.map((f) => f.id))
  const bigFiltered = big.filter((f) => !mineIds.has(f.id))

  async function searchOnline() {
    if (q.trim().length < 2) return
    abort.current?.abort()
    abort.current = new AbortController()
    setLoading(true)
    setErr(null)
    try {
      setOnline(await searchOff(q.trim(), abort.current.signal))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErr(navigator.onLine ? 'Wyszukiwarka Open Food Facts chwilowo nie odpowiada. Spróbuj później albo zeskanuj kod kreskowy.' : 'Brak internetu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form className="search" onSubmit={(e) => { e.preventDefault(); (document.activeElement as HTMLElement)?.blur() }}>
        <Icon name="search" size={18} />
        <input className="input" type="search" enterKeyHint="search" placeholder="Np. skyr pilos, owsianka, kurczak" value={q} onChange={(e) => { setQ(e.target.value); setOnline(null) }} autoFocus />
      </form>
      <div className="chips">
        <button className={'chip' + (store === '' ? ' on' : '')} onClick={() => setStore('')}>Wszystkie</button>
        {STORES.map((s) => (
          <button key={s.id} className={'chip' + (store === s.id ? ' on' : '')} onClick={() => setStore(store === s.id ? '' : s.id)}>{s.name}</button>
        ))}
      </div>
      {store && <div className="tiny muted" style={{ marginTop: -6 }}>Produkty marek własnych sieci {STORES.find((s) => s.id === store)?.name}. Produkty innych marek (np. Piątnica, Danone) znajdziesz w „Wszystkie”.</div>}

      {!q && !store && mine.length > 0 && <div className="section-title">Ostatnio używane i ulubione</div>}
      {!q && !store && mine.length === 0 && (
        <div className="card small muted">
          Wpisz nazwę lub markę produktu. Przeszukuję ok. 12 tysięcy produktów ze sklepów oraz podstawowe produkty (warzywa, mięso, kasze) – działa także bez internetu.
        </div>
      )}
      {mine.length > 0 && (
        <div className="card flush list">
          {mine.map((f) => <FoodRow key={f.id} f={f} onClick={() => onPick(f)} />)}
        </div>
      )}
      {dbState === 'loading' && (q || store) && <div className="small muted" style={{ textAlign: 'center' }}>Wczytuję bazę produktów…</div>}
      {dbState === 'error' && <div className="note warn small">Nie udało się wczytać bazy produktów. Połącz się z internetem i otwórz tę stronę ponownie – potem baza działa offline.</div>}
      {bigFiltered.length > 0 && (
        <>
          <div className="section-title">Produkty ze sklepów{bigFiltered.length >= 60 ? ' · doprecyzuj wyszukiwanie' : ''}</div>
          <div className="card flush list">
            {bigFiltered.map((f) => <FoodRow key={f.id} f={f} onClick={() => onPick(f)} />)}
          </div>
        </>
      )}
      {q.trim().length >= 2 && dbState === 'ready' && mine.length + bigFiltered.length === 0 && !online && (
        <div className="card empty small">Brak w bazie. Spróbuj krótszej nazwy, zeskanuj kod albo poszukaj online.</div>
      )}

      {q.trim().length >= 2 && !store && (
        <button className="btn block" onClick={searchOnline} disabled={loading}>
          <Icon name="search" size={18} /> {loading ? 'Szukam…' : 'Szukaj też online (Open Food Facts)'}
        </button>
      )}
      {err && <div className="note warn small">{err}</div>}
      {online && (
        <>
          <div className="section-title">Online · {online.length}</div>
          {online.length ? (
            <div className="card flush list">
              {online.map((f) => <FoodRow key={f.id} f={f} onClick={() => onPick(f)} />)}
            </div>
          ) : (
            <div className="card empty small">Nic nie znaleziono.</div>
          )}
        </>
      )}
      <Link to="/dieta/produkt" className="btn ghost block"><Icon name="plus" size={18} /> Dodaj własny produkt</Link>
      <div className="tiny muted" style={{ textAlign: 'center' }}>Baza produktów: Open Food Facts (licencja ODbL). Dane tworzą użytkownicy – w razie wątpliwości sprawdź etykietę.</div>
    </>
  )
}

function ScanTab({ onPick }: { onPick: (f: Food) => void }) {
  const [code, setCode] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'notfound' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [key, setKey] = useState(0)

  const lookup = useCallback(async (c: string) => {
    setCode(c)
    setStatus('loading')
    try {
      const local = (await db.foods.where('barcode').equals(c).first()) ?? (await findBarcode(c))
      if (local) {
        setStatus('idle')
        onPick(local)
        return
      }
      const f = await lookupBarcode(c)
      if (f) {
        setStatus('idle')
        onPick(f)
      } else setStatus('notfound')
    } catch (e) {
      setStatus('error')
      setMsg(navigator.onLine ? (e as Error).message : 'Tego kodu nie ma w bazie offline, a nie ma internetu, by sprawdzić online.')
    }
  }, [onPick])

  return (
    <>
      {!code && <BarcodeScanner key={key} onCode={lookup} />}
      {status === 'loading' && <div className="card empty">Sprawdzam kod {code}…</div>}
      {status === 'notfound' && (
        <div className="card stack">
          <div>Produktu o kodzie <b className="num">{code}</b> nie ma w bazie.</div>
          <Link to={`/dieta/produkt?barcode=${code}`} className="btn primary block">Dodaj go ręcznie (z etykiety)</Link>
          <div className="tiny muted">Zapisany produkt będzie się już rozpoznawał przy kolejnym skanowaniu.</div>
        </div>
      )}
      {status === 'error' && <div className="note warn small">{msg}</div>}
      {code && status !== 'loading' && (
        <button className="btn block" onClick={() => { setCode(null); setStatus('idle'); setKey((k) => k + 1) }}>Skanuj ponownie</button>
      )}
      <form className="hstack" onSubmit={(e) => { e.preventDefault(); if (manual.length >= 8) void lookup(manual) }}>
        <input className="input" inputMode="numeric" placeholder="Albo wpisz kod ręcznie" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))} />
        <button className="btn" disabled={manual.length < 8}>Szukaj</button>
      </form>
    </>
  )
}

function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span>Godzina posiłku</span>
      <input className="input" type="time" value={value} onChange={(e) => onChange(e.target.value || value)} />
    </label>
  )
}

function QuickTab({ meal, date, defaultTime, onDone }: { meal: number; date: string; defaultTime: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState<number | undefined>()
  const [p, setP] = useState<number | undefined>()
  const [f, setF] = useState<number | undefined>()
  const [c, setC] = useState<number | undefined>()
  const [time, setTime] = useState(defaultTime)
  const calc = (p ?? 0) * 4 + (f ?? 0) * 9 + (c ?? 0) * 4
  async function save() {
    await db.foodLog.add({ date, time, meal, name: name.trim() || 'Szybki wpis', kcal: kcal ?? calc, p: p ?? 0, f: f ?? 0, c: c ?? 0 })
    onDone()
  }
  return (
    <div className="card stack">
      <label className="field"><span>Nazwa (opcjonalnie)</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. obiad u babci" /></label>
      <div className="grid3" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <label className="field"><span>Białko g</span><NumInput value={p} onChange={setP} /></label>
        <label className="field"><span>Węgle g</span><NumInput value={c} onChange={setC} /></label>
        <label className="field"><span>Tłuszcz g</span><NumInput value={f} onChange={setF} /></label>
      </div>
      <label className="field"><span>Kalorie</span><NumInput value={kcal} onChange={setKcal} placeholder={calc ? `${Math.round(calc)} (z makro)` : 'kcal'} /></label>
      <TimeField value={time} onChange={setTime} />
      <button className="btn primary lg block" disabled={!kcal && !calc} onClick={save}>Dodaj</button>
    </div>
  )
}

function AmountSheet({ food, meal, date, defaultTime, onClose, onDone }: { food: Food; meal: number; date: string; defaultTime: string; onClose: () => void; onDone: () => void }) {
  const units = unitsFor(food)
  // -1 = gramy; domyślnie pierwsza miara domowa (np. „1 kromka”), gdy ją znamy
  const [ui, setUi] = useState(units.length ? 0 : -1)
  const [qty, setQty] = useState<number | undefined>(units.length ? 1 : food.portion ?? 100)
  const [m, setM] = useState(meal)
  const [time, setTime] = useState(defaultTime)
  const stored = useLiveQuery(() => db.foods.get(food.id), [food.id])
  const fav = stored?.fav === 1
  const unit = ui >= 0 ? units[ui] : undefined
  const g = Math.round((qty ?? 0) * (unit?.g ?? 1) * 10) / 10
  const v = scaleFood(food, g)
  function pickUnit(i: number) {
    if (i === ui) return
    setUi(i)
    setQty(i >= 0 ? 1 : g || food.portion || 100)
  }
  async function add() {
    if (!g) return
    await db.foods.put({ ...food, ...(stored ?? {}), lastUsed: Date.now() })
    await db.foodLog.add({
      date, time, meal: m, foodId: food.id, name: food.name + (food.brand ? ` (${food.brand})` : ''), grams: g,
      amount: unit && qty ? unitLabel(unit, qty) : undefined, ...v,
    })
    onDone()
  }
  async function toggleFav() {
    await db.foods.put({ ...food, ...(stored ?? {}), fav: fav ? 0 : 1 })
  }
  const quick = unit ? [0.5, 1, 2, 3] : [...new Set([50, 100, 150, 200])]
  return (
    <Sheet title={food.name} onClose={onClose}>
      {food.brand && <div className="muted small" style={{ marginTop: -10 }}>{food.brand}</div>}
      {units.length > 0 && (
        <div className="chips" role="radiogroup" aria-label="Miara">
          {units.map((u, i) => (
            <button key={i} role="radio" aria-checked={ui === i} className={'chip' + (ui === i ? ' on' : '')} onClick={() => pickUnit(i)}>
              {u.n[0]} <span className="muted">{fmtQty(u.g)} g</span>
            </button>
          ))}
          <button role="radio" aria-checked={ui === -1} className={'chip' + (ui === -1 ? ' on' : '')} onClick={() => pickUnit(-1)}>gramy</button>
        </div>
      )}
      <div className="hstack">
        <div style={{ flex: 1 }}><NumInput value={qty} onChange={setQty} ariaLabel={unit ? `Ilość: ${unit.n[2]}` : 'Ilość w gramach'} /></div>
        <span className="muted">{unit ? (qty ? unitLabel(unit, qty).replace(/^\S+\s/, '') : unit.n[2]) : 'gramów'}</span>
      </div>
      <div className="hstack wrap" style={{ gap: 6 }}>
        {quick.map((q) => (
          <button key={q} className={'chip' + (qty === q ? ' on' : '')} onClick={() => setQty(q)}>
            {unit ? fmtQty(q) : `${q} g`}
          </button>
        ))}
        {unit && <span className="small muted" style={{ alignSelf: 'center', marginLeft: 'auto' }}>= {fmtQty(g)} g</span>}
      </div>
      <MacroTiles kcal={v.kcal} p={v.p} c={v.c} f={v.f} />
      <div className="card">
        <Nutrients v={v} />
      </div>
      <div className="grid2">
        <label className="field">
          <span>Posiłek</span>
          <select className="input" value={m} onChange={(e) => setM(Number(e.target.value))}>
            {MEALS.map((x, i) => <option key={i} value={i}>{x}</option>)}
          </select>
        </label>
        <TimeField value={time} onChange={setTime} />
      </div>
      <button className="btn primary lg block" disabled={!g} onClick={add}>Dodaj</button>
      <button className="btn ghost block" onClick={toggleFav}>
        <Icon name={fav ? 'star-fill' : 'star'} size={18} /> {fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
      </button>
    </Sheet>
  )
}
