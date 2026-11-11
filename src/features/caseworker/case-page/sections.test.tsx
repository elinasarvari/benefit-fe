import { describe, expect, it } from 'vitest'
import { caseDetail } from '@/test/caseFixtures'
import { caseSections } from './sections'

describe('caseSections', () => {
  it('FR-003-23: case page renders the determination section when it is registered', () => {
    const section = caseSections.find((entry) => entry.id === 'determination')

    expect(section?.title).toBe('Determination')
    // after the review task and before history, shown once the case reached determining
    const ids = caseSections.map((entry) => entry.id)
    expect(ids.indexOf('determination')).toBeGreaterThan(ids.indexOf('status'))
    expect(ids.indexOf('determination')).toBeLessThan(ids.indexOf('history'))
    for (const state of ['determining', 'under_review', 'decided'] as const) {
      expect(section?.visible?.(caseDetail({ state }))).toBe(true)
    }
    for (const state of ['submitted', 'verifying', 'awaiting_applicant'] as const) {
      expect(section?.visible?.(caseDetail({ state }))).toBe(false)
    }
  })

  it('MVP contracts: reserves the sections later features fill, hidden until they land', () => {
    const ids = caseSections.map((entry) => entry.id)
    expect(ids).toEqual([
      'status',
      'review-task',
      'documents',
      'determination',
      'explanation',
      'notices',
      'demo-clock',
      'history',
    ])
    for (const id of ['documents', 'notices', 'demo-clock']) {
      const section = caseSections.find((entry) => entry.id === id)
      expect(section?.visible?.(caseDetail({ state: 'decided' }))).toBe(false)
    }
  })

  it('FR-004-15: explanation section shows once determining starts', () => {
    const section = caseSections.find((entry) => entry.id === 'explanation')
    for (const state of ['determining', 'under_review', 'decided'] as const) {
      expect(section?.visible?.(caseDetail({ state }))).toBe(true)
    }
    for (const state of ['submitted', 'verifying', 'awaiting_applicant'] as const) {
      expect(section?.visible?.(caseDetail({ state }))).toBe(false)
    }
  })
})
