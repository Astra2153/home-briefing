import { useMemo, useState, type ReactNode } from 'react'
import { Database, Monitor, Workflow } from 'lucide-react'
import triageSource from '@/lib/triage.ts?raw'
import { SCENARIOS } from '@/data/scenarios'
import { clock } from '@/lib/time'
import {
  batteryDaysLeft,
  buildBriefing,
  explainDisconnect,
  groupActivity,
  recoveredAt,
  signalLabel,
  type Briefing,
} from '@/lib/triage'
import type { ScenarioId } from '@/App'
import { Segmented } from '@/components/Segmented'
import { CodeBlock, JsonBlock } from './CodeView'
import { extractFunction } from '@/lib/source'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  name: string
  fn: string[]
  what: string
  feeds: string[]
  output: (id: ScenarioId, b: Briefing) => unknown
}

const scenarioOf = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!
const round = (n: number) => Math.round(n * 100) / 100

const STEPS: Step[] = [
  {
    id: 'group',
    name: 'Group the movement',
    fn: ['groupActivity'],
    what: 'Collapses every movement in the away window into one summary, then compares it hour by hour with what this home normally looks like. If the hub went offline, it only judges the part of the window it could actually see.',
    feeds: ['While you were away', 'Away strip'],
    output: (id) => {
      const a = groupActivity(scenarioOf(id))
      return {
        movementsInWindow: a.movementsInWindow,
        expected: round(a.expected),
        ratio: round(a.ratio),
        verdict: a.verdict,
        burst: a.burst
          ? { from: clock(a.burst.from), to: clock(a.burst.to), movements: a.burst.actual, usual: a.burst.typical }
          : null,
        headline: a.headline,
      }
    },
  },
  {
    id: 'explain',
    name: 'Explain disconnects',
    fn: ['explainDisconnect', 'recoveredAt'],
    what: 'For the latest disconnect, scores every possible cause and keeps the best guess plus the runners-up. It also works out whether the hub came back, using any sync or event that arrived after the drop.',
    feeds: ['Our best guess', 'Why am I seeing this?'],
    output: (id) => {
      const s = scenarioOf(id)
      const drop = [...s.events].reverse().find((e) => e.type === 'disconnected')
      if (!drop) return { disconnect: null, note: 'No disconnect in this scenario, so there is nothing to explain.' }
      const back = recoveredAt(s, drop)
      return {
        disconnectedAt: clock(drop.t),
        inference: explainDisconnect(s, drop),
        recoveredBy: back !== undefined ? clock(back) : null,
      }
    },
  },
  {
    id: 'score',
    name: 'Score findings',
    fn: ['buildFindings', 'levelFor'],
    what: 'Turns each problem into a finding with a score. The score decides the level: 30 or more is worth a look, 70 or more means act now. Only the top three non-info findings become cards.',
    feeds: ['Needs your attention', 'Severity colour and icon'],
    output: (_id, b) => b.findings.map((f) => ({ kind: f.kind, score: f.score, level: f.level, title: f.title })),
  },
  {
    id: 'health',
    name: 'Translate health',
    fn: ['signalLabel', 'batteryDaysLeft'],
    what: 'Rewrites raw telemetry in words people use. Signal strength in dBm becomes Excellent, Good, Fair or Weak, and battery percentage becomes an estimate of days left.',
    feeds: ['Device health', 'Everything else is fine'],
    output: (id, b) => {
      const d = scenarioOf(id).device
      return {
        signal: { raw: `${d.signalDbm} dBm`, label: signalLabel(d.signalDbm) },
        battery: { raw: `${d.batteryPct}%`, daysLeft: batteryDaysLeft(d.batteryPct, d.batteryDrainPctPerDay) },
        allClear: b.allClear,
      }
    },
  },
  {
    id: 'actions',
    name: 'Choose actions',
    fn: ['rankControls'],
    what: "Decides which controls to suggest. Restart is only suggested for repeated drops or a weak signal, and Update only when there is a newer version and the hub is online to install it. Every control carries a reason, so 'not needed' is explained rather than hidden.",
    feeds: ['Controls', 'Card buttons'],
    output: (_id, b) => b.controls.map((c) => ({ label: c.label, status: c.status, reason: c.reason })),
  },
  {
    id: 'verdict',
    name: 'Write the verdict',
    fn: ['makeVerdict'],
    what: 'Writes the single sentence at the top of the screen from the findings: urgent first, then worth a look, otherwise all clear. It also writes the freshness line underneath.',
    feeds: ['Verdict at the top'],
    output: (_id, b) => b.verdict,
  },
]

export function Pipeline() {
  const [scenario, setScenario] = useState<ScenarioId>('A')
  const [stepId, setStepId] = useState('group')
  const step = STEPS.find((s) => s.id === stepId)!
  const briefing = useMemo(() => buildBriefing(scenarioOf(scenario)), [scenario])
  const code = step.fn.map((f) => extractFunction(triageSource, f)).join('\n\n')
  const s = scenarioOf(scenario)

  return (
    <div>
      <div className="max-w-[520px]">
        <Segmented<ScenarioId>
          label="Scenario to trace"
          value={scenario}
          onChange={setScenario}
          options={SCENARIOS.map((x) => ({ value: x.id, label: x.label, hint: x.short }))}
        />
      </div>

      {/* Data, rules, screen */}
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1.4fr_1fr]">
        <Column icon={Database} title="Sample data" file="src/data/scenarios.ts">
          <ul className="space-y-1.5 text-[13.5px]">
            <li>{s.events.length} events today</li>
            <li>
              Device: {s.device.connected ? 'connected' : 'offline'}, {s.device.batteryPct}% battery,{' '}
              {s.device.signalDbm} dBm
            </li>
            <li>Software {s.device.softwareVersion}</li>
            <li>A normal day for this home, hour by hour</li>
          </ul>
        </Column>

        <Column icon={Workflow} title="Rules" file="src/lib/triage.ts">
          <ol className="space-y-1" aria-label="Steps">
            {STEPS.map((x, i) => (
              <li key={x.id}>
                <button
                  onClick={() => setStepId(x.id)}
                  aria-pressed={x.id === stepId}
                  className={cn(
                    'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[14px] transition-colors',
                    x.id === stepId ? 'bg-foreground text-background' : 'hover:bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold',
                      x.id === stepId ? 'bg-background text-foreground' : 'bg-muted',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="font-semibold">{x.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </Column>

        <Column icon={Monitor} title="Screen" file="src/components/briefing">
          <ul className="space-y-1.5 text-[13.5px]">
            {[
              'Verdict at the top',
              'Away strip',
              'Needs your attention',
              'Our best guess',
              'Why am I seeing this?',
              'Severity colour and icon',
              'Everything else is fine',
              'While you were away',
              'Device health',
              'Controls',
              'Card buttons',
            ].map((p) => (
              <li
                key={p}
                className={cn(
                  'rounded-lg px-2 py-0.5 transition-colors',
                  step.feeds.includes(p) ? 'bg-attention-soft font-semibold text-attention' : 'text-muted-foreground',
                )}
              >
                {p}
              </li>
            ))}
          </ul>
        </Column>
      </div>

      {/* The selected step */}
      <div className="mt-6 rounded-[24px] border bg-muted/40 p-4 sm:p-5">
        <h3 className="text-[17px] font-semibold">
          Step {STEPS.indexOf(step) + 1}: {step.name}
        </h3>
        <p className="mt-1.5 max-w-[68ch] text-[14.5px] leading-relaxed text-foreground/80">{step.what}</p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Feeds: <span className="font-semibold text-attention">{step.feeds.join(', ')}</span>
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <JsonBlock
            title={`Live output for "${scenarioOf(scenario).label}"`}
            value={step.output(scenario, briefing)}
          />
          <CodeBlock title={`triage.ts: ${step.fn.join(', ')}`} code={code} />
        </div>
      </div>
    </div>
  )
}

function Column({
  icon: Icon,
  title,
  file,
  children,
}: {
  icon: typeof Database
  title: string
  file: string
  children: ReactNode
}) {
  return (
    <section className="rounded-[20px] border bg-card p-4" aria-label={title}>
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <Icon className="size-4 text-primary" aria-hidden />
        {title}
      </p>
      <p className="mb-3 mt-0.5 font-mono text-[11.5px] text-muted-foreground">{file}</p>
      {children}
    </section>
  )
}
