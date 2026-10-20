import type { Exercise, SetEntry, Workout, WorkoutExercise } from '../types'

/** szacowany ciężar maksymalny (1RM) – wzór Epleya, z uwzględnieniem zapasu powtórzeń (RIR) */
export function e1rm(w: number, r: number, rir = 0): number {
  const reps = r + (rir || 0)
  if (!w || !r) return 0
  if (reps <= 1) return w
  return w * (1 + reps / 30)
}

export function workingSets(we: WorkoutExercise): SetEntry[] {
  return we.sets.filter((s) => s.done && !s.warmup)
}

export function roundTo(x: number, step: number) {
  if (!step) return Math.round(x * 10) / 10
  return Math.round(x / step) * step
}

export interface Suggestion {
  weight?: number
  reps?: number
  /** krótka podpowiedź po polsku */
  text: string
  kind: 'start' | 'increase' | 'reps' | 'hold' | 'decrease'
}

/**
 * Progresja podwójna: trzymaj ciężar i dokładaj powtórzenia aż do górnej granicy zakresu we wszystkich seriach,
 * wtedy zwiększ ciężar. Dwie sesje z rzędu poniżej dolnej granicy → zmniejsz ciężar o ~10%.
 */
export function suggest(ex: Exercise, repMin: number, repMax: number, history: WorkoutExercise[]): Suggestion {
  const last = history[0] ? workingSets(history[0]) : []
  if (ex.load === 'cardio') {
    return { text: 'Wpisz czas i dystans. Postęp: dłużej, szybciej lub większe nachylenie.', kind: 'hold' }
  }
  if (ex.load === 'time') {
    const best = Math.max(0, ...last.map((s) => s.t ?? 0))
    if (!best) return { text: `Cel: ${repMin}–${repMax} s w każdej serii.`, kind: 'start' }
    if (best >= repMax) return { reps: repMax, text: `Ostatnio ${best} s – dołóż ciężar lub trudniejszą wersję.`, kind: 'increase' }
    return { reps: best + 5, text: `Ostatnio ${best} s – spróbuj ${best + 5} s.`, kind: 'reps' }
  }
  if (!last.length) {
    return {
      text: ex.load === 'bodyweight'
        ? `Pierwsza sesja: zrób ${repMin}–${repMax} powtórzeń, kończąc 1–2 przed upadkiem.`
        : `Pierwsza sesja: wybierz ciężar, z którym zrobisz ${repMax} powtórzeń z zapasem 2–3.`,
      kind: 'start',
    }
  }
  const top = last.reduce((a, s) => ((s.w ?? 0) > (a.w ?? 0) ? s : a), last[0])
  const w = top.w ?? 0
  const sameW = last.filter((s) => (s.w ?? 0) === w)
  const minReps = Math.min(...sameW.map((s) => s.r ?? 0))
  const allTop = sameW.every((s) => (s.r ?? 0) >= repMax)
  const belowMin = sameW.filter((s) => (s.r ?? 0) < repMin).length > sameW.length / 2

  if (allTop) {
    if (ex.load === 'bodyweight' && !w) {
      return { reps: repMax, text: `Zrobione ${repMax}+ we wszystkich seriach – dodaj obciążenie lub trudniejszą wersję ćwiczenia.`, kind: 'increase' }
    }
    const inc = ex.inc || 2.5
    const nw = roundTo(w + inc, 0.25)
    return { weight: nw, reps: repMin, text: `Wszystkie serie na górze zakresu – zwiększ do ${fmtKg(nw)} i celuj w ${repMin}+ powt.`, kind: 'increase' }
  }
  if (belowMin) {
    const prev = history[1] ? workingSets(history[1]) : []
    const prevBelow = prev.length > 0 && prev.filter((s) => (s.w ?? 0) >= w && (s.r ?? 0) < repMin).length > prev.length / 2
    if (prevBelow && w > 0) {
      const nw = roundTo(w * 0.9, ex.inc || 2.5)
      return { weight: nw, reps: repMax, text: `Drugi raz poniżej ${repMin} powt. – zmniejsz do ${fmtKg(nw)} i odbuduj.`, kind: 'decrease' }
    }
    return { weight: w || undefined, reps: repMin, text: `Ostatnio poniżej zakresu – zostań przy ${w ? fmtKg(w) : 'tej wersji'} i celuj w ${repMin} powt.`, kind: 'hold' }
  }
  // RIR (zapas powtórzeń): duży zapas w każdej serii = ciężar jest za lekki, mimo że nie doszedłeś do góry zakresu
  const rirs = sameW.map((s) => s.rir).filter((x): x is number => x !== undefined)
  if (w > 0 && rirs.length === sameW.length && Math.min(...rirs) >= 4) {
    const nw = roundTo(w + (ex.inc || 2.5), 0.25)
    return { weight: nw, reps: Math.max(repMin, minReps - 1), text: `Ostatnio zapas ${Math.min(...rirs)}+ powt. w każdej serii – ciężar jest za lekki, spróbuj ${fmtKg(nw)}.`, kind: 'increase' }
  }
  const target = Math.min(repMax, minReps + 1)
  if (rirs.length === sameW.length && rirs.length > 0 && Math.max(...rirs) === 0 && minReps >= repMin) {
    return { weight: w || undefined, reps: minReps, text: `Ostatnio każda seria do upadku (RIR 0). Zostań przy ${w ? fmtKg(w) : 'tej wersji'} i powtórz ${minReps} powt. z 1–2 w zapasie – szybciej się zregenerujesz.`, kind: 'hold' }
  }
  return { weight: w || undefined, reps: target, text: `Zostań przy ${w ? fmtKg(w) : 'tej wersji'} i dołóż powtórzenie (cel: ${target} w każdej serii).`, kind: 'reps' }
}

export function fmtKg(w: number) {
  return `${String(Math.round(w * 100) / 100).replace('.', ',')} kg`
}

/** historia wykonania ćwiczenia – najnowsze najpierw */
export function exerciseHistory(workouts: Workout[], exerciseId: string): { workout: Workout; we: WorkoutExercise }[] {
  const out: { workout: Workout; we: WorkoutExercise }[] = []
  for (const w of workouts) {
    if (!w.finishedAt) continue
    for (const we of w.exercises) if (we.exerciseId === exerciseId && workingSets(we).length) out.push({ workout: w, we })
  }
  return out.sort((a, b) => b.workout.startedAt - a.workout.startedAt)
}

export interface Records {
  e1rm?: { value: number; w: number; r: number; date: string }
  weight?: { w: number; r: number; date: string }
  reps?: { r: number; w: number; date: string }
  volume?: { value: number; date: string }
}

export function records(hist: { workout: Workout; we: WorkoutExercise }[]): Records {
  const rec: Records = {}
  for (const { workout, we } of hist) {
    let vol = 0
    for (const s of workingSets(we)) {
      const w = s.w ?? 0
      const r = s.r ?? 0
      vol += w * r
      const est = e1rm(w, r)
      if (w && r <= 15 && (!rec.e1rm || est > rec.e1rm.value)) rec.e1rm = { value: est, w, r, date: workout.date }
      if (w && (!rec.weight || w > rec.weight.w || (w === rec.weight.w && r > rec.weight.r))) rec.weight = { w, r, date: workout.date }
      if (r && (!rec.reps || r > rec.reps.r)) rec.reps = { r, w, date: workout.date }
    }
    if (vol && (!rec.volume || vol > rec.volume.value)) rec.volume = { value: vol, date: workout.date }
  }
  return rec
}
