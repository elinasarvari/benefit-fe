import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from './time'

describe('time formatting', () => {
  it('FR-000-27: formats a 05:30Z instant as the previous Chicago day', () => {
    expect(formatDate('2026-01-15T05:30:00Z')).toBe('Jan 14, 2026')
  })

  it('FR-000-27: formats a date-time in Chicago local time with its zone when in winter', () => {
    expect(formatDateTime('2026-01-15T05:30:00Z')).toBe('Jan 14, 2026, 11:30 PM CST')
  })

  it('FR-000-27: formats a date-time with the daylight-saving zone when in summer', () => {
    expect(formatDateTime(new Date('2026-07-15T05:30:00Z'))).toBe('Jul 15, 2026, 12:30 AM CDT')
  })
})
