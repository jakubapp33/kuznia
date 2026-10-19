import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { Field, TopBar } from '../components/ui'
import { TABLES, db, exportAll, importAll, setSetting } from '../db/db'
import { isoDate } from '../lib/format'
import { useSetting } from '../lib/hooks'

const PRINCIPLES = [
  ['Objętość', '10–20 serii roboczych tygodniowo na partię mięśniową. Na start wystarczy mniej (ok. 6–10).'],
  ['Częstotliwość', 'Każda partia ok. 2× w tygodniu – łatwiej rozłożyć objętość i utrzymać jakość serii.'],
  ['Intensywność', 'Kończ serie 0–3 powtórzenia przed upadkiem mięśniowym (RIR). Upadek przy każdej serii nie jest potrzebny.'],
  ['Zakres powtórzeń', 'Mięśnie rosną podobnie przy 6–30 powtórzeniach, jeśli serie są blisko upadku. Siła rośnie najbardziej przy cięższych (1–6).'],
  ['Progresja', 'Dokładaj powtórzenia, a potem ciężar. Postęp zapisany w aplikacji to najlepszy wskaźnik, że plan działa.'],
  ['Przerwy', '2–3 min przy ćwiczeniach wielostawowych, 1–2 min przy izolowanych – dłuższe przerwy pozwalają zrobić więcej powtórzeń.'],
  ['Białko', '1,6–2,2 g na kg masy ciała dziennie, rozłożone na 3–5 posiłków po ok. 0,4 g/kg.'],
  ['Sen', '7–9 godzin. Niedobór snu pogarsza regenerację i zwiększa utratę mięśni na redukcji.'],
]

export function Settings() {
  const rest = useSetting<{ compound: number; isolation: number }>('restDefaults') ?? { compound: 150, isolation: 75 }
  const [msg, setMsg] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  async function doExport() {
    const data = await exportAll()
    const name = `kuznia-kopia-${isoDate()}.json`
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const f = new File([blob], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: 'Kopia zapasowa Kuźni' })
        setMsg('Kopia gotowa. Zapisz ją np. w aplikacji Pliki lub na iCloud.')
        return
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setMsg('Kopia pobrana.')
  }

  async function doImport(f: File) {
    if (!confirm('Przywrócenie kopii zastąpi WSZYSTKIE obecne dane w aplikacji. Kontynuować?')) return
    try {
      await importAll(JSON.parse(await f.text()))
      setMsg('Dane przywrócone.')
    } catch (e) {
      setMsg('Błąd: ' + (e as Error).message)
    }
  }

  async function wipe() {
    if (!confirm('Usunąć wszystkie dane (treningi, plany, dietę, pomiary)? Tego nie da się cofnąć.')) return
    if (!confirm('Na pewno? Zrób wcześniej kopię zapasową.')) return
    await Promise.all(TABLES.map((t) => db.table(t).clear()))
    setMsg('Wszystkie dane usunięte.')
  }

  return (
    <div className="page">
      <TopBar title="Ustawienia" back="/" />

      <div className="card flush list">
        <Link to="/dieta/cele" className="row"><Icon name="target" /><span className="grow">Profil, kalorie i makro</span><Icon name="chev" className="chev" size={18} /></Link>
        <Link to="/cwiczenia/nowe" className="row"><Icon name="plus" /><span className="grow">Dodaj własne ćwiczenie</span><Icon name="chev" className="chev" size={18} /></Link>
      </div>

      <div className="section-title">Domyślne przerwy</div>
      <div className="card grid2">
        <Field label="Wielostawowe">
          <select className="input" value={rest.compound} onChange={(e) => setSetting('restDefaults', { ...rest, compound: Number(e.target.value) })}>
            {[90, 120, 150, 180, 240].map((s) => <option key={s} value={s}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')} min</option>)}
          </select>
        </Field>
        <Field label="Izolowane">
          <select className="input" value={rest.isolation} onChange={(e) => setSetting('restDefaults', { ...rest, isolation: Number(e.target.value) })}>
            {[45, 60, 75, 90, 120].map((s) => <option key={s} value={s}>{s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min`}</option>)}
          </select>
        </Field>
      </div>

      <div className="section-title">Kopia zapasowa</div>
      <div className="card stack">
        <div className="small muted">Dane są zapisane tylko na tym telefonie. Rób kopię co jakiś czas – przyda się przy zmianie telefonu albo po wyczyszczeniu Safari.</div>
        <button className="btn primary block" onClick={doExport}><Icon name="download" size={18} /> Zrób kopię zapasową</button>
        <button className="btn block" onClick={() => file.current?.click()}><Icon name="upload" size={18} /> Przywróć z kopii</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        {msg && <div className="note small">{msg}</div>}
      </div>

      <div className="section-title">Na czym opiera się Kuźnia</div>
      <div className="card stack" style={{ gap: 10 }}>
        {PRINCIPLES.map(([t, d]) => (
          <div key={t} className="small"><b>{t}.</b> <span className="muted">{d}</span></div>
        ))}
      </div>

      <div className="section-title">Zegarek</div>
      <Link to="/garmin" className="card row" style={{ display: 'flex' }}>
        <div className="grow"><div className="title small">Dane z Garmina (kroki, kalorie)</div><div className="meta">Jak ustawić Skrót iOS</div></div>
        <Icon name="chev" className="chev" size={18} />
      </Link>

      <div className="section-title">Na ekran główny iPhone’a</div>
      <div className="card small">
        <ol className="steps">
          <li>Otwórz Kuźnię w <b>Safari</b>.</li>
          <li>Stuknij przycisk <b>Udostępnij</b> (kwadrat ze strzałką).</li>
          <li>Wybierz <b>„Do ekranu początkowego”</b> i potwierdź.</li>
        </ol>
        <div className="muted" style={{ marginTop: 8 }}>Aplikacja działa wtedy na pełnym ekranie i offline (poza wyszukiwaniem produktów online).</div>
      </div>

      <button className="btn danger block" onClick={wipe}>Usuń wszystkie dane</button>
      <div className="tiny muted" style={{ textAlign: 'center' }}>Kuźnia · darmowa, bez reklam i bez konta</div>
    </div>
  )
}
