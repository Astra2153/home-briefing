import type { Scenario } from '@/data/scenarios'
import type { Briefing, VerdictState } from '@/lib/triage'
import { recoveredAt } from '@/lib/triage'
import { clock } from '@/lib/time'
import { SEVERITY } from '@/components/severity'
import { cn } from '@/lib/utils'

interface Props {
  scenario: Scenario
  briefing: Briefing
  /** Overrides when the user has handled everything in this session */
  override?: { state: VerdictState; headline: string; summary: string }
}

export function VerdictHero({ scenario, briefing, override }: Props) {
  const v = { ...briefing.verdict, ...override }
  const meta = SEVERITY[v.state]

  return (
    <section
      aria-labelledby="verdict"
      className={cn('rise-in mx-4 rounded-[28px] px-5 pb-5 pt-4 transition-colors duration-500', meta.soft)}
    >
      <p className={cn('flex items-center gap-1.5 text-[13px] font-semibold', meta.text)}>
        <meta.Icon className="size-4" aria-hidden />
        <span>{meta.label}</span>
      </p>
      <h2 id="verdict" className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-balance">
        {v.headline}
      </h2>
      <p className="mt-2 text-[15px] leading-snug text-foreground/75 text-pretty">{v.summary}</p>

      <AwayStrip scenario={scenario} briefing={briefing} state={v.state} />

      <p className="mt-3 text-[12px] text-foreground/70">{v.freshness}</p>
    </section>
  )
}

/**
 * The away strip: your absence as one timeline. Movement is ticks, important
 * events are marks, and any period we couldn't see (hub offline) is hatched.
 */
function AwayStrip({
  scenario: s,
  briefing: b,
  state,
}: {
  scenario: Scenario
  briefing: Briefing
  state: VerdictState
}) {
  const from = s.awayFrom
  const to = s.now
  const pos = (t: number) => `${((Math.min(Math.max(t, from), to) - from) / (to - from)) * 100}%`

  const inWindow = s.events.filter((e) => e.t >= from && e.t <= to)
  const drop = [...inWindow].reverse().find((e) => e.type === 'disconnected')
  const gapEnd = drop ? (recoveredAt(s, drop) ?? to) : undefined
  const gapTone = s.device.connected ? 'text-attention' : 'text-urgent'
  const burst = b.activity.burst

  const description = [
    `While you were away, from ${clock(from)} to ${clock(to)}:`,
    `${b.activity.movementsInWindow} movements.`,
    drop ? `Hub offline from ${clock(drop.t)}${gapEnd === to ? ' until now' : ` to ${clock(gapEnd!)}`}.` : '',
  ].join(' ')

  return (
    <figure className="mt-5" role="img" aria-label={description}>
      <div className="relative h-9">
        {/* baseline track */}
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-foreground/15" />
        {/* unusual-hour highlight */}
        {burst && (
          <div
            className="absolute top-1 bottom-1 rounded-md bg-attention/20"
            style={{ left: pos(burst.from - 3), width: `calc(${pos(burst.to + 3)} - ${pos(burst.from - 3)})` }}
          />
        )}
        {/* offline gap */}
        {drop && gapEnd !== undefined && (
          <div
            className={cn('hatch absolute top-1.5 bottom-1.5 rounded-sm opacity-70', gapTone)}
            style={{ left: pos(drop.t), width: `max(6px, calc(${pos(gapEnd)} - ${pos(drop.t)}))` }}
          />
        )}
        {/* events */}
        {inWindow.map((e) =>
          e.type === 'movement' ? (
            <span
              key={e.id}
              className="absolute top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/45"
              style={{ left: pos(e.t) }}
            />
          ) : (
            <span
              key={e.id}
              className={cn(
                'absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-[color:var(--card)]',
                e.type === 'software_updated' ? 'bg-primary' : state === 'urgent' ? 'bg-urgent' : 'bg-attention',
              )}
              style={{ left: pos(e.t) }}
            />
          ),
        )}
        {/* now */}
        <span className="absolute right-0 top-1/2 size-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-foreground" />
      </div>
      <figcaption className="mt-1 flex justify-between text-[12px] font-medium text-foreground/70" aria-hidden>
        <span>Left {clock(from)}</span>
        <span>Now {clock(to)}</span>
      </figcaption>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-foreground/70" aria-hidden>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-[2px] rounded-full bg-foreground/45" />
          Movement
        </li>
        {inWindow.some((e) => e.type === 'software_updated') && (
          <li className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            Update
          </li>
        )}
        {drop && (
          <li className={cn('flex items-center gap-1.5', gapTone)}>
            <span className="hatch h-2.5 w-4 rounded-[2px]" />
            <span className="text-foreground/70">Couldn't see</span>
          </li>
        )}
      </ul>
    </figure>
  )
}
