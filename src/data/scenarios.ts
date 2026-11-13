/**
 * Sample data: three scenarios that all use the same shape.
 *
 * Time is stored as "minutes since midnight today" (t). Negative values are
 * yesterday (e.g. -26 = 11:34 PM yesterday). This keeps the rules and tests
 * readable; in production these would be ISO timestamps from an events API.
 */

export type EventType = 'movement' | 'disconnected' | 'software_updated'

export interface HomeEvent {
  id: string
  t: number
  type: EventType
  room?: string
  /** Free-form extra detail, e.g. the version installed */
  detail?: string
}

export interface DeviceSnapshot {
  name: string
  connected: boolean
  /** Last reported battery. If the device is offline this value is stale. */
  batteryPct: number
  /** Learned average drain, used for the "days left" forecast */
  batteryDrainPctPerDay: number
  lastSync: number
  signalDbm: number
  softwareVersion: string
  latestVersion: string
  lastRestart: number
}

export interface Scenario {
  id: 'A' | 'B' | 'C'
  label: string
  short: string
  /** The moment the user opens the app */
  now: number
  /** Inferred from the last time the user closed the app */
  awayFrom: number
  device: DeviceSnapshot
  /** All of today's events, oldest first */
  events: HomeEvent[]
  /**
   * Typical movement events per clock hour (index 0-23), learned from the
   * last 4 weeks of the same weekday. This is what "normal" means.
   */
  baseline: number[]
}

/** Shared learned baseline for this home (same household in every scenario). */
const BASELINE = [0, 0, 0, 0, 0, 1, 2, 2, 3, 3, 2, 2, 2, 1, 1, 1, 2, 3, 3, 3, 2, 2, 1, 0]

/** Turns "9:31" into minutes after midnight */
export const hm = (clock: string): number => {
  const [h, m] = clock.split(':').map(Number)
  return h * 60 + m
}

const move = (id: string, clock: string, room: string): HomeEvent => ({ id, t: hm(clock), type: 'movement', room })

// A) Needs attention: the exact data from the assignment brief
// 17 events today = 15 movements + 1 disconnect + 1 update.
// The 6 most recent match the brief exactly.
const scenarioA: Scenario = {
  id: 'A',
  label: 'Needs attention',
  short: 'Brief data',
  now: hm('10:44'),
  awayFrom: hm('6:10'),
  device: {
    name: 'Home Hub',
    connected: true,
    batteryPct: 64,
    batteryDrainPctPerDay: 6,
    lastSync: hm('10:42'),
    signalDbm: -67,
    softwareVersion: '2.4.1',
    latestVersion: '2.4.1',
    lastRestart: -26, // Yesterday, 11:34 PM
  },
  events: [
    // While the user was still home (before 6:10)
    move('a1', '5:48', 'Hallway'),
    move('a2', '5:55', 'Kitchen'),
    move('a3', '6:02', 'Kitchen'),
    move('a4', '6:07', 'Hallway'),
    // While away
    move('a5', '7:12', 'Living room'),
    move('a6', '7:40', 'Kitchen'),
    move('a7', '8:05', 'Living room'),
    move('a8', '8:26', 'Living room'),
    move('a9', '8:48', 'Kitchen'),
    move('a10', '9:10', 'Living room'),
    move('a11', '9:22', 'Hallway'),
    // The six "Recent Activity" rows from the brief
    move('a12', '9:31', 'Living room'),
    { id: 'a13', t: hm('9:35'), type: 'software_updated', detail: '2.4.1' },
    move('a14', '9:47', 'Kitchen'),
    move('a15', '10:05', 'Living room'),
    { id: 'a16', t: hm('10:18'), type: 'disconnected' },
    move('a17', '10:42', 'Hallway'),
  ],
  baseline: BASELINE,
}

// B) All quiet: a normal workday, nothing needs the user
const scenarioB: Scenario = {
  id: 'B',
  label: 'All quiet',
  short: 'Normal day',
  now: hm('17:52'),
  awayFrom: hm('9:05'),
  device: {
    name: 'Home Hub',
    connected: true,
    batteryPct: 82,
    batteryDrainPctPerDay: 6,
    lastSync: hm('17:50'),
    signalDbm: -58,
    softwareVersion: '2.4.1',
    latestVersion: '2.4.1',
    lastRestart: -26,
  },
  events: [
    move('b1', '8:40', 'Kitchen'),
    move('b2', '8:52', 'Hallway'),
    move('b3', '9:01', 'Hallway'),
    move('b4', '9:40', 'Living room'),
    move('b5', '10:15', 'Kitchen'),
    move('b6', '10:48', 'Living room'),
    move('b7', '11:20', 'Kitchen'),
    move('b8', '12:05', 'Living room'),
    move('b9', '12:40', 'Kitchen'),
    move('b10', '13:05', 'Living room'),
    move('b11', '13:12', 'Kitchen'),
    move('b12', '14:30', 'Living room'),
    move('b13', '15:40', 'Living room'),
    move('b14', '16:30', 'Kitchen'),
    move('b15', '16:55', 'Hallway'),
    move('b16', '17:10', 'Living room'),
    move('b17', '17:31', 'Kitchen'),
  ],
  baseline: BASELINE,
}

// C) Urgent: unusual movement burst, then the hub goes silent
// (offline ~3h, last reported battery 9%, an update pending)
const scenarioC: Scenario = {
  id: 'C',
  label: 'Urgent',
  short: 'Hub offline',
  now: hm('10:44'),
  awayFrom: hm('6:10'),
  device: {
    name: 'Home Hub',
    connected: false,
    batteryPct: 9,
    batteryDrainPctPerDay: 6,
    lastSync: hm('7:31'),
    signalDbm: -71,
    softwareVersion: '2.3.8',
    latestVersion: '2.4.1',
    lastRestart: -26,
  },
  events: [
    move('c1', '5:50', 'Kitchen'),
    move('c2', '6:00', 'Hallway'),
    move('c3', '6:05', 'Hallway'),
    move('c4', '6:45', 'Living room'),
    // Burst at an hour that is usually quiet-ish (baseline 2/hour)
    move('c5', '7:02', 'Hallway'),
    move('c6', '7:05', 'Living room'),
    move('c7', '7:09', 'Living room'),
    move('c8', '7:13', 'Kitchen'),
    move('c9', '7:18', 'Hallway'),
    move('c10', '7:22', 'Living room'),
    move('c11', '7:26', 'Hallway'),
    { id: 'c12', t: hm('7:31'), type: 'disconnected' },
  ],
  baseline: BASELINE,
}

export const SCENARIOS: Scenario[] = [scenarioA, scenarioB, scenarioC]
