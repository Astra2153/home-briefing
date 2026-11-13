import { describe, expect, it } from 'vitest'
import { SCENARIOS, hm } from '@/data/scenarios'
import {
  answerQuestion,
  batteryDaysLeft,
  buildBriefing,
  explainDisconnect,
  groupActivity,
  isOlder,
  levelFor,
  recoveredAt,
  signalLabel,
} from '@/lib/triage'

const [A, B, C] = SCENARIOS

describe('Sample data', () => {
  it('scenario A matches the brief: 17 events, 2 important, exact recent six', () => {
    expect(A.events).toHaveLength(17)
    expect(A.events.filter((e) => e.type !== 'movement')).toHaveLength(2)
    const recent = [...A.events]
      .reverse()
      .slice(0, 6)
      .map((e) => [e.t, e.type])
    expect(recent).toEqual([
      [hm('10:42'), 'movement'],
      [hm('10:18'), 'disconnected'],
      [hm('10:05'), 'movement'],
      [hm('9:47'), 'movement'],
      [hm('9:35'), 'software_updated'],
      [hm('9:31'), 'movement'],
    ])
  })
})

describe('Health in plain words', () => {
  it('maps -67 dBm to Fair', () => expect(signalLabel(-67)).toBe('Fair'))
  it('forecasts battery days', () => expect(batteryDaysLeft(64, 6)).toBe(10.5))
  it('compares versions', () => {
    expect(isOlder('2.3.8', '2.4.1')).toBe(true)
    expect(isOlder('2.4.1', '2.4.1')).toBe(false)
  })
  it('levels scores', () => {
    expect(levelFor(20)).toBe('info')
    expect(levelFor(35)).toBe('attention')
    expect(levelFor(89)).toBe('urgent')
  })
})

describe('Grouping movement', () => {
  it('A: collapses 11 away-window movements and calls them typical', () => {
    const g = groupActivity(A)
    expect(g.movementsInWindow).toBe(11)
    expect(g.verdict).toBe('typical')
    expect(g.burst).toBeUndefined()
  })
  it('B: normal day is typical', () => expect(groupActivity(B).verdict).toBe('typical'))
  it('C: detects the 7 AM burst and only judges the observed period', () => {
    const g = groupActivity(C)
    expect(g.burst?.hour).toBe(7)
    expect(g.burst?.actual).toBe(7)
    expect(g.observedUntil).toBe(hm('7:31'))
  })
})

describe('Causes and recovery', () => {
  it('A: links the 10:18 drop to the 9:35 update with medium confidence', () => {
    const drop = A.events.find((e) => e.type === 'disconnected')!
    const inf = explainDisconnect(A, drop)!
    expect(inf.cause).toMatch(/software update at 9:35 AM/)
    expect(inf.confidence).toBe('Medium')
    expect(inf.alternatives[0]).toMatch(/signal is fair/)
  })
  it('A: infers recovery by 10:42 from later activity/sync', () => {
    const drop = A.events.find((e) => e.type === 'disconnected')!
    expect(recoveredAt(A, drop)).toBe(hm('10:42'))
  })
  it('C: blames the low battery with high confidence, not recovered', () => {
    const drop = C.events.find((e) => e.type === 'disconnected')!
    const inf = explainDisconnect(C, drop)!
    expect(inf.cause).toMatch(/^Battery/)
    expect(inf.confidence).toBe('High')
    expect(recoveredAt(C, drop)).toBeUndefined()
  })
})

describe('Verdict and actions', () => {
  it('A: attention, one card, no restart, no update', () => {
    const b = buildBriefing(A)
    expect(b.verdict.state).toBe('attention')
    expect(b.findings.map((f) => f.kind)).toEqual(['disconnect_resolved'])
    expect(b.findings[0].action.id).toBe('check_connection')
    expect(b.controls.find((c) => c.id === 'restart')?.status).toBe('not_needed')
    expect(b.controls.find((c) => c.id === 'update')?.status).toBe('not_needed')
  })
  it('B: calm, no cards', () => {
    const b = buildBriefing(B)
    expect(b.verdict.state).toBe('calm')
    expect(b.findings).toHaveLength(0)
    expect(b.verdict.headline).toBe('All quiet at home.')
  })
  it('C: urgent, offline first, battery folded into it (no duplicate card)', () => {
    const b = buildBriefing(C)
    expect(b.verdict.state).toBe('urgent')
    expect(b.findings[0].kind).toBe('offline')
    expect(b.findings.some((f) => f.kind === 'battery_low')).toBe(false)
    expect(b.findings.some((f) => f.kind === 'movement_unusual')).toBe(true)
    expect(b.controls.find((c) => c.id === 'update')?.status).toBe('unavailable')
    expect(b.controls.find((c) => c.id === 'restart')?.status).toBe('unavailable')
  })
})

describe('Ask your home', () => {
  it('answers questions from the same data', () => {
    const b = buildBriefing(A)
    expect(answerQuestion('Did the hub go offline?', A, b)).toMatch(/Once, at 10:18 AM/)
    expect(answerQuestion('Do I need to do anything?', B, buildBriefing(B))).toMatch(/Nothing/)
  })
})
