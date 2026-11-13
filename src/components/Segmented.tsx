import { cn } from '@/lib/utils'

/** Pill-shaped segmented control used for the demo controls and page tabs. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border bg-card p-1 shadow-sm">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-11 flex-1 cursor-pointer rounded-full px-3 text-[13px] font-semibold leading-tight transition-colors',
            value === o.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
          {o.hint && <span className="block text-[10.5px] font-medium opacity-70">{o.hint}</span>}
        </button>
      ))}
    </div>
  )
}
