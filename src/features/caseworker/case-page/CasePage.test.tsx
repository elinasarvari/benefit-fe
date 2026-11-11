import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/api/queryClient'
import { CASE_ID, caseDetail } from '@/test/caseFixtures'
import { jsonResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'
import { CasePage } from './CasePage'
import { StatusSection } from './StatusSection'

function Boom(): never {
  throw new Error('boom')
}

describe('CasePage', () => {
  it('FR-001-27: a failing section does not blank the case page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () => jsonResponse(caseDetail()))
    const router = createMemoryRouter(
      [
        {
          path: 'caseworker/cases/:caseId',
          element: (
            <CasePage
              sections={[
                { id: 'status', title: 'Status', Component: StatusSection },
                { id: 'history', title: 'History', Component: Boom },
              ]}
            />
          ),
        },
      ],
      { initialEntries: [`/caseworker/cases/${CASE_ID}`] },
    )
    render(
      <QueryClientProvider client={createQueryClient({ navigate: vi.fn() })}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    const status = await screen.findByRole('region', { name: 'Status' })
    expect(within(status).getByText('Verifying documents')).toBeVisible()
    const history = screen.getByRole('region', { name: 'History' })
    expect(within(history).getByRole('alert')).toHaveTextContent(/could not be shown/i)
  })

  it('FR-001-27: the case page renders each section in its own labelled region', async () => {
    signedInAs('caseworker')
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () => jsonResponse(caseDetail()))
    respondTo(`GET /api/v1/cases/${CASE_ID}/history`, () =>
      jsonResponse({ items: [], next_cursor: null }),
    )

    renderApp(`/caseworker/cases/${CASE_ID}`)

    expect(await screen.findByRole('region', { name: 'Status' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'History' })).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Review task' })).not.toBeInTheDocument()
  })
})
