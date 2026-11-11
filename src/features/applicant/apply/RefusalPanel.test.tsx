import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CASE_ID } from '@/test/caseFixtures'
import { RefusalPanel } from './RefusalPanel'

function show(reason: string, relatedCaseId: string | null) {
  return render(
    <MemoryRouter>
      <RefusalPanel reason={reason} relatedCaseId={relatedCaseId} />
    </MemoryRouter>,
  )
}

describe('RefusalPanel', () => {
  it('FR-001-25: refusal panel shows the reason and links to the related case', () => {
    for (const [reason, text] of [
      ['household_has_open_case', /already has an open case/i],
      ['household_has_coverage', /already has active coverage/i],
    ] as const) {
      const { unmount } = show(reason, CASE_ID)

      expect(screen.getByRole('alert')).toHaveTextContent(text)
      expect(screen.getByRole('link', { name: /related case/i })).toHaveAttribute(
        'href',
        `/applicant/cases/${CASE_ID}`,
      )
      unmount()
    }
  })

  it('FR-001-25: a reused submission reference shows its reason and no link', () => {
    show('submission_reference_in_use', null)

    expect(screen.getByRole('alert')).toHaveTextContent(/already submitted/i)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
