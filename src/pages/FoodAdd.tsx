import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { Icon } from '../components/Icon'
import { NumInput, Seg, Sheet, TopBar } from '../components/ui'
import { LOCAL_FOODS } from '../data/foods'
import { db } from '../db/db'
import { isoDate, num } from '../lib/format'
import { lookupBarcode, searchOff } from '../lib/off'
import { norm } from '../lib/search'
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
      {tab === 'quick' && <QuickTab meal={meal} date={date} onDone={done} />}
      {picked && <AmountSheet food={picked} meal={meal} date={date} onClose={() => setPicked(null)} onDone={done} />}
    </div>
  )
}

function FoodRow({ f, onClick }: { f: Food; onClick: () => void }) {
  return (
    <button className="row" onClick={onClick}>
      <div className="grow">
        <div className="title small">{f.fav ? '★ ' : ''}{f.name}</div>
        <div className="food-macros">
          {f.brand ? `${f.brand} · ` : ''}100 g: <b>{f.kcal} kcal</b> · B {num(f.p)} · W {num(f.c)} · T {num(f.f)}
        </div>
      </div>
      <Icon name="plus" className="chev" size={18} />
    </button>
  )
}

function SearchTab({ onPick }: { onPick: (f: Food) => void }) {
  const [q, setQ] = useState('')
  const [online, setOnline] = useState<Food[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const saved = useLiveQuery(() => db.foods.toArray(), [], [])

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean)
    const savedIds = new Set(saved.map((f) => f.id))
    const pool = [...saved, ...LOCAL_FOODS.filter((f) => !savedIds.has(f.id))]
    if (!words.length) {
      return saved.filter((f) => f.lastUsed || f.fav).sort((a, b) => (b.fav ?? 0) - (a.fav ?? 0) || (b.lastUsed ?? 0) - (a.lastUsed ?? 0)).slice(0, 30)
    }
    return pool
      .filter((f) => {
        const hay = norm(f.name + ' ' + (f.brand ?? ''))
        return words.every((w) => hay.includes(w))
      })
      .sort((a, b) => (b.fav ?? 0) - (a.fav ?? 0) || (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
      .slice(0, 50)
  }, [q, saved])

  async function searchOnline() {
    if (q.trim().length < 2) return
    abort.current?.abort()
    abort.current = new AbortController()
    setLoading(true)
    setErr(null)
    try {
      setOnline(await searchOff(q.trim(), abort.current.signal))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErr(navigator.onLine ? (e as Error).message : 'Brak internetu – wyszukiwanie online nie działa offline.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault()
          void searchOnline()
        }}
      >
        <Icon name="search" size={18} />
        <input className="input" type="search" enterKeyHint="search" placeholder="Np. skyr, owsianka, pierś z kurczaka" value={q} onChange={(e) => { setQ(e.target.value); setOnline(null) }} autoFocus />
      </form>

      {!q && results.length > 0 && <div className="section-title">Ostatnio używane</div>}
      {!q && results.length === 0 && (
        <div className="card small muted">Wpisz nazwę produktu. Najpierw przeszukuję wbudowaną bazę (działa offline), a przyciskiem poniżej – bazę Open Food Facts z produktami ze sklepów.</div>
      )}
      {results.length > 0 && (
        <div className="card flush list">
          {results.map((f) => <FoodRow key={f.id} f={f} onClick={() => onPick(f)} />)}
        </div>
      )}

      {q.trim().length >= 2 && (
        <button className="btn block" onClick={searchOnline} disabled={loading}>
          <Icon name="search" size={18} /> {loading ? 'Szukam…' : 'Szukaj produktów ze sklepów (online)'}
        </button>
      )}
      {err && <div className="note warn small">{err}</div>}
      {online && (
        <>
          <div className="section-title">Open Food Facts · {online.length}</div>
          {online.length ? (
            <div className="card flush list">
              {online.map((f) => <FoodRow key={f.id} f={f} onClick={() => onPick(f)} />)}
            </div>
          ) : (
            <div className="card empty small">Nic nie znaleziono. Spróbuj innej nazwy albo dodaj produkt ręcznie.</div>
          )}
          <div className="tiny muted">Dane z otwartej bazy tworzonej przez użytkowników – sprawdź z etykietą, jeśli coś wygląda dziwnie.</div>
        </>
      )}
      <Link to="/dieta/produkt" className="btn ghost block"><Icon name="plus" size={18} /> Dodaj własny produkt</Link>
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
      const local = await db.foods.where('barcode').equals(c).first()
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
      setMsg(navigator.onLine ? (e as Error).message : 'Brak internetu – nie mogę sprawdzić kodu.')
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

function QuickTab({ meal, date, onDone }: { meal: number; date: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState<number | undefined>()
  const [p, setP] = useState<number | undefined>()
  const [f, setF] = useState<number | undefined>()
  const [c, setC] = useState<number | undefined>()
  const calc = (p ?? 0) * 4 + (f ?? 0) * 9 + (c ?? 0) * 4
  async function save() {
    await db.foodLog.add({ date, meal, name: name.trim() || 'Szybki wpis', kcal: kcal ?? calc, p: p ?? 0, f: f ?? 0, c: c ?? 0 })
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
      <button className="btn primary lg block" disabled={!kcal && !calc} onClick={save}>Dodaj</button>
    </div>
  )
}

function AmountSheet({ food, meal, date, onClose, onDone }: { food: Food; meal: number; date: string; onClose: () => void; onDone: () => void }) {
  const [grams, setGrams] = useState<number | undefined>(food.portion ?? 100)
  const [m, setM] = useState(meal)
  const stored = useLiveQuery(() => db.foods.get(food.id), [food.id])
  const fav = stored?.fav === 1
  const g = grams ?? 0
  const k = g / 100
  async function add() {
    if (!g) return
    await db.foods.put({ ...food, ...(stored ?? {}), lastUsed: Date.now() })
    await db.foodLog.add({ date, meal: m, foodId: food.id, name: food.name + (food.brand ? ` (${food.brand})` : ''), grams: g, kcal: food.kcal * k, p: food.p * k, f: food.f * k, c: food.c * k })
    onDone()
  }
  async function toggleFav() {
    await db.foods.put({ ...food, ...(stored ?? {}), fav: fav ? 0 : 1 })
  }
  const quick = [...new Set([food.portion, 50, 100, 150, 200].filter((x): x is number => !!x))]
  return (
    <Sheet title={food.name} onClose={onClose}>
      {food.brand && <div className="muted small" style={{ marginTop: -10 }}>{food.brand}</div>}
      <div className="hstack">
        <div style={{ flex: 1 }}><NumInput value={grams} onChange={setGrams} ariaLabel="Ilość w gramach" /></div>
        <span className="muted">gramów</span>
      </div>
      <div className="hstack wrap" style={{ gap: 6 }}>
        {quick.map((q) => (
          <button key={q} className={'chip' + (g === q ? ' on' : '')} onClick={() => setGrams(q)}>
            {q === food.portion && food.portionName ? `${food.portionName} (${q} g)` : `${q} g`}
          </button>
        ))}
      </div>
      <div className="card grid3" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat"><span className="v" style={{ fontSize: 20 }}>{Math.round(food.kcal * k)}</span><span className="l">kcal</span></div>
        <div className="stat"><span className="v" style={{ fontSize: 20, color: 'var(--prot)' }}>{num(food.p * k)}</span><span className="l">białko</span></div>
        <div className="stat"><span className="v" style={{ fontSize: 20, color: 'var(--carb)' }}>{num(food.c * k)}</span><span className="l">węgle</span></div>
        <div className="stat"><span className="v" style={{ fontSize: 20, color: 'var(--fat)' }}>{num(food.f * k)}</span><span className="l">tłuszcz</span></div>
      </div>
      <label className="field">
        <span>Posiłek</span>
        <select className="input" value={m} onChange={(e) => setM(Number(e.target.value))}>
          {MEALS.map((x, i) => <option key={i} value={i}>{x}</option>)}
        </select>
      </label>
      <button className="btn primary lg block" disabled={!g} onClick={add}>Dodaj</button>
      <button className="btn ghost block" onClick={toggleFav}>
        <Icon name={fav ? 'star-fill' : 'star'} size={18} /> {fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
      </button>
    </Sheet>
  )
}
