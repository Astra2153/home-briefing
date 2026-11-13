import { useState } from 'react'
import { ChevronDown, CircleCheck, Footprints, Loader2, WifiOff, BatteryLow, type LucideIcon } from 'lucide-react'
import type { Finding } from '@/lib/triage'
import { clock } from '@/lib/time'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SEVERITY, levelToState } from '@/components/severity'
import { cn } from '@/lib/utils'

const KIND_ICON: Record<Finding['kind'], LucideIcon> = {
  offline: WifiOff,
  disconnect_resolved: WifiOff,
  battery_low: BatteryLow,
  movement_unusual: Footprints,
}

interface Props {
  finding: Finding
  busy: boolean
  note?: string
  resolved?: string
  onAction: () => void
  onDismiss: () => void
}

export function FindingCard({ finding: f, busy, note, resolved, onAction, onDismiss }: Props) {
  const [open, setOpen] = useState(false)
  const meta = SEVERITY[levelToState(f.level)]
  const KindIcon = KIND_ICON[f.kind]

  if (resolved) {
    return (
      <li className="rise-in flex items-start gap-3 rounded-2xl border border-dashed px-4 py-3.5">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-calm" aria-hidden />
        <div>
          <p className="text-[14px] font-semibold">Resolved</p>
          <p className="text-[13px] text-muted-foreground">{resolved}</p>
        </div>
      </li>
    )
  }

  return (
    <li className="rise-in overflow-hidden rounded-[22px] border bg-card shadow-[0_1px_2px_rgba(16,24,32,0.05)]">
      <div className={cn('h-1', meta.solid)} aria-hidden />
      <div className="px-4 pb-4 pt-3.5">
        <div className="flex items-start gap-3">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', meta.soft, meta.text)}>
            <KindIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn('flex items-center gap-1 text-[12px] font-semibold', meta.text)}>
              <meta.Icon className="size-3.5" aria-hidden />
              {meta.label}
            </p>
            <h3 className="mt-0.5 text-[16.5px] font-semibold leading-snug tracking-[-0.01em]">{f.title}</h3>
            <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{f.why}</p>
          </div>
        </div>

        {f.inference && (
          <div className="mt-3 rounded-2xl bg-muted/70 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-muted-foreground">Our best guess</p>
              <Badge
                variant={
                  f.inference.confidence === 'High'
                    ? 'calm'
                    : f.inference.confidence === 'Medium'
                      ? 'attention'
                      : 'neutral'
                }
              >
                {f.inference.confidence} confidence
              </Badge>
            </div>
            <p className="mt-1 text-[14px] leading-snug">{f.inference.cause}</p>
            {f.inference.alternatives.length > 0 && (
              <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
                Could also be: {f.inference.alternatives.join(' ')}
              </p>
            )}
          </div>
        )}

        {note && <p className="mt-3 text-[13px] font-medium text-urgent">{note}</p>}

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant={f.level === 'urgent' ? 'urgent' : 'default'}
            onClick={onAction}
            disabled={busy}
            className="flex-1"
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {f.action.label}
          </Button>
          <Button variant="ghost" onClick={onDismiss} disabled={busy}>
            I'm aware
          </Button>
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl text-[13px] font-semibold text-muted-foreground hover:text-foreground">
            Why am I seeing this?
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ol className="relative ml-1.5 border-l pl-4 text-[13px]">
              {f.evidence.map((e, i) => (
                <li key={i} className="relative py-1">
                  <span className="absolute -left-[21px] top-[11px] size-2 rounded-full bg-foreground/40" aria-hidden />
                  {e.t !== undefined && <span className="mr-2 font-semibold">{clock(e.t)}</span>}
                  <span className="text-muted-foreground">{e.text}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 rounded-xl border px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Rule: </span>
              {f.rule}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </li>
  )
}
