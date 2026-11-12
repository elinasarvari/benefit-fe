import { describe, expect, it } from 'vitest'
import { caseIdFor } from './caseId'

describe('caseIdFor', () => {
  it('FR-002-17: caseIdFor matches the pinned benefit-be vector', async () => {
    // Computed with benefit-be `packages.domain.case.case_id_for` (ADR-002-01).
    expect(await caseIdFor('11111111-2222-4333-8444-555555555555')).toBe(
      'f587334f-3e85-58f0-9c1e-f44a79e9586c',
    )
  })

  it('FR-002-17: the same reference always gives the same case ID', async () => {
    const reference = crypto.randomUUID()
    expect(await caseIdFor(reference)).toBe(await caseIdFor(reference))
    expect(await caseIdFor(reference)).not.toBe(await caseIdFor(crypto.randomUUID()))
  })
})
