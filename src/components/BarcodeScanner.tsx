import { useEffect, useRef, useState } from 'react'

/**
 * Jeden wspólny strumień z aparatu na całą sesję aplikacji.
 * iPhone pyta o zgodę przy każdym nowym getUserMedia – dlatego trzymamy strumień,
 * a skaner dostaje jego kopię (clone nie wymaga ponownej zgody).
 * Aparat wyłączamy po 5 min bez skanowania albo gdy aplikacja schodzi w tło.
 */
let shared: MediaStream | null = null
let releaseTimer: ReturnType<typeof setTimeout> | undefined

function releaseNow() {
  clearTimeout(releaseTimer)
  shared?.getTracks().forEach((t) => t.stop())
  shared = null
}

async function cameraStream(): Promise<MediaStream> {
  clearTimeout(releaseTimer)
  if (shared && shared.getVideoTracks().some((t) => t.readyState === 'live')) return shared
  shared = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false })
  return shared
}

function releaseLater() {
  clearTimeout(releaseTimer)
  releaseTimer = setTimeout(releaseNow, 5 * 60 * 1000)
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && releaseNow())
}

/** Skaner kodów kreskowych z aparatu (biblioteka ZXing – działa też w Safari na iPhonie). */
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const done = useRef(false)

  useEffect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E])
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
        if (cancelled || !video.current) return
        const stream = await cameraStream()
        if (cancelled || !video.current) return releaseLater()
        // kopia strumienia – ZXing po zakończeniu wyłącza tylko ją, a nie aparat
        const controls = await reader.decodeFromStream(
          stream.clone(),
          video.current,
          (result) => {
            if (result && !done.current) {
              done.current = true
              navigator.vibrate?.(80)
              controls.stop()
              onCode(result.getText())
            }
          },
        )
        stop = () => controls.stop()
        if (cancelled) stop()
      } catch (e) {
        const name = (e as Error)?.name
        setError(
          name === 'NotAllowedError'
            ? 'Brak dostępu do aparatu. Zezwól na dostęp: Ustawienia iPhone’a → Aplikacje → Safari → Aparat → „Zezwalaj”.'
            : 'Nie udało się uruchomić aparatu. Możesz wpisać kod ręcznie poniżej.',
        )
      }
    })()
    return () => {
      cancelled = true
      stop?.()
      releaseLater()
    }
  }, [onCode])

  return (
    <div className="stack">
      {error ? (
        <div className="note warn small">{error}</div>
      ) : (
        <div className="video-box">
          <video ref={video} playsInline muted />
          <div className="frame" />
        </div>
      )}
    </div>
  )
}
