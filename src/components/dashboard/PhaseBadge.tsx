import type { Phase } from '@/lib/database.types'
import { PHASE_LABELS } from '@/lib/phase-detection'

const PHASE_STYLE: Record<Phase, { color: string; bg: string; border: string }> = {
  cut:         { color: 'var(--phase-cut)',         bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)' },
  bulk:        { color: 'var(--phase-bulk)',        bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)' },
  lean_bulk:   { color: 'var(--phase-lean-bulk)',   bg: 'rgba(45,212,191,0.08)',  border: 'rgba(45,212,191,0.25)' },
  maintenance: { color: 'var(--phase-maintenance)', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
}

interface Props { phase: Phase; confidence: number }

export function PhaseBadge({ phase, confidence }: Props) {
  const s = PHASE_STYLE[phase] ?? PHASE_STYLE.maintenance
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      <span className="text-[13px] font-semibold" style={{ color: s.color }}>
        {PHASE_LABELS[phase]}
      </span>
      <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
        {Math.round(confidence * 100)}%
      </span>
    </div>
  )
}
