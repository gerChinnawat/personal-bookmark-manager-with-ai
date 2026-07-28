import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatRelativeTime } from './relativeTime'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats a past time within the last minute in seconds', () => {
    const isoDate = new Date('2026-07-28T11:59:30.000Z').toISOString()
    expect(formatRelativeTime(isoDate)).toBe('30 seconds ago')
  })

  it('formats a time an hour in the past', () => {
    const isoDate = new Date('2026-07-28T11:00:00.000Z').toISOString()
    expect(formatRelativeTime(isoDate)).toBe('1 hour ago')
  })

  it('formats a time a day in the future', () => {
    const isoDate = new Date('2026-07-29T12:00:00.000Z').toISOString()
    expect(formatRelativeTime(isoDate)).toBe('tomorrow')
  })
})
