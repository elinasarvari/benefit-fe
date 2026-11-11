import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OTHER_CASE_ID, CASE_ID, casePage, caseSummary } from '@/test/caseFixtures'
import { errorResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

describe('ApplicantHomePage', () => {
  it('FR-001-26: applicant home lists each open case with state and decision deadline', async () => {
    signedInAs('applicant')
    respondTo('GET /api/v1/cases', () =>
      casePage([
        caseSummary({ case_id: CASE_ID, state: 'verifying', decision_deadline: '2026-05-01' }),
        caseSummary({
          case_id: OTHER_CASE_ID,
          state: 'under_review',
          decision_deadline: '2026-06-15',
        }),
      ]),
    )

    renderApp('/applicant')

    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Verifying documents')
    expect(items[0]).toHaveTextContent('May 1, 2026')
    expect(items[1]).toHaveTextContent('Under review') // FR-001-02's name for the state
    expect(items[1]).toHaveTextContent('Jun 15, 2026')
    expect(screen.getByRole('link', { name: `Case ${CASE_ID}` })).toHaveAttribute(
      'href',
      `/applicant/cases/${CASE_ID}`,
    )
  })

  it('FR-001-26: applicant home shows loading, empty and error states', async () => {
    signedInAs('applicant')
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    respondTo('GET /api/v1/cases', async () => {
      await gate
      return casePage([])
    })
    const { unmount } = renderApp('/applicant')
    expect(await screen.findByText(/loading your cases/i)).toBeVisible()
    release()
    expect(await screen.findByText(/no applications to show yet/i)).toBeVisible()
    unmount()

    respondTo('GET /api/v1/cases', () =>
      errorResponse(500, 'internal_error', 'Cases are unavailable.'),
    )
    renderApp('/applicant')
    expect(await screen.findByText('Cases are unavailable.')).toBeVisible()
  })

  it('FR-004-16: applicant home links to the decision history', async () => {
    signedInAs('applicant')
    respondTo('GET /api/v1/cases', () => casePage([]))

    renderApp('/applicant')

    expect(await screen.findByRole('link', { name: 'Decision history' })).toHaveAttribute(
      'href',
      '/applicant/history',
    )
  })
})
