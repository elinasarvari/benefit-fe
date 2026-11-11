import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CASE_ID, OTHER_CASE_ID } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

function explanation(text: string, result = 'eligible') {
  return {
    determination_id: '44444444-2222-4333-8444-555555555555',
    case_id: CASE_ID,
    household_id: '55555555-2222-4333-8444-555555555555',
    audience: 'applicant',
    result,
    text,
    citations: [],
    built_at: '2026-03-20T09:00:00Z',
  }
}

function entry(overrides: Record<string, unknown> = {}) {
  return {
    case_id: CASE_ID,
    case_type: 'application',
    outcome: 'approved',
    decided_on: '2026-03-20',
    coverage_start: '2026-03-20',
    coverage_end: '2027-03-20',
    explanation: explanation('Your household income is under the limit.'),
    ...overrides,
  }
}

function respondWith(items: unknown[]) {
  respondTo('GET /api/v1/me/history', () => jsonResponse({ items }))
}

describe('HistoryPage', () => {
  it('FR-004-16: history page lists each coverage period with decision and applicant explanation', async () => {
    signedInAs('applicant')
    respondWith([
      entry(),
      entry({
        case_id: OTHER_CASE_ID,
        outcome: 'denied',
        coverage_start: null,
        coverage_end: null,
        explanation: explanation('Your household income is over the limit.', 'ineligible'),
      }),
    ])

    renderApp('/applicant/history')

    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Mar 20, 2026 to Mar 20, 2027')
    expect(items[0]).toHaveTextContent('Approved')
    expect(items[0]).toHaveTextContent('Your household income is under the limit.')
    expect(items[1]).toHaveTextContent('Denied')
    expect(items[1]).toHaveTextContent('Your household income is over the limit.')
  })

  it('FR-004-16: history page shows loading, empty and error states', async () => {
    signedInAs('applicant')
    respondTo('GET /api/v1/me/history', () => new Promise<Response>(() => undefined))
    const loading = renderApp('/applicant/history')
    expect(await screen.findByText('Loading your decision history…')).toBeInTheDocument()
    loading.unmount()

    respondWith([])
    const empty = renderApp('/applicant/history')
    expect(await screen.findByText('No decisions to show yet.')).toBeInTheDocument()
    empty.unmount()

    respondTo('GET /api/v1/me/history', () =>
      errorResponse(500, 'internal_error', 'Something failed.'),
    )
    renderApp('/applicant/history')
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('FR-004-16: history entry without explanation shows decision only', async () => {
    signedInAs('applicant')
    respondWith([entry({ explanation: null, outcome: 'denied' })])

    renderApp('/applicant/history')

    const [item] = await screen.findAllByRole('listitem')
    expect(item).toHaveTextContent('Denied')
    expect(item).not.toHaveTextContent('income')
  })

  it('FR-004-12: shows fixed override line beside unchanged text when approved outcome differs from explanation result', async () => {
    signedInAs('applicant')
    respondWith([
      entry({ explanation: explanation('Your household income is over the limit.', 'ineligible') }),
    ])

    renderApp('/applicant/history')

    expect(await screen.findByText('Your household income is over the limit.')).toBeInTheDocument()
    expect(
      screen.getByText('A caseworker reviewed this decision and changed the outcome to Approved.'),
    ).toBeInTheDocument()
  })

  it('FR-004-12: shows no override line when approved outcome agrees with explanation', async () => {
    signedInAs('applicant')
    respondWith([entry()])

    renderApp('/applicant/history')

    await screen.findByText('Your household income is under the limit.')
    expect(screen.queryByText(/changed the outcome/)).not.toBeInTheDocument()
  })
})
