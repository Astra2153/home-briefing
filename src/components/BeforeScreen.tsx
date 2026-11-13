import { toast } from 'sonner'
import type { Scenario } from '@/data/scenarios'
import { clock, when } from '@/lib/time'

const LABEL: Record<string, string> = {
  movement: 'Movement detected',
  disconnected: 'Device disconnected',
  software_updated: 'Software updated',
}

/**
 * Faithful recreation of the CURRENT product, driven by the same dataset,
 * so reviewers can flip Before/After on any scenario and feel the difference.
 */
export function BeforeScreen({ scenario: s }: { scenario: Scenario }) {
  const d = s.device
  const recent = [...s.events].reverse().slice(0, 6)
  const important = s.events.filter((e) => e.type !== 'movement').length

  const rows: [string, string][] = [
    ['Device', d.connected ? 'Connected' : 'Disconnected'],
    ['Battery', `${d.batteryPct}%`],
    ['Last Sync', clock(d.lastSync)],
    ['Activity Today', `${s.events.length} events`],
    ['Important Events', String(important)],
    ['Network Strength', `${d.signalDbm} dBm`],
    ['Software Version', d.softwareVersion],
    ['Last Restart', when(d.lastRestart)],
  ]

  const nothing = (name: string) => toast(name, { description: 'This is the original screen, shown for comparison.' })

  return (
    <div className="flex-1 overflow-y-auto bg-[#f2f2f2] px-4 pb-8 pt-3 font-[system-ui] text-[15px] text-[#222] dark:bg-[#1c1c1c] dark:text-[#ddd]">
      <h1 className="mb-3 text-[22px] font-bold">Home</h1>
      <dl className="divide-y divide-[#ddd] rounded-md bg-white dark:divide-[#333] dark:bg-[#2a2a2a]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-3 py-2.5">
            <dt>{k}</dt>
            <dd className="text-[#555] dark:text-[#aaa]">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-2 mt-6 text-[17px] font-bold">Recent Activity</h2>
      <ul className="divide-y divide-[#ddd] rounded-md bg-white dark:divide-[#333] dark:bg-[#2a2a2a]">
        {recent.map((e) => (
          <li key={e.id} className="px-3 py-2.5">
            {clock(e.t)} — {LABEL[e.type]}
          </li>
        ))}
      </ul>

      <h2 className="mb-2 mt-6 text-[17px] font-bold">Actions</h2>
      <div className="grid gap-2">
        {['View All Events', 'Restart Device', 'Device Settings', 'Update Software'].map((a) => (
          <button
            key={a}
            onClick={() => nothing(a)}
            className="h-11 cursor-pointer rounded-md border border-[#ccc] bg-white text-left px-3 dark:border-[#444] dark:bg-[#2a2a2a]"
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  )
}
