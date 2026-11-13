import { Download, Footprints, WifiOff } from 'lucide-react'
import type { EventType, HomeEvent, Scenario } from '@/data/scenarios'
import { clock } from '@/lib/time'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const META: Record<EventType, { label: string; Icon: typeof Footprints; tone: string }> = {
  movement: { label: 'Movement detected', Icon: Footprints, tone: 'text-muted-foreground' },
  disconnected: { label: 'Device disconnected', Icon: WifiOff, tone: 'text-attention' },
  software_updated: { label: 'Software updated', Icon: Download, tone: 'text-primary' },
}

interface Props {
  scenario: Scenario
  open: boolean
  onOpenChange: (o: boolean) => void
  container: HTMLElement | null
  highlight?: string[]
}

function Group({ title, items, highlight }: { title: string; items: HomeEvent[]; highlight: string[] }) {
  return (
    <>
      <h3 className="sticky top-0 z-10 bg-card px-5 pb-2 pt-4 text-[13px] font-semibold text-muted-foreground">
        {title}
      </h3>
      <ul>
        {items.map((e) => {
          const m = META[e.type]
          const hl = highlight.includes(e.id)
          return (
            <li key={e.id} className={cn('flex min-h-12 items-center gap-3 px-5 py-2', hl && 'bg-attention-soft')}>
              <span className="w-[70px] shrink-0 text-[13.5px] font-semibold">{clock(e.t)}</span>
              <m.Icon className={cn('size-4 shrink-0', m.tone)} aria-hidden />
              <span className="text-[14px]">
                {m.label}
                {e.room && <span className="text-muted-foreground">, {e.room.toLowerCase()}</span>}
                {e.detail && <span className="text-muted-foreground"> to {e.detail}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** The full raw timeline. Nothing from the old screen is gone, just demoted. */
export function EventsSheet({ scenario: s, open, onOpenChange, container, highlight = [] }: Props) {
  const away = s.events.filter((e) => e.t >= s.awayFrom).reverse()
  const before = s.events.filter((e) => e.t < s.awayFrom).reverse()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent container={container}>
        <div className="px-5 pb-1 pt-3">
          <SheetTitle className="text-[19px] font-semibold">All events today</SheetTitle>
          <SheetDescription className="text-[13px] text-muted-foreground">
            {s.events.length} events, newest first
            {highlight.length ? `. The highlighted ones are the unusual burst.` : '.'}
          </SheetDescription>
        </div>
        <div className="overflow-y-auto pb-8">
          <Group title={`While you were away (${away.length})`} items={away} highlight={highlight} />
          {before.length > 0 && (
            <Group title={`Before you left (${before.length})`} items={before} highlight={highlight} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
