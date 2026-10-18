import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Field, NumInput, TopBar } from '../components/ui'
import { db } from '../db/db'
import { newId } from '../lib/workout'

export function FoodForm() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [barcode, setBarcode] = useState(params.get('barcode') ?? '')
  const [kcal, setKcal] = useState<number | undefined>()
  const [p, setP] = useState<number | undefined>()
  const [f, setF] = useState<number | undefined>()
  const [c, setC] = useState<number | undefined>()
  const [fiber, setFiber] = useState<number | undefined>()
  const [sugar, setSugar] = useState<number | undefined>()
  const [satFat, setSatFat] = useState<number | undefined>()
  const [salt, setSalt] = useState<number | undefined>()
  const [portion, setPortion] = useState<number | undefined>()
  const calc = Math.round((p ?? 0) * 4 + (f ?? 0) * 9 + (c ?? 0) * 4)
  const valid = name.trim() && (kcal || calc)

  async function save() {
    await db.foods.put({
      id: barcode ? 'off:' + barcode : 'my:' + newId(),
      name: name.trim(), brand: brand.trim() || undefined, barcode: barcode || undefined,
      kcal: kcal ?? calc, p: p ?? 0, f: f ?? 0, c: c ?? 0, fiber, sugar, satFat, salt,
      micro: salt !== undefined ? { na: Math.round((salt / 2.5) * 1000) } : undefined,
      portion, lastUsed: Date.now(),
    })
    nav(-1)
  }

  return (
    <div className="page">
      <TopBar title="Nowy produkt" />
      <div className="card stack">
        <Field label="Nazwa *"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Marka"><input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
        <Field label="Kod kreskowy"><input className="input" inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <div className="section-title">Wartości w 100 g (z etykiety)</div>
      <div className="card stack">
        <div className="grid2">
          <Field label="Białko g"><NumInput value={p} onChange={setP} /></Field>
          <Field label="Węglowodany g"><NumInput value={c} onChange={setC} /></Field>
          <Field label="w tym cukry g"><NumInput value={sugar} onChange={setSugar} /></Field>
          <Field label="Tłuszcz g"><NumInput value={f} onChange={setF} /></Field>
          <Field label="w tym nasycone g"><NumInput value={satFat} onChange={setSatFat} /></Field>
          <Field label="Błonnik g"><NumInput value={fiber} onChange={setFiber} /></Field>
          <Field label="Sól g"><NumInput value={salt} onChange={setSalt} /></Field>
        </div>
        <Field label="Kalorie (kcal)" hint={calc ? `Z makroskładników wychodzi ok. ${calc} kcal` : undefined}>
          <NumInput value={kcal} onChange={setKcal} placeholder={calc ? String(calc) : ''} />
        </Field>
        <Field label="Typowa porcja (g)"><NumInput value={portion} onChange={setPortion} /></Field>
      </div>
      <button className="btn primary lg block" disabled={!valid} onClick={save}>Zapisz produkt</button>
    </div>
  )
}
