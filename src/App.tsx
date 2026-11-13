import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { SCENARIOS, type Scenario } from '@/data/scenarios'
import { buildBriefing } from '@/lib/triage'
import { useTheme } from '@/hooks/use-theme'
import { PhoneFrame } from '@/components/PhoneFrame'
import { BeforeScreen } from '@/components/BeforeScreen'
import { BriefingScreen } from '@/components/briefing/BriefingScreen'
import { WriteUp } from '@/components/WriteUp'
import { HowItsBuilt } from '@/components/build/HowItsBuilt'
import { Segmented } from '@/components/Segmented'
import { SEVERITY } from '@/components/severity'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

export type View = 'after' | 'before'
export type Page = 'prototype' | 'build' | 'writeup'
export type ScenarioId = Scenario['id']
export type Navigate = (to: { page: Page; scenario?: ScenarioId; view?: View }) => void

const PAGES: { value: Page; label: string }[] = [
  { value: 'prototype', label: 'Prototype' },
  { value: 'build', label: "How it's built" },
  { value: 'writeup', label: 'Write-up' },
]

const NOTICE: Record<ScenarioId, string> = {
  A: 'The 10:18 drop is linked to the 9:35 update, with medium confidence and an alternative shown. Restart and Update are not suggested, and each says why.',
  B: 'Nothing needs you, so the screen stays quiet and the reassurance is collapsed.',
  C: 'Low battery is the likely cause, so it is folded into the offline card instead of being shown twice. Activity is only judged up to the moment the hub went silent.',
}

export default function App() {
  const { theme, toggle } = useTheme()
  const [page, setPage] = useState<Page>('prototype')
  const [scenarioId, setScenarioId] = useState<ScenarioId>('A')
  const [view, setView] = useState<View>('after')
  const [screenEl, setScreenEl] = useState<HTMLDivElement | null>(null)

  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!

  const navigate: Navigate = (to) => {
    setPage(to.page)
    if (to.scenario) setScenarioId(to.scenario)
    if (to.view) setView(to.view)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-3 px-5 pt-5 min-[500px]:pt-7">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <img src="/favicon.svg" alt="" className="size-7" />
          Home Briefing
        </p>
        <nav aria-label="Pages" className="order-3 w-full sm:order-none sm:ml-auto sm:w-[420px]">
          <Segmented label="Pages" value={page} onChange={(p) => navigate({ page: p })} options={PAGES} />
        </nav>
        <button
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="ml-auto grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border bg-card shadow-sm sm:ml-0"
        >
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </header>

      {page === 'prototype' && (
        <div className="mx-auto grid max-w-[1120px] grid-cols-[minmax(0,1fr)] gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16 lg:py-12">
          {/* Intro and demo controls */}
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.025em] min-[500px]:text-[40px]">
              What happened at home while you were away?
            </h1>
            <p className="mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-muted-foreground">
              A redesign of the home screen that answers that question in one sentence, then shows the evidence and the
              next step. Built for the Ogmen Robotics software intern assignment.
            </p>

            <div className="mt-7 max-w-[440px] space-y-3">
              <Segmented<View>
                label="Version"
                value={view}
                onChange={setView}
                options={[
                  { value: 'before', label: 'Before (current)' },
                  { value: 'after', label: 'After (redesign)' },
                ]}
              />
              <Segmented<ScenarioId>
                label="Scenario"
                value={scenarioId}
                onChange={setScenarioId}
                options={SCENARIOS.map((s) => ({ value: s.id, label: s.label, hint: s.short }))}
              />
              <ScenarioNote id={scenarioId} />
              <p className="px-1 text-[13.5px] text-muted-foreground">
                Curious how it works?{' '}
                <button
                  onClick={() => navigate({ page: 'build' })}
                  className="-my-3 inline-block cursor-pointer py-3 font-semibold text-primary underline-offset-4 hover:underline"
                >
                  See how it's built
                </button>
              </p>
            </div>
          </aside>

          {/* The phone */}
          <main className="-mx-5 min-[500px]:mx-0">
            <PhoneFrame now={scenario.now} ref={setScreenEl}>
              {view === 'after' ? (
                <BriefingScreen key={scenarioId} scenario={scenario} container={screenEl} />
              ) : (
                <BeforeScreen key={scenarioId} scenario={scenario} />
              )}
              <Toaster theme={theme} position="bottom-center" offset={20} />
            </PhoneFrame>
          </main>
        </div>
      )}

      {page === 'build' && <HowItsBuilt navigate={navigate} theme={theme} />}
      {page === 'writeup' && (
        <main className="mx-auto max-w-[760px] px-5 py-8 lg:py-12">
          <WriteUp />
        </main>
      )}

      <footer className="mx-auto max-w-[1120px] px-5 pb-10 pt-4 text-[13px] text-muted-foreground">
        Ashmit Sanjay Katale, 2026. Prototype with sample data; actions are simulated.
      </footer>
    </div>
  )
}

function ScenarioNote({ id }: { id: ScenarioId }) {
  const b = buildBriefing(SCENARIOS.find((s) => s.id === id)!)
  const meta = SEVERITY[b.verdict.state]
  return (
    <div className="rounded-2xl border bg-card px-4 py-3.5">
      <p className={cn('flex items-center gap-1.5 text-[12.5px] font-semibold', meta.text)}>
        <meta.Icon className="size-4" aria-hidden />
        Verdict: {meta.label.toLowerCase()}
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{NOTICE[id]}</p>
    </div>
  )
}
