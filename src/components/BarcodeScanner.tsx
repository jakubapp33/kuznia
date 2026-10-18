import { useEffect, useRef, useState } from 'react'

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
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } },
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
            ? 'Brak dostępu do aparatu. Zezwól na dostęp w ustawieniach Safari (Ustawienia → Safari → Aparat).'
            : 'Nie udało się uruchomić aparatu. Możesz wpisać kod ręcznie poniżej.',
        )
      }
    })()
    return () => {
      cancelled = true
      stop?.()
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
