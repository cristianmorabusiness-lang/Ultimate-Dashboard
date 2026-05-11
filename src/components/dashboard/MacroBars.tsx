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
  { key: 'kcal' as const, label: 'Calorie', unit: 'kcal', color: '#7c3aed', glow: 'rgba(124,58,237,0.4)' },
  { key: 'protein_g' as const, label: 'Proteine', unit: 'g', color: '#3b82f6', glow: 'rgba(59,130,246,0.4)' },
  { key: 'carbs_g' as const, label: 'Carboidrati', unit: 'g', color: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  { key: 'fat_g' as const, label: 'Grassi', unit: 'g', color: '#ec4899', glow: 'rgba(236,72,153,0.4)' },
]

export function MacroBars({ macros, targets }: Props) {
  return (
    <div className="space-y-4">
      {BARS.map(({ key, label, unit, color, glow }) => {
        const value = Math.round(macros[key])
        const target = Math.round(targets[key])
        const pct = target > 0 ? Math.min((value / target) * 100, 110) : 0
        const over = pct > 100
        const displayColor = over ? '#f87171' : color

        return (
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs" style={{ color: '#6b5f8a' }}>{label}</span>
              <span className="font-mono text-xs" style={{ color: over ? '#f87171' : '#d8b4fe' }}>
                {value}<span style={{ color: '#4a4268' }}>/{target}{unit}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: displayColor,
                  boxShadow: `0 0 8px ${over ? 'rgba(248,113,113,0.5)' : glow}`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
