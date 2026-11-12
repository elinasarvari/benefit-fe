import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/api/queryClient'
import { caseDetail } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo } from '@/test/fakeApi'
import { VERIFICATION_URL, finding, verification } from '@/test/verificationFixtures'
import { DocumentsSection } from './DocumentsSection'

function show() {
  return render(
    <QueryClientProvider client={createQueryClient({ navigate: () => undefined, retryDelay: 1 })}>
      <DocumentsSection detail={caseDetail({ state: 'under_review' })} />
    </QueryClientProvider>,
  )
}

describe('DocumentsSection', () => {
  it('FR-002-18: documents section shows stubs, entered details and findings with both values and conversion', async () => {
    respondTo(`GET ${VERIFICATION_URL}`, () => jsonResponse(verification()))
    show()

    const stubs = within(await screen.findByRole('list', { name: 'Pay stubs' }))
    expect(stubs.getByText('Synthetic Person')).toBeVisible()
    expect(stubs.getAllByText('Synthetic Employer').length).toBeGreaterThan(0)
    expect(stubs.getByText('Weekly')).toBeVisible()
    expect(stubs.getByText('400.00')).toBeVisible()
    expect(stubs.getByText('Mar 1, 2026')).toBeVisible()
    expect(stubs.getByText(/PDF/)).toBeVisible()

    const findings = within(screen.getByRole('list', { name: 'Findings' }))
    expect(findings.getByText('Income does not match the pay stub')).toBeVisible()
    expect(findings.getByText('1300.00')).toBeVisible()
    expect(findings.getByText('1733.33')).toBeVisible()
    expect(findings.getByText(/weekly 400\.00 x 52 \/ 12 = 1733\.33/)).toBeVisible()
    expect(screen.getByText(/needs review/)).toBeVisible()
  })

  it('FR-002-18: shows a dismissed finding with its reason, and missing documents', async () => {
    respondTo(`GET ${VERIFICATION_URL}`, () =>
      jsonResponse(
        verification({
          result: {
            complete: false,
            needs_review: false,
            findings: [
              finding({
                dismissed: {
                  reviewer_id: 'eeeeeeee-2222-4333-8444-555555555555',
                  reason: 'Applicant confirmed a second job',
                  dismissed_at: '2026-03-18T10:00:00Z',
                },
              }),
            ],
            missing_items: [
              {
                member_id: 'bbbbbbbb-2222-4333-8444-555555555555',
                job_id: 'ffffffff-2222-4333-8444-555555555555',
                kind: 'no_stub',
              },
            ],
          },
        }),
      ),
    )
    show()

    expect(await screen.findByText(/Applicant confirmed a second job/)).toBeVisible()
    expect(screen.getByText('No pay stub for this job')).toBeVisible()
    expect(screen.queryByRole('button', { name: /dismiss this finding/i })).toBeNull()
  })

  it('FR-002-18: documents section loading, empty and error states', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    respondTo(`GET ${VERIFICATION_URL}`, async () => {
      await gate
      return jsonResponse({ documents: [], result: null })
    })
    const view = show()

    expect(screen.getByText(/loading documents/i)).toBeVisible()
    release()
    expect(await screen.findByText(/no pay stubs have been uploaded/i)).toBeVisible()
    view.unmount()

    respondTo(`GET ${VERIFICATION_URL}`, () =>
      errorResponse(500, 'internal_error', 'Something went wrong on our side.'),
    )
    show()
    expect(await screen.findByText(/Something went wrong on our side/)).toBeVisible()
  })

  it('FR-002-18: stubs without a first check say the check has not run', async () => {
    respondTo(`GET ${VERIFICATION_URL}`, () => jsonResponse(verification({ result: null })))
    show()

    expect(await screen.findByText(/the check has not run yet/i)).toBeVisible()
    expect(screen.getByRole('list', { name: 'Pay stubs' })).toBeVisible()
  })

  it('FR-002-19: no action buttons without an open task that offers them', async () => {
    respondTo(`GET ${VERIFICATION_URL}`, () => jsonResponse(verification()))
    show() // the case has no open review task

    await screen.findByRole('list', { name: 'Findings' })
    expect(screen.queryByRole('button', { name: /correct a detail/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /dismiss this finding/i })).toBeNull()
  })
})
