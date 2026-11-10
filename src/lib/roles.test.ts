import { describe, expect, it } from 'vitest'

import { hasAnyRole, homePathFor } from '@/lib/roles'

describe('roles', () => {
  it('FR-000-05: a supervisor can do everything a caseworker can', () => {
    expect(hasAnyRole('supervisor', ['caseworker'])).toBe(true)
    expect(hasAnyRole('supervisor', ['supervisor'])).toBe(true)
  })

  it('FR-000-05: a caseworker is not a supervisor and an applicant is neither', () => {
    expect(hasAnyRole('caseworker', ['supervisor'])).toBe(false)
    expect(hasAnyRole('applicant', ['caseworker'])).toBe(false)
    expect(hasAnyRole('applicant', ['supervisor'])).toBe(false)
    expect(hasAnyRole('caseworker', ['applicant'])).toBe(false)
  })

  it('FR-000-05: each role lands in its own area', () => {
    expect(homePathFor('applicant')).toBe('/applicant')
    expect(homePathFor('caseworker')).toBe('/caseworker')
    expect(homePathFor('supervisor')).toBe('/caseworker')
  })
})
