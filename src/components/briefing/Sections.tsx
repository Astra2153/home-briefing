import { useState, type ReactNode } from 'react'
import {
  ChevronDown,
  CircleCheck,
  Download,
  List,
  MessageCircleQuestion,
  RotateCw,
  SendHorizontal,
  Settings2,
  type LucideIcon,
} from 'lucide-react'
import type { Scenario } from '@/data/scenarios'
import type { ActionId, Briefing, ControlOption } from '@/lib/triage'
import { SUGGESTED_QUESTIONS, answerQuestion } from '@/lib/triage'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-4 pt-7" aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

// While you were away: grouped activity vs the learned normal
export function ActivitySection({ briefing: b, onViewAll }: { briefing: Briefing; onViewAll: () => void }) {
  const a = b.activity
  const max = Math.max(3, ...a.hours.map((h) => Math.max(h.actual, h.typical)))
  const label = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`

  return (
    <Section
      title="While you were away"
      aside={
        <button
          onClick={onViewAll}
          className="-my-3 min-h-11 cursor-pointer px-1 text-[13px] font-semibold text-primary"
        >
          All {a.totalToday} events
        </button>
      }
    >
      <div className="px-1">
        <p className="text-[15px] font-semibold">{a.headline}</p>
        <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">{a.detail}</p>
      </div>

      <div
        className="mt-4 flex h-28 items-end gap-1.5 px-1"
        role="img"
        aria-label={a.hours
          .map((h) => `${label(h.hour)}: ${h.observed ? `${h.actual} movements, usually ${h.typical}` : 'no data'}`)
          .join('; ')}
      >
        {a.hours.map((h) => {
          const busy = a.burst?.hour === h.hour
          return (
            <div key={h.hour} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div className="relative flex w-full flex-1 items-end justify-center">
                {h.observed ? (
                  <div
                    className={cn('w-full max-w-7 rounded-t-md', busy ? 'bg-attention' : 'bg-primary/70')}
                    style={{ height: `${(h.actual / max) * 100}%`, minHeight: h.actual ? 4 : 0 }}
                  />
                ) : (
                  <div className="hatch h-full w-full max-w-7 rounded-t-md text-foreground/15" />
                )}
                {h.observed && (
                  <div
                    className="absolute inset-x-0 mx-auto w-full max-w-9 border-t-2 border-dashed border-foreground/45"
                    style={{ bottom: `${(h.typical / max) * 100}%` }}
                  />
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">{label(h.hour)}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-4 px-1 text-[11.5px] text-muted-foreground" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-primary/70" /> Movement
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-foreground/45" /> Usual for that hour
        </span>
        {a.hours.some((h) => !h.observed) && (
          <span className="flex items-center gap-1.5">
            <span className="hatch h-2.5 w-3 rounded-[2px] text-foreground/30" /> No data
          </span>
        )}
      </div>
    </Section>
  )
}

// Everything else is fine
export function AllClearRow({ items, offline }: { items: string[]; offline: boolean }) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) {
    return (
      <div className="mx-4 mt-3 rounded-2xl border border-dashed px-4 py-3 text-[13.5px] text-muted-foreground">
        {offline ? "We can't confirm anything else until the hub is back online." : 'Nothing else to report.'}
      </div>
    )
  }
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mx-4 mt-3 rounded-2xl bg-calm-soft">
      <CollapsibleTrigger className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 px-4 text-left">
        <CircleCheck className="size-5 text-calm" aria-hidden />
        <span className="flex-1 text-[14.5px] font-semibold">Everything else is fine</span>
        <span className="text-[12.5px] text-foreground/70">{items.length} checks</span>
        <ChevronDown
          className={cn('size-4 text-foreground/70 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-2 px-4 pb-4 pl-11 text-[13.5px]">
          {items.map((i) => (
            <li key={i} className="text-foreground/80">
              {i}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Ask your home: rule-based answers from the same data, no LLM
export function AskHome({ scenario, briefing }: { scenario: Scenario; briefing: Briefing }) {
  const [q, setQ] = useState('')
  const [thread, setThread] = useState<{ q: string; a: string }[]>([])

  const ask = (question: string) => {
    const text = question.trim()
    if (!text) return
    setThread((t) => [...t.slice(-2), { q: text, a: answerQuestion(text, scenario, briefing) }])
    setQ('')
  }

  return (
    <Section title="Ask your home">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
        {SUGGESTED_QUESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="min-h-11 shrink-0 cursor-pointer rounded-full border bg-card px-3.5 text-[13px] font-medium hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>

      {thread.length > 0 && (
        <ul className="mt-3 space-y-3" aria-live="polite">
          {thread.map((m, i) => (
            <li key={i} className="rise-in space-y-1.5">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[14px] text-primary-foreground">
                {m.q}
              </p>
              <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-card px-3.5 py-2.5 text-[14px] leading-snug border">
                {m.a}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex items-center gap-2 rounded-full border bg-card p-1 pl-4 focus-within:ring-2 focus-within:ring-ring"
        onSubmit={(e) => {
          e.preventDefault()
          ask(q)
        }}
      >
        <MessageCircleQuestion className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <label htmlFor="ask" className="sr-only">
          Ask a question about your home
        </label>
        <input
          id="ask"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Was anyone home after 9?"
          className="h-10 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Ask"
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          disabled={!q.trim()}
        >
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </Section>
  )
}

// Device health: human words first, raw telemetry second
export function DeviceHealth({ briefing: b }: { briefing: Briefing }) {
  const [open, setOpen] = useState(false)
  const issues = b.health.filter((h) => !h.ok).length
  return (
    <Section title="Device health">
      <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border bg-card">
        <CollapsibleTrigger className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 text-left">
          <span className="flex-1">
            <span className="block text-[14.5px] font-semibold">Home Hub</span>
            <span className="block text-[12.5px] text-muted-foreground">
              {issues === 0 ? 'Healthy' : `${issues} ${issues === 1 ? 'item needs' : 'items need'} attention`}, tap for
              details
            </span>
          </span>
          <ChevronDown
            className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <dl className="divide-y border-t">
            {b.health.map((h) => (
              <div key={h.label} className="flex items-center gap-3 px-4 py-3 text-[14px]">
                <dt className="w-24 shrink-0 text-muted-foreground">{h.label}</dt>
                <dd className={cn('flex-1 font-medium', !h.ok && 'text-urgent')}>{h.value}</dd>
                <dd className="text-[12.5px] text-muted-foreground">{h.raw}</dd>
              </div>
            ))}
          </dl>
        </CollapsibleContent>
      </Collapsible>
    </Section>
  )
}

// Controls: ranked, each one says why it is or isn't suggested
const CONTROL_ICON: Partial<Record<ActionId, LucideIcon>> = {
  restart: RotateCw,
  update: Download,
  settings: Settings2,
  view_all: List,
}
const STATUS_BADGE: Record<
  ControlOption['status'],
  { text: string; variant: 'calm' | 'neutral' | 'outline' | 'attention' } | null
> = {
  recommended: { text: 'Suggested', variant: 'attention' },
  available: null,
  not_needed: { text: 'Not needed', variant: 'calm' },
  unavailable: { text: 'Unavailable', variant: 'neutral' },
}

export function Controls({ controls, onRun }: { controls: ControlOption[]; onRun: (id: ActionId) => void }) {
  return (
    <Section title="Controls">
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {controls.map((c) => {
          const Icon = CONTROL_ICON[c.id] ?? Settings2
          const badge = STATUS_BADGE[c.status]
          return (
            <li key={c.id}>
              <button
                onClick={() => onRun(c.id)}
                disabled={c.status === 'unavailable'}
                aria-describedby={`why-${c.id}`}
                className="flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <Icon
                  className={cn(
                    'size-5 shrink-0',
                    c.status === 'unavailable' ? 'text-muted-foreground/50' : 'text-primary',
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-[14.5px] font-semibold',
                      c.status === 'unavailable' && 'text-muted-foreground',
                    )}
                  >
                    {c.label}
                  </span>
                  <span id={`why-${c.id}`} className="block text-[12.5px] leading-snug text-muted-foreground">
                    {c.reason}
                  </span>
                </span>
                {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
              </button>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
