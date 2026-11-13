import { useState, type ReactNode } from 'react'
import { CircleCheck, Eye, TriangleAlert } from 'lucide-react'
import pkg from '../../../package.json'
import testSource from '@/lib/triage.test.ts?raw'
import { SCENARIOS } from '@/data/scenarios'
import { RULES, buildBriefing } from '@/lib/triage'
import { clock } from '@/lib/time'
import type { Navigate, ScenarioId } from '@/App'
import { Segmented } from '@/components/Segmented'
import { Pipeline } from './Pipeline'
import { JsonBlock } from './CodeView'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'overview', title: 'The short version' },
  { id: 'brief', title: 'What the brief asked for' },
  { id: 'fields', title: 'Every old field, and where it went' },
  { id: 'flow', title: 'How the data flows' },
  { id: 'rules', title: 'The rules in numbers' },
  { id: 'data', title: 'The sample data' },
  { id: 'stack', title: 'What I used, and why' },
  { id: 'design', title: 'Design system' },
  { id: 'tests', title: 'Tests and checks' },
  { id: 'files', title: 'Project structure' },
]

export function HowItsBuilt({ navigate, theme }: { navigate: Navigate; theme: 'light' | 'dark' }) {
  return (
    <div className="mx-auto grid max-w-[1120px] grid-cols-[minmax(0,1fr)] gap-10 px-5 py-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:py-12">
      <nav aria-label="On this page" className="hidden lg:block">
        <ol className="sticky top-10 space-y-0.5 text-[13.5px]">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <main className="min-w-0 max-w-[860px]">
        <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.025em] min-[500px]:text-[42px]">
          How it's built
        </h1>
        <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-muted-foreground">
          Everything behind the prototype: what the brief asked for and where each part lives, how raw sensor data turns
          into one sentence, the rules and their numbers, what I used and what I left out. The examples on this page are
          live, so they run the same code as the app.
        </p>

        <Overview />
        <Brief navigate={navigate} />
        <Fields />
        <Block
          id="flow"
          lead="Pick a scenario and a step. The output is computed in your browser right now, and the code is pulled from the source file itself."
        >
          <Pipeline />
        </Block>
        <Rules />
        <Data />
        <Stack />
        <Design theme={theme} />
        <Tests />
        <Files />
      </main>
    </div>
  )
}

/* Shared layout for each section */
function Block({ id, lead, children }: { id: string; lead?: string; children: ReactNode }) {
  const title = SECTIONS.find((s) => s.id === id)!.title
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-8 pt-14">
      <h2 id={`${id}-h`} className="text-[24px] font-semibold tracking-[-0.02em]">
        {title}
      </h2>
      {lead && <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Table({ head, rows, className }: { head: string[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border bg-card', className)}>
      <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b text-[12.5px] text-muted-foreground">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className={cn('px-4 py-3 leading-snug', j === 0 && 'font-semibold')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* 1. Overview */
function Overview() {
  return (
    <Block id="overview">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            h: 'The problem',
            p: "The old screen had every number on it, but each one had the same weight. Seeing 'Device disconnected' next to 'Movement detected' doesn't tell you whether to worry.",
          },
          {
            h: 'The idea',
            p: 'Lead with an answer. One sentence says how things are, at most three cards say what needs you, and everything else is one tap away.',
          },
          {
            h: 'How',
            p: 'A small rules engine reads the raw data and decides what matters. The screen only draws what it returns, so the logic can be tested and explained on its own.',
          },
        ].map((c) => (
          <div key={c.h} className="rounded-[20px] border bg-card p-4">
            <h3 className="text-[15px] font-semibold">{c.h}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{c.p}</p>
          </div>
        ))}
      </div>
    </Block>
  )
}

/* 2. Brief to feature map */
function Brief({ navigate }: { navigate: Navigate }) {
  const go = (label: string, to: Parameters<Navigate>[0]) => (
    <button
      onClick={() => navigate(to)}
      className="cursor-pointer whitespace-nowrap font-semibold text-primary underline-offset-4 hover:underline"
    >
      {label}
    </button>
  )
  return (
    <Block id="brief" lead="Each line of the assignment, what I built for it, and a link straight to it.">
      <Table
        head={['The brief says', 'What I built', '']}
        rows={[
          [
            'Quickly understand what happened while away',
            'A one-sentence verdict, plus a timeline strip of the time away with gaps the hub could not see shown hatched.',
            go('Show me', { page: 'prototype', scenario: 'A', view: 'after' }),
          ],
          [
            'Is there anything I should care about?',
            'At most three cards, sorted by score. Everything that checked out is collapsed into one reassuring row.',
            go('Show me', { page: 'prototype', scenario: 'C', view: 'after' }),
          ],
          [
            'Users don’t know what to do next',
            'One main action per card, and controls that say why they are or are not needed right now.',
            go('Show me', { page: 'prototype', scenario: 'A', view: 'after' }),
          ],
          [
            'Changes from normal behaviour',
            'Movement is compared with a normal day for this home, hour by hour. An unusual burst becomes its own card.',
            go('Show me', { page: 'prototype', scenario: 'C', view: 'after' }),
          ],
          [
            'Remove, add, reorganise or rethink',
            'Nothing was thrown away. Each old field was kept, reworded, demoted or merged (table below).',
            <a
              key="a"
              href="#fields"
              className="whitespace-nowrap font-semibold text-primary underline-offset-4 hover:underline"
            >
              See table
            </a>,
          ],
          [
            'Compare with what we have today',
            'A faithful copy of the current screen, driven by the same data, so you can flip between them.',
            go('Show me', { page: 'prototype', scenario: 'A', view: 'before' }),
          ],
          [
            'Assumptions, key decisions, what to improve',
            'Written up on its own page and in DEMO_GUIDE.md in the repository.',
            go('Read it', { page: 'writeup' }),
          ],
        ]}
      />
    </Block>
  )
}

/* 3. Old fields */
function Fields() {
  const b = buildBriefing(SCENARIOS[0])
  const days = b.health.find((h) => h.label === 'Battery')!.value
  return (
    <Block
      id="fields"
      lead="Using the data from the brief. The test I set myself: nothing the old screen showed should become impossible to find."
    >
      <Table
        head={['Old screen', 'Value', 'What happened to it', 'Where it is now']}
        rows={[
          ['Device', 'Connected', 'Reworded', '"Hub is back online", and Connection in Device health'],
          ['Battery', '64%', 'Reworded', `"${days}". The percentage is still shown next to it`],
          ['Last Sync', '10:42 AM', 'Kept', 'Under the verdict, and used as proof the hub recovered'],
          ['Activity Today', '17 events', 'Demoted', '"All 17 events" link; the 11 while away are grouped'],
          ['Important Events', '2', 'Merged', 'The disconnect is a card; the update is shown as its likely cause'],
          ['Network Strength', '-67 dBm', 'Reworded', '"Fair" in Device health, raw value beside it'],
          ['Software Version', '2.4.1', 'Demoted', 'Device health; the Update control says it is current'],
          ['Last Restart', 'Yesterday, 11:34 PM', 'Demoted', 'Device health, and "What changed since last night?"'],
          ['Recent Activity', '6 rows', 'Rethought', 'Away strip, grouped summary, and the full list in a sheet'],
          ['View All Events', 'Button', 'Kept', 'Header button and the "All 17 events" link'],
          ['Restart Device', 'Button', 'Explained', 'Controls, marked "Not needed" with the reason'],
          ['Device Settings', 'Button', 'Kept', 'Controls'],
          ['Update Software', 'Button', 'Explained', 'Controls, marked "Not needed": installed today at 9:35'],
        ]}
      />
    </Block>
  )
}

/* 5. Rules */
const RULE_TEXT: Record<keyof typeof RULES, string> = {
  URGENT_AT: 'Score needed for "Act now"',
  ATTENTION_AT: 'Score needed for "Worth a look". Below this, a finding is not shown as a card',
  OFFLINE_BASE: 'Points for a hub that is offline right now',
  OFFLINE_PER_10_MIN: 'Extra points for every 10 minutes it stays offline',
  OFFLINE_MAX_BONUS: 'Cap on those extra points',
  DISCONNECT_RESOLVED: 'Points for a drop that recovered on its own',
  BATTERY_CRITICAL_PCT: 'Battery % treated as critical',
  BATTERY_CRITICAL: 'Points for critical battery',
  BATTERY_LOW_PCT: 'Battery % treated as low',
  BATTERY_LOW: 'Points for low battery',
  MOVEMENT_BURST: 'Points for an unusually busy hour',
  BURST_RATIO: 'How many times busier than normal an hour must be to count as a burst',
  BURST_MIN_EXTRA: 'And at least this many extra movements, so 1 vs 0 is not a burst',
  TYPICAL_LOW: 'Below this share of normal, the window is "quieter than usual"',
  TYPICAL_HIGH: 'Above this share of normal, the window is "busier than usual"',
  UPDATE_CORRELATION_MIN: 'An update this many minutes before a drop counts as a likely cause',
}

function Rules() {
  return (
    <Block
      id="rules"
      lead="Every threshold sits in one object in triage.ts. This table reads that object directly, so it can't go out of date. Changing a number here changes the app."
    >
      <Table
        head={['Setting', 'Value', 'Meaning']}
        rows={(Object.keys(RULES) as (keyof typeof RULES)[]).map((k) => [
          <code key="k" className="font-mono text-[12.5px]">
            {k}
          </code>,
          String(RULES[k]),
          <span key="m" className="text-muted-foreground">
            {RULE_TEXT[k]}
          </span>,
        ])}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            Icon: CircleCheck,
            tone: 'text-calm bg-calm-soft',
            label: 'All clear',
            range: 'No finding scores 30 or more',
          },
          {
            Icon: Eye,
            tone: 'text-attention bg-attention-soft',
            label: 'Worth a look',
            range: 'Top finding scores 30 to 69',
          },
          {
            Icon: TriangleAlert,
            tone: 'text-urgent bg-urgent-soft',
            label: 'Act now',
            range: 'Top finding scores 70 or more',
          },
        ].map((x) => (
          <div key={x.label} className={cn('rounded-2xl px-4 py-3', x.tone)}>
            <p className="flex items-center gap-1.5 text-[14px] font-semibold">
              <x.Icon className="size-4" aria-hidden /> {x.label}
            </p>
            <p className="mt-0.5 text-[13px] text-foreground/75">{x.range}</p>
          </div>
        ))}
      </div>
    </Block>
  )
}

/* 6. Sample data */
function Data() {
  const [id, setId] = useState<ScenarioId>('A')
  const s = SCENARIOS.find((x) => x.id === id)!
  const max = Math.max(...s.baseline)
  return (
    <Block
      id="data"
      lead="There is no backend. Three scenarios share one typed schema in scenarios.ts. Times are stored as minutes after midnight (negative means yesterday), which keeps the rules and tests easy to read."
    >
      <Table
        head={['Scenario', 'Away', 'Events', 'Hub', 'Why it exists']}
        rows={SCENARIOS.map((x) => [
          x.label,
          `${clock(x.awayFrom)} to ${clock(x.now)}`,
          String(x.events.length),
          `${x.device.connected ? 'Online' : 'Offline'}, ${x.device.batteryPct}%, ${x.device.signalDbm} dBm, v${x.device.softwareVersion}`,
          x.id === 'A'
            ? 'The exact data from the brief, with the six recent events matching it line for line'
            : x.id === 'B'
              ? 'A normal day, to check the screen stays quiet when nothing is wrong'
              : 'A worst case, to check the rules handle an offline hub, low battery and odd movement together',
        ])}
      />

      <h3 className="mt-7 text-[16px] font-semibold">What "normal" means</h3>
      <p className="mt-1 max-w-[68ch] text-[14.5px] leading-relaxed text-muted-foreground">
        Typical movements per hour for this home. In a real product this would be learned from the last few weeks of the
        same weekday. Here it is a fixed sample.
      </p>
      <div
        className="mt-4 flex h-24 items-end gap-1 rounded-2xl border bg-card px-4 pb-3 pt-4"
        role="img"
        aria-label={`Typical movements per hour: ${s.baseline.join(', ')}`}
      >
        {s.baseline.map((v, h) => (
          <div key={h} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div
              className="w-full rounded-t-sm bg-primary/60"
              style={{ height: `${(v / max) * 100}%`, minHeight: 2 }}
            />
            <span className="text-[9.5px] text-muted-foreground">{h % 3 === 0 ? h : ''}</span>
          </div>
        ))}
      </div>

      <h3 className="mt-7 text-[16px] font-semibold">The raw data</h3>
      <div className="mt-3 max-w-[520px]">
        <Segmented<ScenarioId>
          label="Scenario data"
          value={id}
          onChange={setId}
          options={SCENARIOS.map((x) => ({ value: x.id, label: x.label }))}
        />
      </div>
      <div className="mt-3">
        <JsonBlock
          title={`src/data/scenarios.ts, scenario ${s.id}`}
          value={{ ...s, baseline: '[24 numbers, shown above]' }}
        />
      </div>
    </Block>
  )
}

/* 7. Stack */
const version = (name: string) => {
  const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>
  return all[name]?.replace(/^[\^~]/, '') ?? ''
}

function Stack() {
  const used: { name: string; pkg: string; why: string }[] = [
    {
      name: 'React',
      pkg: 'react',
      why: 'The screen is a stack of independent sections with their own small bits of state (open, dismissed, resolved). Components fit that well.',
    },
    {
      name: 'TypeScript',
      pkg: 'typescript',
      why: 'The rules engine and the screen share types, so adding a new kind of finding without an icon or label fails the build instead of failing in front of a user.',
    },
    {
      name: 'Vite',
      pkg: 'vite',
      why: 'Fast local development and a plain static build that any host can serve. Also lets this page import source files as text.',
    },
    {
      name: 'Tailwind CSS',
      pkg: 'tailwindcss',
      why: 'Colours are CSS variables, so dark mode is a second set of values rather than a second set of styles.',
    },
    {
      name: 'shadcn/ui on Radix',
      pkg: '@radix-ui/react-dialog',
      why: 'Accessible building blocks for the collapsible rows and the bottom sheet (focus handling, Escape to close, screen reader roles). The code sits in the repo, so I restyled it freely.',
    },
    {
      name: 'lucide-react',
      pkg: 'lucide-react',
      why: 'One consistent icon set. Every severity icon is paired with words, never used alone.',
    },
    { name: 'Sonner', pkg: 'sonner', why: 'Toasts for simulated actions, including Undo after "I’m aware".' },
    {
      name: 'Schibsted Grotesk',
      pkg: '@fontsource-variable/schibsted-grotesk',
      why: 'A sturdy, readable typeface. Bundled with the app, so there are no requests to a font service.',
    },
    { name: 'Vitest', pkg: 'vitest', why: 'Tests for the rules engine, which is where mistakes would actually hurt.' },
    { name: 'oxlint', pkg: 'oxlint', why: 'A fast linter that catches React mistakes such as missing keys.' },
    { name: 'Prettier', pkg: 'prettier', why: 'Consistent formatting, so diffs only show real changes.' },
  ]
  const skipped = [
    {
      name: 'A backend or database',
      why: 'The assignment is about the experience. A server would add cold starts and failure points to the demo without changing what the user sees. Because the rules are plain functions, they could move behind an events API unchanged.',
    },
    {
      name: 'An AI model for "Ask your home"',
      why: 'Answers about someone’s home have to be right. Keyword rules reading the same data cannot invent a fact, and they work offline.',
    },
    { name: 'A router', why: 'Three pages and some toggles. Component state is enough.' },
    {
      name: 'A chart library',
      why: 'The hourly bars and the away strip are a few dozen lines of plain markup, and they stay accessible.',
    },
    { name: 'A state management library', why: 'All state is small and local to one screen.' },
  ]
  return (
    <Block id="stack" lead="Versions are read from package.json.">
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {used.map((u) => (
          <li key={u.name} className="grid gap-1 px-4 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
            <p className="text-[14.5px] font-semibold">
              {u.name} <span className="font-normal text-muted-foreground">{version(u.pkg)}</span>
            </p>
            <p className="text-[14px] leading-relaxed text-muted-foreground">{u.why}</p>
          </li>
        ))}
      </ul>
      <h3 className="mt-7 text-[16px] font-semibold">What I left out on purpose</h3>
      <ul className="mt-3 divide-y overflow-hidden rounded-2xl border bg-card">
        {skipped.map((u) => (
          <li key={u.name} className="grid gap-1 px-4 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
            <p className="text-[14.5px] font-semibold">{u.name}</p>
            <p className="text-[14px] leading-relaxed text-muted-foreground">{u.why}</p>
          </li>
        ))}
      </ul>
    </Block>
  )
}

/* 8. Design system */
const SWATCHES = [
  { v: '--background', label: 'Background' },
  { v: '--card', label: 'Surface' },
  { v: '--foreground', label: 'Text' },
  { v: '--muted-foreground', label: 'Secondary text' },
  { v: '--primary', label: 'Accent' },
  { v: '--calm', label: 'All clear' },
  { v: '--attention', label: 'Worth a look' },
  { v: '--urgent', label: 'Act now' },
]

function Design({ theme }: { theme: 'light' | 'dark' }) {
  // The theme hook updates the <html> class before re-rendering, so this
  // reads the colours for the theme that is about to be shown.
  const cs = getComputedStyle(document.documentElement)
  const values = Object.fromEntries(SWATCHES.map((s) => [s.v, cs.getPropertyValue(s.v).trim()]))

  return (
    <Block
      id="design"
      lead={`The colours below are read from the live stylesheet, so they switch when you change to ${theme === 'dark' ? 'light' : 'dark'} mode.`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SWATCHES.map((s) => (
          <div key={s.v} className="overflow-hidden rounded-2xl border bg-card">
            <div className="h-14 border-b" style={{ background: `var(${s.v})` }} />
            <div className="px-3 py-2">
              <p className="text-[13px] font-semibold">{s.label}</p>
              <p className="font-mono text-[11.5px] text-muted-foreground">{values[s.v]}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt-7 text-[16px] font-semibold">Type</h3>
      <div className="mt-3 space-y-3 rounded-2xl border bg-card px-5 py-4">
        {[
          { size: 28, weight: 600, use: 'Verdict', text: 'Mostly quiet. One thing is worth a look.' },
          { size: 17, weight: 600, use: 'Section title', text: 'Needs your attention' },
          { size: 16.5, weight: 600, use: 'Card title', text: 'Your hub went offline at 10:18 AM' },
          {
            size: 14.5,
            weight: 400,
            use: 'Body',
            text: 'Anything between 10:18 and 10:42 may not have been recorded.',
          },
          { size: 12.5, weight: 400, use: 'Small print', text: 'Last synced at 10:42 AM' },
        ].map((t) => (
          <div key={t.use} className="grid items-baseline gap-1 sm:grid-cols-[150px_1fr] sm:gap-4">
            <p className="text-[12.5px] text-muted-foreground">
              {t.use}, {t.size}px
            </p>
            <p style={{ fontSize: t.size, fontWeight: t.weight }} className="leading-tight tracking-[-0.01em]">
              {t.text}
            </p>
          </div>
        ))}
      </div>

      <h3 className="mt-7 text-[16px] font-semibold">Principles I held to</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {[
          'Severity is always colour, icon and words together, so it works for colour-blind users and screen readers.',
          'Every tap target on the phone screen is at least 44px tall, the minimum comfortable touch size.',
          'Text meets WCAG AA contrast in both light and dark mode.',
          'Animation is limited to the opening sync and responses to taps, and switches off with reduced motion.',
          'One accent colour. Colour is reserved for meaning, not decoration.',
          'Plain words over raw values, with the raw value always available next to them.',
        ].map((p) => (
          <li key={p} className="rounded-2xl border bg-card px-4 py-3 text-[14px] leading-relaxed">
            {p}
          </li>
        ))}
      </ul>
    </Block>
  )
}

/* 9. Tests */
function parseTests(src: string) {
  const groups: { name: string; tests: string[] }[] = []
  for (const line of src.split('\n')) {
    const d = line.match(/^describe\('([^']+)'/)
    const t = line.match(/^\s+it\('([^']+)'/)
    if (d) groups.push({ name: d[1], tests: [] })
    else if (t && groups.length) groups[groups.length - 1].tests.push(t[1])
  }
  return groups
}

function Tests() {
  const groups = parseTests(testSource)
  const total = groups.reduce((n, g) => n + g.tests.length, 0)
  return (
    <Block
      id="tests"
      lead={`${total} tests cover the rules engine. The list is read from triage.test.ts, so it always matches the file. Run them with npm test.`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.name} className="rounded-2xl border bg-card px-4 py-3">
            <h3 className="text-[14.5px] font-semibold">{g.name}</h3>
            <ul className="mt-2 space-y-1.5">
              {g.tests.map((t) => (
                <li key={t} className="flex gap-2 text-[13.5px] leading-snug text-muted-foreground">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-calm" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h3 className="mt-7 text-[16px] font-semibold">Other checks before shipping</h3>
      <Table
        className="mt-3"
        head={['Check', 'How']}
        rows={[
          [
            'Types',
            <code key="c" className="font-mono text-[12.5px]">
              npm run build
            </code>,
          ],
          [
            'Lint',
            <code key="c" className="font-mono text-[12.5px]">
              npm run lint
            </code>,
          ],
          [
            'Formatting',
            <code key="c" className="font-mono text-[12.5px]">
              npm run format
            </code>,
          ],
          [
            'In the browser',
            'All three scenarios, before and after, light and dark, at phone width (375px) and desktop, watching for console errors',
          ],
          ['Keyboard', 'Every control reachable with Tab, visible focus ring, Escape closes the events sheet'],
        ]}
      />
    </Block>
  )
}

/* 10. Files */
function Files() {
  const files: [string, string][] = [
    ['src/data/scenarios.ts', 'The three sample scenarios and their shared schema'],
    ['src/lib/triage.ts', 'The rules engine: grouping, causes, scores, actions, verdict, Ask your home'],
    ['src/lib/triage.test.ts', 'Tests for the rules engine'],
    ['src/lib/time.ts', 'Formatting for times and durations'],
    ['src/components/BeforeScreen.tsx', 'The current screen, recreated for comparison'],
    [
      'src/components/briefing/',
      'The redesigned screen: verdict, cards, activity, Ask, health, controls, events sheet',
    ],
    ['src/components/build/', 'This page'],
    ['src/components/ui/', 'Restyled shadcn/ui components'],
    ['src/content/writeup.ts', 'Assumptions, decisions and next steps'],
    ['src/index.css', 'Colours, font and motion'],
    ['DEMO_GUIDE.md', 'One-page walkthrough for the demo'],
  ]
  return (
    <Block id="files">
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {files.map(([f, d]) => (
          <li key={f} className="grid gap-0.5 px-4 py-2.5 sm:grid-cols-[280px_1fr] sm:gap-4">
            <code className="font-mono text-[12.5px]">{f}</code>
            <span className="text-[13.5px] text-muted-foreground">{d}</span>
          </li>
        ))}
      </ul>
      <h3 className="mt-7 text-[16px] font-semibold">Run it yourself</h3>
      <pre className="mt-3 overflow-x-auto rounded-2xl border bg-card px-4 py-3 font-mono text-[13px] leading-relaxed">
        {`npm install
npm run dev      # local preview
npm test         # rules engine tests
npm run build    # type check and production build`}
      </pre>
    </Block>
  )
}
