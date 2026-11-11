import { describe, expect, it } from 'vitest'
import { stateLabel } from './caseLabels'

describe('stateLabel', () => {
  // TC-159 and quickstart step 7 look for the state by the name FR-001-02 gives it.
  it('FR-001-02: the under_review state is shown as "Under review"', () => {
    expect(stateLabel('under_review')).toBe('Under review')
  })

  it('FR-001-02: every state label starts with the state name the spec uses', () => {
    expect(stateLabel('submitted')).toMatch(/^Submitted/)
    expect(stateLabel('verifying')).toMatch(/^Verifying/)
    expect(stateLabel('determining')).toMatch(/^Determining/)
    expect(stateLabel('decided')).toMatch(/^Decided/)
  })
})
