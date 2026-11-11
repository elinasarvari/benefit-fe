import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CASE_ID, OTHER_CASE_ID, caseDetail } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

describe('ApplicantCasePage', () => {
  it('FR-001-26: applicant case page shows the same not-found page for any 404', async () => {
    signedInAs('applicant')
    const notFound = (id: string) => {
      respondTo(`GET /api/v1/cases/${id}`, () =>
        errorResponse(404, 'not_found', 'Case not found.', 'ref-for-this-one'),
      )
    }
    notFound(OTHER_CASE_ID)
    notFound('12345678-1234-4234-8234-123456789012')

    const pages: string[] = []
    for (const id of [OTHER_CASE_ID, '12345678-1234-4234-8234-123456789012']) {
      const { unmount } = renderApp(`/applicant/cases/${id}`)
      await screen.findByRole('heading', { name: /page not found/i })
      pages.push(document.body.textContent)
      unmount()
    }

    expect(pages[0]).toBe(pages[1])
    expect(pages[0]).not.toContain('ref-for-this-one')
  })

  it('FR-001-26: applicant case page shows state, deadline and outcome of their own case', async () => {
    signedInAs('applicant')
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () =>
      jsonResponse(
        caseDetail({ state: 'decided', outcome: 'approved', decision_deadline: '2026-05-01' }),
      ),
    )

    renderApp(`/applicant/cases/${CASE_ID}`)

    expect(await screen.findByText(/status: decided/i)).toBeVisible()
    expect(screen.getByText(/decision due: may 1, 2026/i)).toBeVisible()
    expect(screen.getByText(/outcome: approved/i)).toBeVisible()
  })
})
