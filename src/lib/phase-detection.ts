import type { Phase } from './database.types'

interface PhaseSignals {
  caloric_delta: number
  weight_trend_kg_wk: number
  data_points: number
}

export interface PhaseResult {
  phase: Phase
  confidence: number
}

function linearSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean)
    den += (x - xMean) ** 2
  })
  return den === 0 ? 0 : num / den
}

export function computeWeightTrend(weights: number[]): number {
  return linearSlope(weights) * 7
}

export function computeCaloricDelta(dailyKcal: number[], tdee: number): number {
  if (dailyKcal.length === 0) return 0
  const avg = dailyKcal.reduce((a, b) => a + b, 0) / dailyKcal.length
  return avg - tdee
}

export function detectPhase(signals: PhaseSignals): PhaseResult {
  const { caloric_delta: cd, weight_trend_kg_wk: wt, data_points } = signals

  if (data_points < 7) {
    return { phase: 'maintenance', confidence: 0.3 }
  }

  if (cd < -250 && wt < -0.15) {
    const strength = Math.min(1, (Math.abs(cd) - 250) / 300 + (Math.abs(wt) - 0.15) / 0.3)
    return { phase: 'cut', confidence: +(0.6 + strength * 0.35).toFixed(3) }
  }

  if (cd > 300 && wt > 0.25) {
    const strength = Math.min(1, (cd - 300) / 400 + (wt - 0.25) / 0.3)
    return { phase: 'bulk', confidence: +(0.6 + strength * 0.35).toFixed(3) }
  }

  if (cd >= 80 && cd <= 350 && wt >= 0.04 && wt <= 0.28) {
    return { phase: 'lean_bulk', confidence: 0.75 }
  }

  if (Math.abs(cd) <= 200 && Math.abs(wt) < 0.1) {
    const clarity = Math.max(0, 1 - (Math.abs(cd) / 200 + Math.abs(wt) / 0.1) / 2)
    return { phase: 'maintenance', confidence: +(0.5 + clarity * 0.45).toFixed(3) }
  }

  if (cd < 0 || wt < -0.05) return { phase: 'cut', confidence: 0.45 }
  if (cd > 0 || wt > 0.05) return { phase: 'lean_bulk', confidence: 0.45 }
  return { phase: 'maintenance', confidence: 0.4 }
}

export const PHASE_LABELS: Record<Phase, string> = {
  cut: 'Cut',
  bulk: 'Bulk',
  lean_bulk: 'Lean Bulk',
  maintenance: 'Maintenance',
}

export const PHASE_COLORS: Record<Phase, string> = {
  cut: 'text-orange-400',
  bulk: 'text-blue-400',
  lean_bulk: 'text-emerald-400',
  maintenance: 'text-neutral-300',
}

export const PHASE_BG: Record<Phase, string> = {
  cut: 'bg-orange-900/30 border-orange-800/50',
  bulk: 'bg-blue-900/30 border-blue-800/50',
  lean_bulk: 'bg-emerald-900/30 border-emerald-800/50',
  maintenance: 'bg-neutral-800/50 border-neutral-700/50',
}
