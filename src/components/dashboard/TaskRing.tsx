interface TaskRingProps {
  done: number
  total: number
  size?: number
  stroke?: number
  /** Show "done/total" instead of a percentage in the center */
  showFraction?: boolean
}

/**
 * Circular progress ring that fills based on completed tasks.
 * Pure presentational SVG donut — works at any size (dashboard card or full page).
 */
export function TaskRing({ done, total, size = 120, stroke = 10, showFraction = true }: TaskRingProps) {
  const pct = total > 0 ? done / total : 0
  const complete = total > 0 && done === total
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)
  const color = complete ? 'var(--success)' : 'var(--accent)'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke}
          stroke="var(--surface-soft)"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showFraction ? (
          <>
            <span className="font-mono font-bold leading-none" style={{ color: 'var(--text)', fontSize: size * 0.26 }}>
              {done}<span style={{ color: 'var(--text-dim)' }}>/{total}</span>
            </span>
            <span className="uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)', fontSize: Math.max(8, size * 0.085) }}>
              {complete ? 'completate' : 'attività'}
            </span>
          </>
        ) : (
          <span className="font-mono font-bold leading-none" style={{ color: 'var(--text)', fontSize: size * 0.26 }}>
            {Math.round(pct * 100)}%
          </span>
        )}
      </div>
    </div>
  )
}
