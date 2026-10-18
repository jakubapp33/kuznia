import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Field, NumInput, Seg, TopBar } from '../components/ui'
import { db, setSetting } from '../db/db'
import { addDays, daysBetween, isoDate, num } from '../lib/format'
import { useProfile, useSetting } from '../lib/hooks'
import { ACTIVITY_LEVELS, BULK_RATES, CUT_RATES, adaptiveTdee, computeTargets, macroKcal } from '../lib/nutrition'
import type { Goal, MacroTargets, Profile } from '../types'

const DEFAULT: Profile = { sex: 'm', age: 18, height: 178, weight: 75, activity: 1.55, goal: 'maintain', rate: 0.5, experience: 'początkujący' }

export function Targets() {
  const stored = useProfile()
  const manual = useSetting<MacroTargets | null>('manualTargets')
  const [p, setP] = useState<Profile>(DEFAULT)
  const [saved, setSaved] = useState(false)
  const [override, setOverride] = useState<MacroTargets | null>(null)

  useEffect(() => {
    if (stored) setP(stored)
  }, [stored])
  useEffect(() => {
    setOverride(manual ?? null)
  }, [manual])

  // dane do adaptacyjnego TDEE (ostatnie 28 dni)
  const from = addDays(isoDate(), -28)
  const adaptive = useLiveQuery(async () => {
    const log = await db.foodLog.where('date').between(from, isoDate(), true, false).toArray()
    const byDay = new Map<string, number>()
    for (const f of log) byDay.set(f.date, (byDay.get(f.date) ?? 0) + f.kcal)
    const days = [...byDay.values()].filter((k) => k > 600)
    const body = await db.body.where('date').between(from, isoDate(), true, true).toArray()
    const weights = body.filter((b) => b.weight).map((b) => ({ day: daysBetween(from, b.date), weight: b.weight! }))
    return { tdee: adaptiveTdee(days, weights), days: days.length, weights: weights.length }
  }, [from])

  const set = (patch: Partial<Profile>) => {
    setSaved(false)
    setP((x) => ({ ...x, ...patch }))
  }
  const t = computeTargets(p)

  async function save() {
    await setSetting('profile', p)
    await setSetting('manualTargets', override)
    // zapis wagi do dziennika, jeśli dziś jeszcze nie było
    const today = isoDate()
    const existing = await db.body.where('date').equals(today).first()
    if (!existing) await db.body.add({ date: today, weight: p.weight })
    setSaved(true)
  }

  const rates = p.goal === 'cut' ? CUT_RATES : BULK_RATES

  return (
    <div className="page">
      <TopBar title="Cele i kalkulator" back="/dieta" />

      <div className="card stack">
        <h3>Twoje dane</h3>
        <Seg<'m' | 'f'> value={p.sex} onChange={(sex) => set({ sex })} options={[{ value: 'm', label: 'Mężczyzna' }, { value: 'f', label: 'Kobieta' }]} />
        <div className="grid3">
          <Field label="Wiek"><NumInput decimal={false} value={p.age} onChange={(v) => set({ age: v ?? 0 })} /></Field>
          <Field label="Wzrost cm"><NumInput decimal={false} value={p.height} onChange={(v) => set({ height: v ?? 0 })} /></Field>
          <Field label="Waga kg"><NumInput value={p.weight} onChange={(v) => set({ weight: v ?? 0 })} /></Field>
        </div>
        <Field label="Tkanka tłuszczowa % (opcjonalnie)" hint="Jeśli znasz (np. z pomiaru), wzór będzie dokładniejszy. Jeśli nie – zostaw puste.">
          <NumInput value={p.bodyFat} onChange={(v) => set({ bodyFat: v })} placeholder="nie wiem" />
        </Field>
        <Field label="Doświadczenie treningowe">
          <Seg value={p.experience} onChange={(experience) => set({ experience })} options={[{ value: 'początkujący', label: '< 1 rok' }, { value: 'średniozaawansowany', label: '1–3 lata' }, { value: 'zaawansowany', label: '3+ lata' }]} />
        </Field>
      </div>

      <div className="card stack">
        <h3>Aktywność</h3>
        <div className="choice-list">
          {ACTIVITY_LEVELS.map((a) => (
            <button key={a.value} className={'choice' + (p.activity === a.value ? ' on' : '')} onClick={() => set({ activity: a.value })}>
              <b>{a.label}</b><small>{a.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h3>Cel</h3>
        <Seg<Goal>
          value={p.goal}
          onChange={(goal) => set({ goal, rate: goal === 'cut' ? 0.5 : 1 })}
          options={[{ value: 'cut', label: 'Redukcja' }, { value: 'maintain', label: 'Utrzymanie' }, { value: 'bulk', label: 'Masa' }]}
        />
        {p.goal !== 'maintain' && (
          <div className="choice-list">
            {rates.map((r) => (
              <button key={r.value} className={'choice' + (p.rate === r.value ? ' on' : '')} onClick={() => set({ rate: r.value })}>
                <b>{r.label}</b><small>{r.hint}</small>
              </button>
            ))}
          </div>
        )}
        {p.goal === 'maintain' && <div className="small muted">Utrzymanie wagi z treningiem siłowym pozwala powoli budować mięśnie i tracić tłuszcz (rekompozycja) – szczególnie na początku przygody z siłownią.</div>}
      </div>

      <div className="card stack">
        <h3>Wynik</h3>
        <div className="grid2">
          <div className="stat"><span className="v">{t.bmr}</span><span className="l">przemiana podstawowa (kcal)</span></div>
          <div className="stat"><span className="v">{t.tdee}</span><span className="l">zapotrzebowanie dzienne (kcal)</span></div>
        </div>
        <div className="note">
          <div className="hstack" style={{ alignItems: 'baseline' }}>
            <span className="hero-num">{t.kcal}</span><b>kcal dziennie</b>
          </div>
          <div className="small muted">
            {t.adjustment < 0 ? `deficyt ${-t.adjustment} kcal` : t.adjustment > 0 ? `nadwyżka ${t.adjustment} kcal` : 'bez zmian'} względem zapotrzebowania
          </div>
        </div>
        <div className="grid3">
          <div className="stat"><span className="v" style={{ color: 'var(--prot)' }}>{t.p}<small>g</small></span><span className="l">białko</span></div>
          <div className="stat"><span className="v" style={{ color: 'var(--carb)' }}>{t.c}<small>g</small></span><span className="l">węglowodany</span></div>
          <div className="stat"><span className="v" style={{ color: 'var(--fat)' }}>{t.f}<small>g</small></span><span className="l">tłuszcze</span></div>
        </div>
        <div className="small muted">
          Białko {num(t.p / p.weight)} g/kg masy ciała · błonnik min. {t.fiber} g · woda ok. {num((p.weight * 35) / 1000)} l + ok. 0,5 l na godzinę treningu.
        </div>
        {t.warnings.map((w) => <div key={w} className="note warn small">{w}</div>)}
        <details className="small">
          <summary style={{ fontWeight: 650, cursor: 'pointer' }}>Jak to liczę?</summary>
          <ul className="muted" style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>Przemiana podstawowa: {p.bodyFat ? 'wzór Katcha-McArdle’a (z masy beztłuszczowej)' : 'wzór Mifflina-St Jeora – najdokładniejszy bez pomiaru składu ciała'}.</li>
            <li>Zapotrzebowanie = przemiana podstawowa × współczynnik aktywności.</li>
            <li>Redukcja: deficyt wyliczony z tempa (1 kg tkanki tłuszczowej ≈ 7700 kcal). Wolniejsze tempo lepiej chroni mięśnie.</li>
            <li>Masa: niewielka nadwyżka – większa nie przyspiesza budowy mięśni, tylko dokłada tłuszczu.</li>
            <li>Białko: {p.goal === 'cut' ? '2,2' : '1,8'} g/kg (zakres 1,6–2,2 g/kg maksymalizuje przyrost mięśni; na redukcji górna granica){p.weight / (p.height / 100) ** 2 > 30 ? ', liczone od masy przy BMI 25' : ''}.</li>
            <li>Tłuszcze: ok. 25% energii, min. 0,6 g/kg – dla zdrowia hormonalnego.</li>
            <li>Węglowodany: reszta kalorii – paliwo do treningu.</li>
          </ul>
        </details>
      </div>

      {adaptive && (
        <div className="card stack">
          <h3>Zapotrzebowanie z Twoich danych</h3>
          {adaptive.tdee ? (
            <>
              <div className="stat"><span className="v">{adaptive.tdee}<small>kcal</small></span><span className="l">rzeczywiste zapotrzebowanie (ostatnie 4 tygodnie)</span></div>
              <div className="small muted">Policzone z tego, ile jesz, i jak zmienia się Twoja waga. Wzory to tylko punkt startowy – to jest dokładniejsze.</div>
            </>
          ) : (
            <div className="small muted">
              Gdy przez min. 10 dni zapiszesz jedzenie i min. 4 razy wagę (masz: {adaptive.days} dni, {adaptive.weights} pomiarów), policzę Twoje prawdziwe zapotrzebowanie z danych.
            </div>
          )}
        </div>
      )}

      <div className="card stack">
        <div className="hstack">
          <h3 style={{ flex: 1 }}>Własne cele</h3>
          <Seg<string> value={override ? 'on' : 'off'} onChange={(v) => { setSaved(false); setOverride(v === 'on' ? { kcal: t.kcal, p: t.p, f: t.f, c: t.c } : null) }} options={[{ value: 'off', label: 'Auto' }, { value: 'on', label: 'Ręcznie' }]} />
        </div>
        {override && (
          <>
            <div className="grid3">
              <Field label="Białko g"><NumInput decimal={false} value={override.p} onChange={(v) => { setSaved(false); setOverride({ ...override, p: v ?? 0, kcal: Math.round(macroKcal({ ...override, p: v ?? 0 })) }) }} /></Field>
              <Field label="Węgle g"><NumInput decimal={false} value={override.c} onChange={(v) => { setSaved(false); setOverride({ ...override, c: v ?? 0, kcal: Math.round(macroKcal({ ...override, c: v ?? 0 })) }) }} /></Field>
              <Field label="Tłuszcz g"><NumInput decimal={false} value={override.f} onChange={(v) => { setSaved(false); setOverride({ ...override, f: v ?? 0, kcal: Math.round(macroKcal({ ...override, f: v ?? 0 })) }) }} /></Field>
            </div>
            <div className="small">= <b className="num">{override.kcal}</b> kcal</div>
          </>
        )}
      </div>

      <button className="btn primary lg block" onClick={save}>{saved ? '✓ Zapisano' : 'Zapisz'}</button>
    </div>
  )
}
