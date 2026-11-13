import { useEffect, useMemo, useState } from 'react'
import { List } from 'lucide-react'
import { toast } from 'sonner'
import type { Scenario } from '@/data/scenarios'
import { buildBriefing, signalLabel, type ActionId, type Finding, type VerdictState } from '@/lib/triage'
import { clock } from '@/lib/time'
import { VerdictHero } from './VerdictHero'
import { FindingCard } from './FindingCard'
import { ActivitySection, AllClearRow, AskHome, Controls, DeviceHealth, Section } from './Sections'
import { EventsSheet } from './EventsSheet'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * The redesigned screen. Everything rendered here comes from buildBriefing();
 * this component only holds session state (what the user dismissed / did).
 * It is keyed by scenario in the parent, so switching scenario resets it.
 */
export function BriefingScreen({ scenario: s, container }: { scenario: Scenario; container: HTMLElement | null }) {
  const b = useMemo(() => buildBriefing(s), [s])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [resolved, setResolved] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ open: boolean; highlight?: string[] }>({ open: false })

  // Simulated "syncing your home" moment on open
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650)
    return () => clearTimeout(t)
  }, [])

  const visible = b.findings.filter((f) => !dismissed.includes(f.id))
  const open = visible.filter((f) => !resolved[f.id])

  // Once everything is handled, the verdict should say so.
  let override: { state: VerdictState; headline: string; summary: string } | undefined
  if (b.findings.length > 0 && open.length === 0) {
    override = {
      state: 'calm',
      headline: "You're all caught up.",
      summary: "You've handled everything from while you were away. We'll let you know if anything changes.",
    }
  }

  const dismiss = (f: Finding) => {
    setDismissed((d) => [...d, f.id])
    toast('Marked as seen', {
      description: "We won't show this again for this event.",
      action: { label: 'Undo', onClick: () => setDismissed((d) => d.filter((x) => x !== f.id)) },
    })
  }

  /** Simulated actions: the outcome follows the device state, not a script. */
  const runFindingAction = async (f: Finding) => {
    if (f.action.id === 'review_movement') {
      setSheet({ open: true, highlight: b.activity.burst?.ids })
      return
    }
    setBusy(f.id)
    if (f.action.id === 'check_connection') {
      const id = toast.loading('Checking connection…')
      await wait(1300)
      const sig = signalLabel(s.device.signalDbm)
      toast.success('Connection check passed', {
        id,
        description: `Hub is responding. Signal is ${sig.toLowerCase()} (${s.device.signalDbm} dBm).`,
      })
      setResolved((r) => ({ ...r, [f.id]: `Connection check passed at ${clock(s.now)}. Hub is responding normally.` }))
    } else if (f.action.id === 'reconnect') {
      const id = toast.loading('Trying to reach your hub…')
      await wait(1600)
      if (s.device.connected) {
        toast.success('Hub reconnected', { id })
        setResolved((r) => ({ ...r, [f.id]: 'Hub reconnected.' }))
      } else {
        toast.error('No response from the hub', {
          id,
          description:
            s.device.batteryPct < 10
              ? 'It most likely needs charging. Plug it in when you or someone is home.'
              : 'Check that it is plugged in and Wi-Fi is on.',
        })
        setNotes((n) => ({ ...n, [f.id]: `Tried to reconnect at ${clock(s.now)}. No response.` }))
      }
    } else {
      toast(f.action.label, { description: 'This would open in the full app.' })
    }
    setBusy(null)
  }

  const runControl = async (id: ActionId) => {
    const c = b.controls.find((x) => x.id === id)!
    if (id === 'view_all') return setSheet({ open: true })
    if (id === 'settings') return toast('Device settings', { description: 'Settings are outside this prototype.' })
    if (id === 'restart') {
      const t = toast.loading(c.status === 'not_needed' ? 'Restarting anyway…' : 'Restarting…')
      await wait(1500)
      return toast.success('Hub restarted', { id: t, description: 'Back online. Restart requested (simulated).' })
    }
    if (id === 'update') {
      if (c.status === 'not_needed') return toast('Already up to date', { description: c.reason })
      const t = toast.loading('Installing update…')
      await wait(1500)
      return toast.success('Update installed', { id: t })
    }
  }

  if (loading) return <Skeleton />

  return (
    <div className="flex-1 overflow-y-auto pb-10 no-scrollbar" aria-busy={false}>
      <header className="flex items-center justify-between px-5 pb-3 pt-2">
        <div>
          <p className="text-[13px] text-muted-foreground">Welcome back</p>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Home</h1>
        </div>
        <button
          onClick={() => setSheet({ open: true })}
          className="grid size-11 cursor-pointer place-items-center rounded-full bg-card shadow-sm border"
          aria-label="View all events"
        >
          <List className="size-5" />
        </button>
      </header>

      <VerdictHero scenario={s} briefing={b} override={override} />

      {visible.length > 0 && (
        <Section
          title="Needs your attention"
          aside={<span className="text-[13px] text-muted-foreground">{open.length} open</span>}
        >
          <ul className="space-y-3">
            {visible.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                busy={busy === f.id}
                note={notes[f.id]}
                resolved={resolved[f.id]}
                onAction={() => runFindingAction(f)}
                onDismiss={() => dismiss(f)}
              />
            ))}
          </ul>
        </Section>
      )}

      <AllClearRow items={b.allClear} offline={!s.device.connected} />
      <ActivitySection briefing={b} onViewAll={() => setSheet({ open: true })} />
      <AskHome scenario={s} briefing={b} />
      <DeviceHealth briefing={b} />
      <Controls controls={b.controls} onRun={runControl} />

      <EventsSheet
        scenario={s}
        open={sheet.open}
        highlight={sheet.highlight}
        onOpenChange={(o) => setSheet((x) => ({ ...x, open: o }))}
        container={container}
      />
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex-1 px-4 pt-2" aria-busy="true" aria-label="Syncing your home">
      <div className="px-1 pb-3">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton mt-2 h-5 w-16 rounded" />
      </div>
      <div className="skeleton h-[230px] rounded-[28px]" />
      <div className="skeleton mt-7 h-4 w-40 rounded" />
      <div className="skeleton mt-3 h-[150px] rounded-[22px]" />
      <p className="mt-6 text-center text-[13px] text-muted-foreground">Syncing your home…</p>
    </div>
  )
}
