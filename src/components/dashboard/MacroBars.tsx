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

function Bar({ label, value, target, color }: {
  label: string
  value: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 110) : 0
  const over = pct > 100

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-neutral-400">{label}</span>
        <span className={over ? 'text-orange-400' : 'text-neutral-300'}>
          {Math.round(value)} / {Math.round(target)}
        </span>
      </div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-orange-500' : color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function MacroBars({ macros, targets }: Props) {
  return (
    <div className="space-y-4">
      <Bar label="Calories" value={macros.kcal} target={targets.kcal} color="bg-emerald-500" />
      <Bar label="Protein" value={macros.protein_g} target={targets.protein_g} color="bg-blue-500" />
      <Bar label="Carbohydrates" value={macros.carbs_g} target={targets.carbs_g} color="bg-yellow-500" />
      <Bar label="Fat" value={macros.fat_g} target={targets.fat_g} color="bg-pink-500" />
    </div>
  )
}
