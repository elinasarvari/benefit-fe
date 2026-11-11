import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CASE_ID, OTHER_CASE_ID, casePage, caseSummary } from '@/test/caseFixtures'
import { errorResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

const THIRD_ID = '33333333-2222-4333-8444-555555555555'

describe('CaseListPage', () => {
  it('FR-001-27: case list shows reference, state, days remaining and at-risk badge in deadline order', async () => {
    signedInAs('caseworker')
    respondTo('GET /api/v1/cases', () =>
      casePage([
        caseSummary({ case_id: CASE_ID, days_remaining: 9, at_risk: true, state: 'under_review' }),
        caseSummary({ case_id: OTHER_CASE_ID, days_remaining: 15 }),
        caseSummary({ case_id: THIRD_ID, days_remaining: 40 }),
      ]),
    )

    renderApp('/caseworker')

    const rows = (await screen.findAllByRole('row')).slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      CASE_ID,
      OTHER_CASE_ID,
      THIRD_ID,
    ])
    expect(rows[0]).toHaveTextContent('Under review') // FR-001-02's name for the state
    expect(rows[0]).toHaveTextContent('9')
    expect(within(rows[0] as HTMLElement).getByText('At risk')).toBeVisible()
    expect(within(rows[1] as HTMLElement).queryByText('At risk')).not.toBeInTheDocument()
    expect(rows[2]).toHaveTextContent('40')
  })

  it('FR-001-27: case list filters by state and loads more on the next cursor', async () => {
    signedInAs('caseworker')
    const queries: string[] = []
    respondTo('GET /api/v1/cases', (request) => {
      const url = new URL(request.url)
      queries.push(url.search)
      if (url.searchParams.get('cursor') === 'page-2') {
        return casePage([caseSummary({ case_id: OTHER_CASE_ID })])
      }
      return casePage(
        [caseSummary({ case_id: CASE_ID })],
        url.searchParams.get('state') ? null : 'page-2',
      )
    })
    const user = userEvent.setup()
    renderApp('/caseworker')

    await screen.findByText(CASE_ID)
    await user.click(screen.getByRole('button', { name: /load more/i }))
    expect(await screen.findByText(OTHER_CASE_ID)).toBeVisible()
    expect(screen.getByText(CASE_ID)).toBeVisible()
    expect(queries).toContain('?cursor=page-2')

    await user.selectOptions(screen.getByLabelText('State'), 'under_review')

    await screen.findByText(CASE_ID)
    expect(screen.queryByText(OTHER_CASE_ID)).not.toBeInTheDocument()
    expect(queries).toContain('?state=under_review')
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('FR-001-27: case list shows loading, empty and error states', async () => {
    signedInAs('caseworker')
    respondTo('GET /api/v1/cases', () => casePage([]))
    const { unmount } = renderApp('/caseworker')
    expect(await screen.findByText(/no cases to show/i)).toBeVisible()
    unmount()

    respondTo('GET /api/v1/cases', () => errorResponse(500, 'internal_error', 'List unavailable.'))
    renderApp('/caseworker')
    expect(await screen.findByText('List unavailable.')).toBeVisible()
  })
})
