import type { Phase } from '@/lib/database.types'
import { PHASE_LABELS } from '@/lib/phase-detection'

const PHASE_STYLE: Record<Phase, { color: string; bg: string; border: string }> = {
  cut:         { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.25)' },
  bulk:        { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)' },
  lean_bulk:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
  maintenance: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)' },
}

interface Props { phase: Phase; confidence: number }

export function PhaseBadge({ phase, confidence }: Props) {
  const s = PHASE_STYLE[phase] ?? PHASE_STYLE.maintenance
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="text-[13px] font-semibold" style={{ color: s.color }}>
        {PHASE_LABELS[phase]}
      </span>
      <span className="text-[11px] font-mono" style={{ color: '#8b7faa' }}>
        {Math.round(confidence * 100)}%
      </span>
    </div>
  )
}
