import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { caseExplanationsKey } from '@/api/explanations'
import { createQueryClient } from '@/api/queryClient'
import { CASE_ID, OTHER_CASE_ID, caseDetail } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo } from '@/test/fakeApi'
import { ExplanationSection } from './ExplanationSection'

function explanation(overrides: Record<string, unknown> = {}) {
  return {
    determination_id: '44444444-2222-4333-8444-555555555555',
    case_id: CASE_ID,
    household_id: '55555555-2222-4333-8444-555555555555',
    audience: 'caseworker',
    result: 'eligible',
    text: 'Eligible: income 1000.00 is under the limit 2500.00.',
    citations: [
      {
        rule_id: 'ELIG-06',
        section: 'TM-3.1',
        title: 'Income limit',
        manual_version: '2026-01-01',
      },
    ],
    built_at: '2026-03-20T09:00:00Z',
    ...overrides,
  }
}

function show(detail = caseDetail({ state: 'decided', outcome: 'approved' })) {
  return render(
    <QueryClientProvider client={createQueryClient({ navigate: () => undefined, retryDelay: 0 })}>
      <ExplanationSection detail={detail} />
    </QueryClientProvider>,
  )
}

function respondWith(items: unknown[]) {
  respondTo(`GET /api/v1/cases/${CASE_ID}/explanations`, () => jsonResponse({ items }))
}

describe('ExplanationSection', () => {
  it("FR-004-15: shows stored caseworker explanation with each citation's section, title and version", async () => {
    respondWith([explanation()])
    show()

    expect(await screen.findByText(/income 1000.00 is under the limit/)).toBeInTheDocument()
    const citations = within(screen.getByRole('list', { name: 'Citations' }))
    expect(citations.getByText(/ELIG-06: TM-3.1 Income limit/)).toBeInTheDocument()
    expect(citations.getByText(/Jan 1, 2026/)).toBeInTheDocument()
  })

  it('FR-004-15: shows loading state while explanations load', () => {
    respondTo(
      `GET /api/v1/cases/${CASE_ID}/explanations`,
      () => new Promise<Response>(() => undefined),
    )
    show()

    expect(screen.getByText('Loading explanation…')).toBeInTheDocument()
  })

  it('FR-004-15: shows empty state when no explanation is stored', async () => {
    respondWith([])
    show()

    expect(await screen.findByText('No explanation stored for this case.')).toBeInTheDocument()
  })

  it('FR-004-15: shows error state when the explanations request fails', async () => {
    respondTo(`GET /api/v1/cases/${CASE_ID}/explanations`, () =>
      errorResponse(500, 'internal_error', 'Something failed.'),
    )
    show()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('FR-004-15: explanations query key includes the case ID', () => {
    expect(caseExplanationsKey(CASE_ID)).toContain(CASE_ID)
    expect(caseExplanationsKey(CASE_ID)).not.toEqual(caseExplanationsKey(OTHER_CASE_ID))
  })

  it('FR-004-12: shows fixed override line beside unchanged text when approved outcome differs from explanation result', async () => {
    respondWith([
      explanation({ result: 'ineligible', text: 'Ineligible: income is over the limit.' }),
    ])
    show(caseDetail({ state: 'decided', outcome: 'approved' }))

    expect(await screen.findByText('Ineligible: income is over the limit.')).toBeInTheDocument()
    expect(
      screen.getByText('A caseworker reviewed this decision and changed the outcome to Approved.'),
    ).toBeInTheDocument()
  })

  it('FR-004-12: shows no override line when approved outcome agrees with explanation', async () => {
    respondWith([explanation()])
    show(caseDetail({ state: 'decided', outcome: 'approved' }))

    await screen.findByText(/income 1000.00 is under the limit/)
    expect(screen.queryByText(/changed the outcome/)).not.toBeInTheDocument()
  })

  it('FR-004-12: shows fixed override line when approved outcome follows a cannot_determine explanation', async () => {
    respondWith([
      explanation({ result: 'cannot_determine', text: 'Cannot determine: income is missing.' }),
    ])
    show(caseDetail({ state: 'decided', outcome: 'approved' }))

    expect(await screen.findByText('Cannot determine: income is missing.')).toBeInTheDocument()
    expect(
      screen.getByText('A caseworker reviewed this decision and changed the outcome to Approved.'),
    ).toBeInTheDocument()
  })
})
