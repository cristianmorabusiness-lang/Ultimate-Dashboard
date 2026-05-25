'use client'

interface MacroTotals {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface Props {
  macros: MacroTotals
  targets: MacroTotals
}

const BARS = [
  { key: 'kcal' as const,      label: 'Calorie',     unit: 'kcal', color: 'var(--macro-kcal)' },
  { key: 'protein_g' as const, label: 'Proteine',    unit: 'g',    color: 'var(--macro-protein)' },
  { key: 'carbs_g' as const,   label: 'Carboidrati', unit: 'g',    color: 'var(--macro-carbs)' },
  { key: 'fat_g' as const,     label: 'Grassi',      unit: 'g',    color: 'var(--macro-fat)' },
]

export function MacroBars({ macros, targets }: Props) {
  return (
    <div className="space-y-4">
      {BARS.map(({ key, label, unit, color }) => {
        const value = Math.round(macros[key])
        const target = Math.round(targets[key])
        const pct = target > 0 ? Math.min((value / target) * 100, 110) : 0
        const over = pct > 100
        const displayColor = over ? 'var(--danger)' : color

        return (
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="font-mono text-xs" style={{ color: over ? 'var(--danger)' : 'var(--text)' }}>
                {value}<span style={{ color: 'var(--text-dim)' }}>/{target}{unit}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: displayColor,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
