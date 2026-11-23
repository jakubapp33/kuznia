/** Szacowanie kalorii ze zdjęcia posiłku: Gemini (darmowy klucz użytkownika) albo wklejona odpowiedź z ChatGPT/Claude. */

export interface PhotoItem {
  name: string
  grams: number
  kcal: number
  p: number
  f: number
  c: number
}

export interface PhotoEstimate {
  items: PhotoItem[]
  note?: string
}

export const GEMINI_KEY = 'geminiKey'
export const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash']

export function photoPrompt(hint?: string) {
  return `Jesteś dietetykiem. Oszacuj, co jest na zdjęciu posiłku i ile to waży.
${hint?.trim() ? `Wskazówka od użytkownika: ${hint.trim()}\n` : ''}Rozbij posiłek na osobne składniki (np. ryż, kurczak, sos, olej do smażenia, napój). Gramaturę oceń po wielkości talerza, sztućców i opakowań. Uwzględnij ukryty tłuszcz (smażenie, sosy). Wartości podaj dla CAŁEJ porcji widocznej na zdjęciu, nie na 100 g.
Odpowiedz WYŁĄCZNIE kodem JSON, bez komentarza, w formacie:
{"items":[{"name":"nazwa po polsku","grams":150,"kcal":200,"p":10,"f":5,"c":30}],"note":"krótka uwaga, co jest niepewne"}
p = białko g, f = tłuszcz g, c = węglowodany g.`
}

const n = (v: unknown) => {
  const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v)
  return Number.isFinite(x) && x >= 0 ? Math.round(x * 10) / 10 : 0
}

/** wyciąga JSON z odpowiedzi (także z bloku ```json albo z tekstem dookoła) */
export function parseEstimate(text: string): PhotoEstimate | null {
  const s = text.replace(/```(?:json)?/gi, '')
  const candidates = [s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1), s.slice(s.indexOf('['), s.lastIndexOf(']') + 1)]
  for (const c of candidates) {
    if (!c) continue
    try {
      const raw = JSON.parse(c)
      const list: unknown[] = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
      const items = list
        .map((it) => {
          const o = it as Record<string, unknown>
          const p = n(o.p ?? o.protein ?? o.bialko), f = n(o.f ?? o.fat ?? o.tluszcz), cc = n(o.c ?? o.carbs ?? o.wegle)
          return {
            name: String(o.name ?? o.nazwa ?? 'Składnik').trim() || 'Składnik',
            grams: n(o.grams ?? o.g ?? o.gramy),
            kcal: Math.round(n(o.kcal ?? o.calories) || p * 4 + f * 9 + cc * 4),
            p, f, c: cc,
          }
        })
        .filter((it) => it.kcal > 0 || it.grams > 0)
      if (items.length) return { items, note: typeof raw?.note === 'string' ? raw.note : undefined }
    } catch {
      /* spróbuj następnego kandydata */
    }
  }
  return null
}

/** zmniejsza zdjęcie (dłuższy bok 1024 px, JPEG) – szybsze wysyłanie i mniejsze zużycie limitu */
export async function shrinkImage(file: Blob, max = 1024): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * k)
  canvas.height = Math.round(bmp.height * k)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close?.()
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Nie udało się przetworzyć zdjęcia'))), 'image/jpeg', 0.82))
}

function toBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1] ?? '')
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
}

export async function estimateWithGemini(img: Blob, key: string, hint?: string): Promise<PhotoEstimate> {
  const data = await toBase64(img)
  const body = JSON.stringify({
    contents: [{ parts: [{ text: photoPrompt(hint) }, { inline_data: { mime_type: img.type || 'image/jpeg', data } }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  })
  let last = ''
  for (const model of GEMINI_MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
      body,
    })
    if (r.status === 404) {
      last = 'model niedostępny'
      continue
    }
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      const msg: string = j?.error?.message ?? `błąd ${r.status}`
      if (r.status === 400 && /api key/i.test(msg)) throw new Error('Nieprawidłowy klucz Gemini – sprawdź go w Ustawieniach.')
      if (r.status === 429) throw new Error('Wyczerpany darmowy limit Gemini na teraz – spróbuj za chwilę albo jutro.')
      throw new Error(msg)
    }
    const text: string = (j?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('')
    const est = parseEstimate(text)
    if (!est) throw new Error('AI nie rozpoznała jedzenia na zdjęciu. Spróbuj zrobić zdjęcie z góry, w lepszym świetle.')
    return est
  }
  throw new Error(`Gemini: ${last}`)
}

/** przelicza składnik po zmianie gramatury */
export function rescale(it: PhotoItem, grams: number): PhotoItem {
  if (!it.grams) return { ...it, grams }
  const k = grams / it.grams
  const r = (x: number) => Math.round(x * k * 10) / 10
  return { ...it, grams, kcal: Math.round(it.kcal * k), p: r(it.p), f: r(it.f), c: r(it.c) }
}
