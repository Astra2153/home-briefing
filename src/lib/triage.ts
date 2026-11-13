/**
 * Turns raw home data into the briefing the app shows.
 *
 * The steps run in this order: group the movement and compare it with what's
 * normal, explain any disconnect, score each finding, pick the actions that
 * make sense, then write the one-line verdict.
 *
 * Nothing in this file touches React or the network, so it's easy to test and
 * could run on a server unchanged. The screen only renders what
 * buildBriefing() returns.
 */
import type { HomeEvent, Scenario } from '@/data/scenarios'
import { clock, duration, roughHours, when } from '@/lib/time'

// Types

export type Level = 'info' | 'attention' | 'urgent'
export type VerdictState = 'calm' | 'attention' | 'urgent'
export type Confidence = 'High' | 'Medium' | 'Low'

export type ActionId =
  'check_connection' | 'reconnect' | 'review_movement' | 'restart' | 'update' | 'settings' | 'view_all'

export interface Inference {
  cause: string
  confidence: Confidence
  score: number
  /** Other plausible explanations we could not rule out */
  alternatives: string[]
}

export interface Evidence {
  t?: number
  text: string
}

export interface Finding {
  id: string
  kind: 'offline' | 'disconnect_resolved' | 'battery_low' | 'movement_unusual'
  score: number
  level: Level
  title: string
  why: string
  inference?: Inference
  evidence: Evidence[]
  /** Human-readable rule that produced this card ("Why am I seeing this?") */
  rule: string
  action: { id: ActionId; label: string }
}

export interface HourBucket {
  hour: number
  actual: number
  typical: number
  observed: boolean
}

export interface ActivitySummary {
  totalToday: number
  movementsInWindow: number
  expected: number
  ratio: number
  verdict: 'typical' | 'busier' | 'quieter'
  /** End of the period we can actually see (earlier than now if offline) */
  observedUntil: number
  rooms: { room: string; count: number }[]
  first?: number
  last?: number
  hours: HourBucket[]
  burst?: { hour: number; actual: number; typical: number; from: number; to: number; ids: string[] }
  headline: string
  detail: string
}

export interface HealthItem {
  label: string
  value: string
  raw: string
  ok: boolean
}

export interface ControlOption {
  id: ActionId
  label: string
  status: 'recommended' | 'available' | 'not_needed' | 'unavailable'
  reason: string
}

export interface Briefing {
  scenarioId: Scenario['id']
  verdict: { state: VerdictState; headline: string; summary: string; freshness: string }
  awayWindow: { from: number; to: number; label: string }
  /** Attention/urgent cards, highest score first, max 3 */
  findings: Finding[]
  /** Things we checked that are fine ("Everything else is fine") */
  allClear: string[]
  activity: ActivitySummary
  health: HealthItem[]
  controls: ControlOption[]
  importantCount: number
}

// Every threshold lives here, so tuning the behaviour means editing one object

export const RULES = {
  /** Score needed for each level */
  URGENT_AT: 70,
  ATTENTION_AT: 30,

  /** Points per finding (used in buildFindings) */
  OFFLINE_BASE: 70, // device is offline right now
  OFFLINE_PER_10_MIN: 1, // +1 per 10 minutes offline...
  OFFLINE_MAX_BONUS: 30, // ...capped
  DISCONNECT_RESOLVED: 35, // dropped but came back on its own
  BATTERY_CRITICAL_PCT: 10,
  BATTERY_CRITICAL: 75,
  BATTERY_LOW_PCT: 20,
  BATTERY_LOW: 45,
  MOVEMENT_BURST: 45,

  /** An hour counts as unusually busy at 2.5x its normal AND at least 4 extra events */
  BURST_RATIO: 2.5,
  BURST_MIN_EXTRA: 4,
  /** Across the whole away window, anything between 0.6x and 1.6x normal is "typical" */
  TYPICAL_LOW: 0.6,
  TYPICAL_HIGH: 1.6,

  /** An update this many minutes before a drop is a likely cause */
  UPDATE_CORRELATION_MIN: 60,
} as const

export function levelFor(score: number): Level {
  if (score >= RULES.URGENT_AT) return 'urgent'
  if (score >= RULES.ATTENTION_AT) return 'attention'
  return 'info'
}

export function confidenceFor(score: number): Confidence {
  if (score >= 0.75) return 'High'
  if (score >= 0.5) return 'Medium'
  return 'Low'
}

// Health in plain words

/** Wi-Fi strength in words people use. -67 dBm reads as "Fair". */
export function signalLabel(dbm: number): 'Excellent' | 'Good' | 'Fair' | 'Weak' {
  if (dbm >= -55) return 'Excellent'
  if (dbm >= -65) return 'Good'
  if (dbm >= -75) return 'Fair'
  return 'Weak'
}

/** Simple linear forecast from the learned daily drain. */
export function batteryDaysLeft(pct: number, drainPerDay: number): number {
  if (drainPerDay <= 0) return Infinity
  return Math.floor((pct / drainPerDay) * 2) / 2 // rounded down to the nearest half day
}

function daysText(days: number): string {
  if (days < 1) return 'less than a day'
  if (days < 2) return 'about a day'
  return `about ${Math.floor(days)} days`
}

/** Is version `a` older than version `b`? */
export function isOlder(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d < 0
  }
  return false
}

// Grouping movement and comparing it with a normal day

/** Expected movements between two times, prorating partial hours. */
export function expectedBetween(baseline: number[], from: number, to: number): number {
  let total = 0
  for (let t = from; t < to; t++) total += baseline[Math.floor(t / 60) % 24] / 60
  return total
}

export function groupActivity(s: Scenario): ActivitySummary {
  const lastDisconnect = [...s.events].reverse().find((e) => e.type === 'disconnected')
  // If the hub is offline we can only judge the period we actually observed.
  const observedUntil = s.device.connected ? s.now : Math.max(s.awayFrom, s.device.lastSync)

  const moves = s.events.filter((e) => e.type === 'movement' && e.t >= s.awayFrom && e.t <= s.now)
  const expected = expectedBetween(s.baseline, s.awayFrom, observedUntil)
  const ratio = expected > 0 ? moves.length / expected : moves.length > 0 ? Infinity : 1

  // One bucket per hour of the away window, for the bar chart
  const hours: HourBucket[] = []
  for (let h = Math.floor(s.awayFrom / 60); h <= Math.floor((s.now - 1) / 60); h++) {
    const start = Math.max(h * 60, s.awayFrom)
    const end = Math.min((h + 1) * 60, s.now)
    hours.push({
      hour: h,
      actual: moves.filter((e) => e.t >= start && e.t < end).length,
      typical: Math.round(expectedBetween(s.baseline, start, end) * 10) / 10,
      observed: start < observedUntil,
    })
  }

  // Look for an hour that was far busier than normal
  let burst: ActivitySummary['burst']
  for (const b of hours) {
    if (b.actual >= b.typical * RULES.BURST_RATIO && b.actual - b.typical >= RULES.BURST_MIN_EXTRA) {
      const inHour = moves.filter((e) => Math.floor(e.t / 60) === b.hour)
      if (!burst || b.actual > burst.actual) {
        burst = {
          hour: b.hour,
          actual: b.actual,
          typical: b.typical,
          from: inHour[0].t,
          to: inHour[inHour.length - 1].t,
          ids: inHour.map((e) => e.id),
        }
      }
    }
  }

  const verdict: ActivitySummary['verdict'] = burst
    ? 'busier'
    : ratio > RULES.TYPICAL_HIGH
      ? 'busier'
      : ratio < RULES.TYPICAL_LOW
        ? 'quieter'
        : 'typical'

  const roomCounts = new Map<string, number>()
  for (const e of moves) roomCounts.set(e.room ?? 'Home', (roomCounts.get(e.room ?? 'Home') ?? 0) + 1)
  const rooms = [...roomCounts.entries()].map(([room, count]) => ({ room, count })).sort((a, b) => b.count - a.count)

  const first = moves[0]?.t
  const last = moves[moves.length - 1]?.t
  const n = moves.length
  const plural = n === 1 ? 'movement' : 'movements'

  let headline: string
  let detail: string
  if (n === 0) {
    headline = 'No movement while you were away'
    detail = 'The house was still the whole time.'
  } else if (burst) {
    headline = `${n} ${plural}, busier than usual`
    detail = `${burst.actual} between ${clock(burst.from)} and ${clock(burst.to)}. That hour usually has about ${Math.round(burst.typical)}.`
  } else {
    headline = `${n} ${plural}, ${verdict === 'typical' ? 'typical for this time of day' : verdict === 'quieter' ? 'quieter than usual' : 'busier than usual'}`
    detail = `Between ${clock(first!)} and ${clock(last!)}, mostly ${rooms
      .slice(0, 2)
      .map((r) => r.room.toLowerCase())
      .join(' and ')}. You'd normally see about ${Math.round(expected)}.`
  }
  if (!s.device.connected && lastDisconnect) {
    detail += ` We can't see anything after ${clock(observedUntil)}.`
  }

  return {
    totalToday: s.events.length,
    movementsInWindow: n,
    expected,
    ratio,
    verdict,
    observedUntil,
    rooms,
    first,
    last,
    hours,
    burst,
    headline,
    detail,
  }
}

// Why did the hub disconnect?

/**
 * Gives each possible cause a score between 0 and 1 and picks the highest.
 * The others are kept so the card can say what else it might be.
 *
 *   Software update in the hour before the drop: 0.70
 *   Battery under 10% at last report, still offline: 0.80
 *   Wi-Fi signal fair: 0.35, weak: 0.55
 */
export function explainDisconnect(s: Scenario, drop: HomeEvent): Inference | undefined {
  const candidates: { cause: string; score: number }[] = []

  const update = s.events.find(
    (e) => e.type === 'software_updated' && e.t <= drop.t && drop.t - e.t <= RULES.UPDATE_CORRELATION_MIN,
  )
  if (update) {
    candidates.push({
      cause: `Likely related to the software update at ${clock(update.t)}, ${drop.t - update.t} min earlier.`,
      score: 0.7,
    })
  }

  if (!s.device.connected && s.device.batteryPct < RULES.BATTERY_CRITICAL_PCT) {
    candidates.push({
      cause: `Battery was at ${s.device.batteryPct}% when we last heard from it. It has most likely run out.`,
      score: 0.8,
    })
  }

  const sig = signalLabel(s.device.signalDbm)
  if (sig === 'Fair' || sig === 'Weak') {
    candidates.push({
      cause: `Wi-Fi signal is ${sig.toLowerCase()} (${s.device.signalDbm} dBm).`,
      score: sig === 'Weak' ? 0.55 : 0.35,
    })
  }

  if (candidates.length === 0) return undefined
  candidates.sort((a, b) => b.score - a.score)
  const [top, ...rest] = candidates
  return {
    cause: top.cause,
    score: top.score,
    confidence: confidenceFor(top.score),
    alternatives: rest.map((c) => c.cause),
  }
}

/**
 * Did the hub come back after the drop? If we received a sync or any event
 * afterwards, it must have been back by then. Returns the earliest such time.
 */
export function recoveredAt(s: Scenario, drop: HomeEvent): number | undefined {
  if (!s.device.connected) return undefined
  const later = s.events.filter((e) => e.t > drop.t).map((e) => e.t)
  const candidates = [...later, s.device.lastSync].filter((t) => t > drop.t)
  return candidates.length ? Math.min(...candidates) : undefined
}

// Findings and how serious they are

export function buildFindings(s: Scenario, activity: ActivitySummary): Finding[] {
  const out: Finding[] = []
  const d = s.device
  const drops = s.events.filter((e) => e.type === 'disconnected' && e.t >= s.awayFrom)
  const lastDrop = drops[drops.length - 1]
  let batteryExplainsOffline = false

  // Connection
  if (!d.connected) {
    const since = lastDrop?.t ?? d.lastSync
    const offlineFor = s.now - since
    const score =
      RULES.OFFLINE_BASE + Math.min(RULES.OFFLINE_MAX_BONUS, Math.floor(offlineFor / 10) * RULES.OFFLINE_PER_10_MIN)
    const inference = lastDrop ? explainDisconnect(s, lastDrop) : undefined
    batteryExplainsOffline = !!inference?.cause.startsWith('Battery')
    out.push({
      id: 'offline',
      kind: 'offline',
      score,
      level: levelFor(score),
      title: `Your hub has been offline for ${duration(offlineFor)}`,
      why: `Nothing at home has been recorded since ${clock(since)}, so we can't tell you what's happening now.`,
      inference,
      evidence: [
        ...(lastDrop ? [{ t: lastDrop.t, text: 'Device disconnected' }] : []),
        { t: d.lastSync, text: 'Last successful sync' },
        { text: `Last reported battery: ${d.batteryPct}%` },
        { text: `Signal before it dropped: ${signalLabel(d.signalDbm)} (${d.signalDbm} dBm)` },
      ],
      rule: `The hub is offline right now. That starts at ${RULES.OFFLINE_BASE} points, plus ${RULES.OFFLINE_PER_10_MIN} for every 10 minutes offline (up to ${RULES.OFFLINE_MAX_BONUS} more), which comes to ${score}. Anything at ${RULES.URGENT_AT} or above is urgent.`,
      action: { id: 'reconnect', label: 'Try to reconnect' },
    })
  } else if (lastDrop) {
    const back = recoveredAt(s, lastDrop)
    const inference = explainDisconnect(s, lastDrop)
    const score = RULES.DISCONNECT_RESOLVED
    out.push({
      id: 'disconnect',
      kind: 'disconnect_resolved',
      score,
      level: levelFor(score),
      title: `Your hub went offline at ${clock(lastDrop.t)} and came back on its own`,
      why: back
        ? `Anything between ${clock(lastDrop.t)} and ${clock(back)} (up to ${duration(back - lastDrop.t)}) may not have been recorded.`
        : 'Some events may not have been recorded while it was offline.',
      inference,
      evidence: [
        ...s.events
          .filter(
            (e) =>
              e.type === 'software_updated' && e.t <= lastDrop.t && lastDrop.t - e.t <= RULES.UPDATE_CORRELATION_MIN,
          )
          .map((e) => ({ t: e.t, text: `Software updated to ${e.detail ?? d.softwareVersion}` })),
        { t: lastDrop.t, text: 'Device disconnected' },
        ...(back ? [{ t: back, text: 'Hub reporting again' }] : []),
        ...(d.lastSync !== back ? [{ t: d.lastSync, text: 'Last successful sync' }] : []),
      ],
      rule: `It dropped and then came back, because we received a sync or an event after the drop. That scores ${score}: enough to show you (${RULES.ATTENTION_AT} or more), not enough to be urgent (${RULES.URGENT_AT} or more).`,
      action: { id: 'check_connection', label: 'Run a connection check' },
    })
  }

  // Battery. If low battery already explains why the hub is offline, it lives
  // in that card instead of getting a second card of its own.
  if (!batteryExplainsOffline && d.batteryPct < RULES.BATTERY_LOW_PCT) {
    const score = d.batteryPct < RULES.BATTERY_CRITICAL_PCT ? RULES.BATTERY_CRITICAL : RULES.BATTERY_LOW
    const days = batteryDaysLeft(d.batteryPct, d.batteryDrainPctPerDay)
    out.push({
      id: 'battery',
      kind: 'battery_low',
      score,
      level: levelFor(score),
      title: `Battery is at ${d.batteryPct}%`,
      why: `At the usual rate it has ${daysText(days)} left.`,
      evidence: [{ text: `Average drain: ${d.batteryDrainPctPerDay}% per day` }],
      rule: `Battery under ${RULES.BATTERY_LOW_PCT}% scores ${RULES.BATTERY_LOW}, and under ${RULES.BATTERY_CRITICAL_PCT}% scores ${RULES.BATTERY_CRITICAL}.`,
      action: { id: 'settings', label: 'Set a charge reminder' },
    })
  }

  // Unusual movement
  if (activity.burst) {
    const b = activity.burst
    const score = RULES.MOVEMENT_BURST
    out.push({
      id: 'burst',
      kind: 'movement_unusual',
      score,
      level: levelFor(score),
      title: `Unusually busy between ${clock(b.from)} and ${clock(b.to)}`,
      why: `${b.actual} movements in about ${b.to - b.from} minutes. That hour usually has about ${Math.round(b.typical)}.`,
      inference: {
        cause: 'Could be someone at home, a visitor or a pet. Sensors can only see movement, not who it was.',
        confidence: 'Low',
        score: 0.3,
        alternatives: [],
      },
      evidence: s.events
        .filter((e) => b.ids.includes(e.id))
        .map((e) => ({ t: e.t, text: `Movement in the ${e.room?.toLowerCase()}` })),
      rule: `This hour had at least ${RULES.BURST_RATIO} times its usual movement and ${RULES.BURST_MIN_EXTRA} or more extra events, which scores ${score}.`,
      action: { id: 'review_movement', label: 'Review that movement' },
    })
  }

  return out.sort((a, b) => b.score - a.score)
}

// Actions: only suggest what makes sense right now

export function rankControls(s: Scenario): ControlOption[] {
  const d = s.device
  const updateToday = s.events.find((e) => e.type === 'software_updated')
  const repeatedDrops = s.events.filter((e) => e.type === 'disconnected').length >= 2
  const weakSignal = signalLabel(d.signalDbm) === 'Weak'

  // Restart
  let restart: ControlOption
  if (!d.connected) {
    restart = {
      id: 'restart',
      label: 'Restart device',
      status: 'unavailable',
      reason: "The hub is offline, so it can't receive a restart. Restart it at the device.",
    }
  } else if (repeatedDrops || weakSignal) {
    restart = {
      id: 'restart',
      label: 'Restart device',
      status: 'recommended',
      reason: 'It has dropped more than once today.',
    }
  } else {
    const drop = s.events.find((e) => e.type === 'disconnected')
    restart = {
      id: 'restart',
      label: 'Restart device',
      status: 'not_needed',
      reason: drop
        ? `Not needed. It reconnected by itself after ${clock(drop.t)}.`
        : 'Not needed. Everything is running normally.',
    }
  }

  // Update software
  let update: ControlOption
  if (isOlder(d.softwareVersion, d.latestVersion)) {
    update = d.connected
      ? {
          id: 'update',
          label: `Update to ${d.latestVersion}`,
          status: 'recommended',
          reason: `You're on ${d.softwareVersion}.`,
        }
      : {
          id: 'update',
          label: `Update to ${d.latestVersion}`,
          status: 'unavailable',
          reason: `Version ${d.latestVersion} is available. We'll install it once the hub is back online.`,
        }
  } else {
    update = {
      id: 'update',
      label: 'Update software',
      status: 'not_needed',
      reason: updateToday
        ? `You're on the latest version (${d.softwareVersion}, installed today at ${clock(updateToday.t)}).`
        : `You're on the latest version (${d.softwareVersion}).`,
    }
  }

  const order = { recommended: 0, available: 1, not_needed: 2, unavailable: 3 }
  return [
    restart,
    update,
    { id: 'settings', label: 'Device settings', status: 'available', reason: 'Alerts, rooms and sensitivity.' },
    {
      id: 'view_all',
      label: 'View all events',
      status: 'available',
      reason: `All ${s.events.length} events today, unfiltered.`,
    },
  ].sort((a, b) => order[a.status as keyof typeof order] - order[b.status as keyof typeof order]) as ControlOption[]
}

// The one-line verdict

export function makeVerdict(s: Scenario, findings: Finding[], activity: ActivitySummary): Briefing['verdict'] {
  const urgent = findings.filter((f) => f.level === 'urgent')
  const attention = findings.filter((f) => f.level === 'attention')
  const d = s.device

  const freshness = d.connected
    ? `Last synced at ${clock(d.lastSync)}`
    : `Last heard from your hub ${duration(s.now - d.lastSync)} ago`

  if (urgent.length) {
    const top = urgent[0]
    const headline =
      top.kind === 'offline' ? `Your hub has been offline for ${roughHours(s.now - d.lastSync)}.` : `${top.title}.`
    const n = urgent.length + attention.length
    return {
      state: 'urgent',
      headline,
      summary:
        top.kind === 'offline' && activity.burst
          ? `It went quiet at ${clock(d.lastSync)}, right after unusually busy movement. ${n} ${n === 1 ? 'thing needs' : 'things need'} you.`
          : `${n} ${n === 1 ? 'thing needs' : 'things need'} you now.`,
      freshness,
    }
  }

  if (attention.length) {
    const top = attention[0]
    return {
      state: 'attention',
      headline:
        attention.length === 1
          ? 'Mostly quiet. One thing is worth a look.'
          : `Mostly quiet. ${attention.length} things are worth a look.`,
      summary:
        top.kind === 'disconnect_resolved'
          ? `Your hub dropped offline for a few minutes${top.inference?.cause.includes('update') ? " after this morning's update" : ''}, then recovered on its own. Activity was ${activity.verdict === 'typical' ? 'normal' : activity.verdict + ' than usual'}.`
          : top.title + '.',
      freshness,
    }
  }

  return {
    state: 'calm',
    headline: 'All quiet at home.',
    summary: `${activity.movementsInWindow} ${activity.movementsInWindow === 1 ? 'movement' : 'movements'}, all ${activity.verdict === 'quieter' ? 'on the quiet side' : 'within your usual pattern'}. Nothing needs you.`,
    freshness,
  }
}

// Putting it together

export function buildBriefing(s: Scenario): Briefing {
  const d = s.device
  const activity = groupActivity(s)
  const allFindings = buildFindings(s, activity)
  const findings = allFindings.filter((f) => f.level !== 'info').slice(0, 3)
  const days = batteryDaysLeft(d.batteryPct, d.batteryDrainPctPerDay)
  const sig = signalLabel(d.signalDbm)
  const latest = !isOlder(d.softwareVersion, d.latestVersion)

  // "Everything else is fine": only list checks that actually passed
  const allClear: string[] = []
  if (d.connected && !findings.some((f) => f.kind === 'disconnect_resolved')) allClear.push('Hub is online and syncing')
  if (d.connected && findings.some((f) => f.kind === 'disconnect_resolved'))
    allClear.push(`Hub is back online, synced at ${clock(d.lastSync)}`)
  if (d.batteryPct >= RULES.BATTERY_LOW_PCT) allClear.push(`Battery ${d.batteryPct}%, ${daysText(days)} left`)
  if (sig === 'Excellent' || sig === 'Good' || (sig === 'Fair' && d.connected))
    allClear.push(`Wi-Fi signal ${sig.toLowerCase()}${sig === 'Fair' ? ', good enough for now' : ''}`)
  if (latest) allClear.push(`Software up to date (${d.softwareVersion})`)
  if (!activity.burst && activity.verdict !== 'busier') allClear.push('Movement matched your usual pattern')

  const health: HealthItem[] = [
    {
      label: 'Connection',
      value: d.connected ? 'Online' : 'Offline',
      raw: d.connected ? 'Connected' : 'Disconnected',
      ok: d.connected,
    },
    {
      label: 'Battery',
      value: d.connected ? `${daysText(days)} left` : 'Unknown while offline',
      raw: `${d.batteryPct}%${d.connected ? '' : ' (last reported)'}`,
      ok: d.batteryPct >= RULES.BATTERY_LOW_PCT,
    },
    { label: 'Wi-Fi signal', value: sig, raw: `${d.signalDbm} dBm`, ok: sig !== 'Weak' },
    {
      label: 'Software',
      value: latest ? 'Up to date' : `Update available (${d.latestVersion})`,
      raw: `v${d.softwareVersion}`,
      ok: latest,
    },
    {
      label: 'Last sync',
      value: d.connected ? 'Just now' : `${duration(s.now - d.lastSync)} ago`,
      raw: clock(d.lastSync),
      ok: d.connected,
    },
    { label: 'Last restart', value: d.lastRestart < 0 ? 'Last night' : 'Today', raw: when(d.lastRestart), ok: true },
  ]

  return {
    scenarioId: s.id,
    verdict: makeVerdict(s, findings, activity),
    awayWindow: { from: s.awayFrom, to: s.now, label: `${clock(s.awayFrom)} to ${clock(s.now)}` },
    findings,
    allClear,
    activity,
    health,
    controls: rankControls(s),
    importantCount: s.events.filter((e) => e.type !== 'movement').length,
  }
}

// "Ask your home": answers come from the same data, using simple keyword rules

export const SUGGESTED_QUESTIONS = [
  'Did the hub go offline?',
  'Is the battery OK?',
  'Was the movement normal?',
  'What changed since last night?',
  'Do I need to do anything?',
]

export function answerQuestion(q: string, s: Scenario, b: Briefing): string {
  const text = q.toLowerCase()
  const d = s.device
  const drops = s.events.filter((e) => e.type === 'disconnected')

  if (/offline|disconnect|connect|online/.test(text)) {
    if (!d.connected)
      return `Yes. It's been offline since ${clock(d.lastSync)} (${duration(s.now - d.lastSync)}). ${b.findings[0]?.inference?.cause ?? ''}`
    if (drops.length) {
      const back = recoveredAt(s, drops[drops.length - 1])
      return `Once, at ${clock(drops[0].t)}. It was back by ${back ? clock(back) : 'the next sync'} and has been fine since.`
    }
    return 'No. It stayed connected the whole time.'
  }
  if (/battery|charge|power/.test(text)) {
    const days = batteryDaysLeft(d.batteryPct, d.batteryDrainPctPerDay)
    if (!d.connected)
      return `We last saw ${d.batteryPct}%. That's very low, and it's the most likely reason the hub went quiet.`
    return d.batteryPct < RULES.BATTERY_LOW_PCT
      ? `It's at ${d.batteryPct}%, ${daysText(days)} left. Worth charging soon.`
      : `Yes. ${d.batteryPct}% is ${daysText(days)} at your usual rate.`
  }
  if (/move|motion|activity|normal|busy|someone/.test(text)) {
    return `${b.activity.headline}. ${b.activity.detail}`
  }
  if (/change|update|version|last night|restart/.test(text)) {
    const upd = s.events.find((e) => e.type === 'software_updated')
    const parts = [
      `It last restarted ${d.lastRestart < 0 ? `last night at ${clock(d.lastRestart)}` : `at ${clock(d.lastRestart)}`}.`,
    ]
    if (upd) parts.push(`Software updated to ${upd.detail} at ${clock(upd.t)}.`)
    else if (isOlder(d.softwareVersion, d.latestVersion)) parts.push(`An update to ${d.latestVersion} is waiting.`)
    else parts.push('No software changes today.')
    return parts.join(' ')
  }
  if (/do|need|action|should|anything/.test(text)) {
    if (!b.findings.length) return 'Nothing. Everything is running normally.'
    return `${b.findings.length === 1 ? 'One thing' : `${b.findings.length} things`}: ${b.findings.map((f) => f.action.label.toLowerCase()).join(', then ')}.`
  }
  return 'I can answer questions about connection, battery, movement, updates and what to do next. Try one of the suggestions.'
}
