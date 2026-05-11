import type { Phase } from '@/lib/database.types'
import { PHASE_LABELS, PHASE_COLORS, PHASE_BG } from '@/lib/phase-detection'

interface Props {
  phase: Phase
  confidence: number
}

export function PhaseBadge({ phase, confidence }: Props) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${PHASE_BG[phase]}`}>
      <span className={`text-sm font-medium ${PHASE_COLORS[phase]}`}>
        {PHASE_LABELS[phase]}
      </span>
      <span className="text-xs text-neutral-500">
        {Math.round(confidence * 100)}%
      </span>
    </div>
  )
}
