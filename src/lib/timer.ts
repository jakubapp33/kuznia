import { useSyncExternalStore } from 'react'

/** Timer przerwy między seriami. Trzyma czas zakończenia, więc działa też po wyjściu z aplikacji i powrocie. */
interface TimerState {
  endAt: number | null
  total: number
}

const KEY = 'kuznia.timer'
let state: TimerState = load()
const listeners = new Set<() => void>()
let tick: ReturnType<typeof setInterval> | undefined
let beeped = false

function load(): TimerState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TimerState | null
    if (s && s.endAt && s.endAt > Date.now()) return s
  } catch {
    /* brak dostępu do pamięci */
  }
  return { endAt: null, total: 0 }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignoruj */
  }
}

function emit() {
  for (const l of listeners) l()
}

function ensureTick() {
  if (tick || !state.endAt) return
  tick = setInterval(() => {
    if (state.endAt && Date.now() >= state.endAt && !beeped) {
      beeped = true
      beep()
    }
    emit()
  }, 250)
}

export function startTimer(sec: number) {
  unlockAudio()
  state = { endAt: Date.now() + sec * 1000, total: sec }
  beeped = false
  save()
  ensureTick()
  emit()
}

export function addTime(sec: number) {
  if (!state.endAt) return
  state = { endAt: Math.max(Date.now(), state.endAt) + sec * 1000, total: Math.max(1, state.total + sec) }
  beeped = false
  save()
  emit()
}

export function stopTimer() {
  state = { endAt: null, total: 0 }
  if (tick) clearInterval(tick)
  tick = undefined
  save()
  emit()
}

let snapshot = { remaining: 0, total: 0, running: false }

function getSnapshot() {
  const remaining = state.endAt ? Math.max(0, (state.endAt - Date.now()) / 1000) : 0
  const running = !!state.endAt
  const r = Math.ceil(remaining)
  if (r !== snapshot.remaining || running !== snapshot.running || state.total !== snapshot.total) {
    snapshot = { remaining: r, total: state.total, running }
  }
  return snapshot
}

export function useTimer() {
  ensureTick()
  return useSyncExternalStore((cb) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, getSnapshot)
}

// ── dźwięk ─────────────────────────────────────────────
let ctx: AudioContext | undefined

/** iOS wymaga odblokowania dźwięku gestem użytkownika */
export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* brak dźwięku */
  }
}

function beep() {
  try {
    navigator.vibrate?.([200, 100, 200])
    if (!ctx) return
    const t = ctx.currentTime
    for (const [i, f] of [880, 880, 1320].entries()) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      o.connect(g)
      g.connect(ctx.destination)
      const s = t + i * 0.22
      g.gain.setValueAtTime(0.0001, s)
      g.gain.exponentialRampToValueAtTime(0.4, s + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18)
      o.start(s)
      o.stop(s + 0.2)
    }
  } catch {
    /* ignoruj */
  }
}
