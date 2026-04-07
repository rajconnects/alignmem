import { describe, expect, it } from 'vitest'
import {
  SIGNAL_CHARS,
  buildCardMetaLine,
  durationLabel,
  formatIsoDate,
  signalFor,
  sortNodesBySequence,
  statusColorVar
} from '../format'
import type { IndexedTrace } from '../types'

describe('signal characters', () => {
  it('uses the four canonical characters', () => {
    expect(SIGNAL_CHARS.resolved).toBe('+')
    expect(SIGNAL_CHARS.open).toBe('\u25CB')
    expect(SIGNAL_CHARS.contested).toBe('\u2715')
    expect(SIGNAL_CHARS.archived).toBe('\u2014')
  })
  it('signalFor returns mapping', () => {
    expect(signalFor('resolved')).toBe('+')
  })
  it('statusColorVar covers every status', () => {
    expect(statusColorVar('resolved')).toContain('green')
    expect(statusColorVar('open')).toContain('orange')
    expect(statusColorVar('contested')).toContain('red')
    expect(statusColorVar('archived')).toContain('text-300')
  })
})

describe('durationLabel', () => {
  it('returns OPEN when null', () => {
    expect(durationLabel(null)).toBe('OPEN')
  })
  it('returns SAME-DAY for 0', () => {
    expect(durationLabel(0)).toBe('SAME-DAY')
  })
  it('returns 1 DAY for 1', () => {
    expect(durationLabel(1)).toBe('1 DAY')
  })
  it('returns N DAYS for >1', () => {
    expect(durationLabel(5)).toBe('5 DAYS')
  })
})

describe('formatIsoDate', () => {
  it('returns em-dash for null', () => {
    expect(formatIsoDate(null)).toBe('—')
  })
  it('slices to YYYY-MM-DD', () => {
    expect(formatIsoDate('2026-04-05T12:34:56Z')).toBe('2026-04-05')
  })
  it('returns em-dash for invalid input', () => {
    expect(formatIsoDate('not-a-date')).toBe('—')
  })
})

describe('buildCardMetaLine', () => {
  it('composes captured · duration · turns · participants', () => {
    const trace = {
      captured_at: '2026-04-05T00:00:00Z',
      duration_days: 0,
      turn_count: 8,
      participants: ['Arun', 'Claude']
    } as IndexedTrace
    const line = buildCardMetaLine(trace)
    expect(line).toContain('SAME-DAY')
    expect(line).toContain('8 TURNS')
    expect(line).toContain('ARUN · CLAUDE')
  })
})

describe('sortNodesBySequence', () => {
  it('sorts ascending, stably', () => {
    const input = [
      { sequence_order: 3, id: 'c' },
      { sequence_order: 1, id: 'a' },
      { sequence_order: 2, id: 'b' }
    ]
    expect(sortNodesBySequence(input).map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })
})
