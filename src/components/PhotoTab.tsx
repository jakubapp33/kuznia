import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { GEMINI_KEY, estimateWithGemini, parseEstimate, photoPrompt, rescale, shrinkImage, type PhotoItem } from '../lib/photoAi'
import { db } from '../db/db'
import { useSetting } from '../lib/hooks'
import { num } from '../lib/format'
import { MEALS } from '../pages/Diet'
import { Icon } from './Icon'
import { MacroTiles, NumInput } from './ui'

/** Zakładka „Zdjęcie AI”: zdjęcie posiłku → lista składników z kcal i makro → do dziennika. */
export function PhotoTab({ meal, date, defaultTime, onDone }: { meal: number; date: string; defaultTime: string; onDone: () => void }) {
  const key = useSetting<string>(GEMINI_KEY)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [img, setImg] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string>()
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [items, setItems] = useState<PhotoItem[] | null>(null)
  const [note, setNote] = useState<string>()
  const [pasted, setPasted] = useState('')
  const [copied, setCopied] = useState(false)
  const [m, setM] = useState(meal)
  const [time, setTime] = useState(defaultTime)

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  async function onFile(f?: File) {
    if (!f) return
    setErr('')
    setItems(null)
    try {
      const small = await shrinkImage(f)
      setImg(small)
      setUrl(URL.createObjectURL(small))
    } catch {
      setImg(f)
      setUrl(URL.createObjectURL(f))
    }
  }

  async function runGemini() {
    if (!img || !key) return
    if (!navigator.onLine) return setErr('Brak internetu – AI potrzebuje połączenia.')
    setBusy(true)
    setErr('')
    try {
      const est = await estimateWithGemini(img, key, hint)
      setItems(est.items)
      setNote(est.note)
    } catch (e) {
      setErr((e as Error).message || 'Nie udało się połączyć z AI.')
    } finally {
      setBusy(false)
    }
  }

  async function shareToChat() {
    const text = photoPrompt(hint)
    const file = img ? new File([img], 'posilek.jpg', { type: 'image/jpeg' }) : undefined
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text })
        return
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    await copyPrompt()
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(photoPrompt(hint))
      setCopied(true)
    } catch {
      setErr('Nie udało się skopiować – przytrzymaj tekst polecenia i skopiuj ręcznie.')
    }
  }

  function readPasted() {
    const est = parseEstimate(pasted)
    if (!est) return setErr('Nie widzę w tym tekście wyniku. Wklej całą odpowiedź AI (z nawiasami { }).')
    setErr('')
    setItems(est.items)
    setNote(est.note)
  }

  async function save() {
    if (!items?.length) return
    await db.foodLog.bulkAdd(
      items.filter((it) => it.kcal > 0).map((it) => ({
        date, time, meal: m, name: it.name, grams: it.grams || undefined, amount: 'szacunek ze zdjęcia', kcal: it.kcal, p: it.p, f: it.f, c: it.c,
      })),
    )
    onDone()
  }

  const total = (items ?? []).reduce((a, it) => ({ kcal: a.kcal + it.kcal, p: a.p + it.p, f: a.f + it.f, c: a.c + it.c }), { kcal: 0, p: 0, f: 0, c: 0 })
  const set = (i: number, it: PhotoItem) => setItems((xs) => xs && xs.map((x, j) => (j === i ? it : x)))

  return (
    <div className="stack">
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {url ? (
        <div className="card stack">
          <img src={url} alt="Zdjęcie posiłku" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12 }} />
          <button className="btn ghost block" onClick={() => camera.current?.click()}>Zrób inne zdjęcie</button>
        </div>
      ) : (
        <div className="card stack">
          <div className="small muted">Zrób zdjęcie talerza <b>z góry</b>, najlepiej z widelcem lub dłonią obok – AI lepiej oceni wielkość porcji.</div>
          <button className="btn primary lg block" onClick={() => camera.current?.click()}>📷 Zrób zdjęcie</button>
          <button className="btn block" onClick={() => gallery.current?.click()}>Wybierz z galerii</button>
        </div>
      )}

      {img && !items && (
        <div className="card stack">
          <label className="field">
            <span>Co to jest? (opcjonalnie, poprawia wynik)</span>
            <input className="input" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="np. spaghetti bolognese, duży talerz, smażone na oleju" />
          </label>
          {key ? (
            <button className="btn primary lg block" disabled={busy} onClick={runGemini}>{busy ? 'AI liczy…' : '✨ Oszacuj kalorie'}</button>
          ) : (
            <>
              <div className="note small">
                Aby AI liczyła od razu w aplikacji, dodaj darmowy klucz Google Gemini w <Link to="/ustawienia">Ustawieniach</Link>. Bez klucza też się da – w 3 krokach:
              </div>
              <ol className="steps small">
                <li>Stuknij <b>Wyślij do Gemini / ChatGPT / Claude</b> i wybierz aplikację (zdjęcie i polecenie pójdą razem). Jeśli polecenie się nie wklei – wklej je sam, jest już skopiowane.</li>
                <li>Skopiuj całą odpowiedź AI.</li>
                <li>Wklej ją poniżej i stuknij <b>Odczytaj</b>.</li>
              </ol>
              <button className="btn primary block" onClick={shareToChat}>Wyślij do Gemini / ChatGPT / Claude</button>
              <button className="btn ghost block" onClick={copyPrompt}><Icon name="copy" size={18} /> {copied ? 'Skopiowano polecenie' : 'Tylko skopiuj polecenie'}</button>
              <textarea className="input" rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Wklej tutaj odpowiedź AI" aria-label="Odpowiedź AI" />
              <button className="btn block" disabled={!pasted.trim()} onClick={readPasted}>Odczytaj</button>
            </>
          )}
        </div>
      )}

      {err && <div className="note warn small">{err}</div>}

      {items && (
        <div className="card stack">
          <div className="title small">Co widzi AI – popraw, jeśli trzeba</div>
          {items.map((it, i) => (
            <div key={i} className="stack" style={{ gap: 4, paddingBottom: 8, borderBottom: '1px solid var(--line, #8883)' }}>
              <div className="hstack">
                <input className="input" style={{ flex: 1 }} value={it.name} aria-label="Nazwa składnika" onChange={(e) => set(i, { ...it, name: e.target.value })} />
                <button className="btn ghost" aria-label="Usuń składnik" onClick={() => setItems((xs) => xs && xs.filter((_, j) => j !== i))}><Icon name="trash" size={18} /></button>
              </div>
              <div className="hstack">
                <div style={{ width: 90 }}><NumInput value={it.grams || undefined} ariaLabel="Gramy" onChange={(g) => g !== undefined && set(i, rescale(it, g))} /></div>
                <span className="small muted">g · <b>{it.kcal} kcal</b> · B {num(it.p)} · W {num(it.c)} · T {num(it.f)}</span>
              </div>
            </div>
          ))}
          <MacroTiles kcal={total.kcal} p={total.p} c={total.c} f={total.f} />
          {note && <div className="small muted">AI: {note}</div>}
          <div className="tiny muted">To szacunek – AI myli się zwykle o 20–30%, najczęściej przy oleju i sosach. Jeśli wiesz, ile czegoś było, popraw gramy.</div>
          <div className="grid2">
            <label className="field">
              <span>Posiłek</span>
              <select className="input" value={m} onChange={(e) => setM(Number(e.target.value))}>
                {MEALS.map((x, i) => <option key={i} value={i}>{x}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Godzina posiłku</span>
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value || time)} />
            </label>
          </div>
          <button className="btn primary lg block" disabled={!items.length} onClick={save}>Dodaj do dziennika</button>
          <button className="btn ghost block" onClick={() => setItems(null)}>Wróć</button>
        </div>
      )}
    </div>
  )
}
