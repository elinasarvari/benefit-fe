import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { components } from '@/api/generated/schema'
import { CASE_ID, OTHER_CASE_ID, caseDetail, caseSummary } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

type Household = components['schemas']['HouseholdView']

const HOUSEHOLD_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const PERIOD_ID = '0b1c2d3e-4f50-4a61-8b72-93a4b5c6d7e8'
const householdPath = `/api/v1/households/${HOUSEHOLD_ID}`

const PERIOD: Household['coverage_periods'][number] = {
  coverage_period_id: PERIOD_ID,
  start_date: '2025-07-01',
  end_date: '2026-06-30',
  status: 'active',
  running_redetermination_case_id: null,
}

function household(overrides: Partial<Household> = {}): Household {
  return {
    household_id: HOUSEHOLD_ID,
    members: [
      {
        member_id: 'c1c1c1c1-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        full_name: 'SYNTH-NAME Ada',
        date_of_birth: '1985-06-15',
        relationship: 'self',
      },
    ],
    coverage_periods: [PERIOD],
    cases: [],
    ...overrides,
  }
}

function openHousehold(body: () => Response = () => jsonResponse(household())) {
  signedInAs('caseworker')
  respondTo(`GET ${householdPath}`, body)
  return renderApp(`/caseworker/households/${HOUSEHOLD_ID}`)
}

describe('HouseholdPage', () => {
  it('FR-007-18: shows members, coverage periods and cases when the household loads', async () => {
    openHousehold(() =>
      jsonResponse(
        household({
          cases: [
            caseSummary({ case_id: OTHER_CASE_ID, case_type: 'redetermination', state: 'decided' }),
          ],
        }),
      ),
    )

    expect(await screen.findByText(/SYNTH-NAME Ada/)).toBeVisible()
    const periods = screen.getByRole('region', { name: 'Coverage periods' })
    expect(within(periods).getByText(/Active/)).toBeVisible()
    expect(within(periods).getByText(/Jul 1, 2025|2025/)).toBeVisible()
    const cases = screen.getByRole('region', { name: 'Cases' })
    expect(within(cases).getByRole('link', { name: OTHER_CASE_ID })).toHaveAttribute(
      'href',
      `/caseworker/cases/${OTHER_CASE_ID}`,
    )
  })

  it('FR-007-18: shows loading, empty and error states when the household query is pending, empty or fails', async () => {
    signedInAs('caseworker')
    respondTo(`GET ${householdPath}`, () => new Promise<Response>(() => undefined))
    const pending = renderApp(`/caseworker/households/${HOUSEHOLD_ID}`)
    expect(await screen.findByText('Loading household…')).toBeVisible()
    pending.unmount()

    openHousehold(() => jsonResponse(household({ coverage_periods: [], cases: [] })))
    expect(await screen.findByText('No coverage periods.')).toBeVisible()
    expect(screen.getByText('No cases yet.')).toBeVisible()
  })

  it('FR-007-18: shows an error state when the household query fails', async () => {
    openHousehold(() => errorResponse(500, 'internal_error', 'Something went wrong on our side.'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
  })

  it('FR-007-18: links to the running redetermination when one exists for the period', async () => {
    openHousehold(() =>
      jsonResponse(
        household({
          coverage_periods: [{ ...PERIOD, running_redetermination_case_id: CASE_ID }],
          cases: [caseSummary({ case_type: 'redetermination' })],
        }),
      ),
    )

    const periods = await screen.findByRole('region', { name: 'Coverage periods' })

    expect(
      within(periods).getByRole('link', { name: 'Open the redetermination case' }),
    ).toHaveAttribute('href', `/caseworker/cases/${CASE_ID}`)
    expect(
      within(periods).queryByRole('button', { name: 'Start redetermination' }),
    ).not.toBeInTheDocument()
  })

  it('FR-007-18: links to the open case when the start is refused', async () => {
    const user = userEvent.setup()
    openHousehold()
    respondTo(`POST ${householdPath}/redeterminations`, () =>
      jsonResponse(
        {
          error: {
            code: 'conflict',
            message: 'This household already has an open case.',
            fields: [
              {
                field: 'coverage_period_id',
                message: 'This household already has an open case.',
                type: 'household_has_open_case',
              },
            ],
            reference_id: '3f0c2a9e-4b1d-4e55-9a51-7f2f8f5f1c11',
            related_case_id: OTHER_CASE_ID,
          },
        },
        409,
      ),
    )

    await user.click(await screen.findByRole('button', { name: 'Start redetermination' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Another case is open')
    expect(within(alert).getByRole('link', { name: 'Open the case' })).toHaveAttribute(
      'href',
      `/caseworker/cases/${OTHER_CASE_ID}`,
    )
  })

  it('FR-007-10: start button navigates to the new case when pressed', async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []
    signedInAs('caseworker')
    respondTo(`GET ${householdPath}`, () => jsonResponse(household()))
    respondTo(`POST ${householdPath}/redeterminations`, async (request) => {
      bodies.push(await request.json())
      return jsonResponse({ case_id: CASE_ID, created: true }, 201)
    })
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () => jsonResponse(caseDetail()))
    respondTo(`GET /api/v1/cases/${CASE_ID}/history`, () =>
      jsonResponse({ items: [], next_cursor: null }),
    )
    const { router } = renderApp(`/caseworker/households/${HOUSEHOLD_ID}`)

    await user.click(await screen.findByRole('button', { name: 'Start redetermination' }))

    expect(bodies).toEqual([{ coverage_period_id: PERIOD_ID }])
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/caseworker/cases/${CASE_ID}`)
    })
  })
})
