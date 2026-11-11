import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/api/queryClient'
import {
  CASE_ID,
  MEMBER_ID,
  RULE_IDS,
  caseDetail,
  determinationView,
  ruleResult,
} from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo } from '@/test/fakeApi'
import { DeterminationSection } from './DeterminationSection'

function show() {
  return render(
    <QueryClientProvider client={createQueryClient({ navigate: () => undefined })}>
      <DeterminationSection detail={caseDetail({ state: 'under_review' })} />
    </QueryClientProvider>,
  )
}

function respondWith(items: unknown[]) {
  respondTo(`GET /api/v1/cases/${CASE_ID}/determinations`, () => jsonResponse({ items }))
}

describe('DeterminationSection', () => {
  it('FR-003-23: shows result, reason code, as-of date and rule set version when the case is determined', async () => {
    respondWith([
      determinationView({
        result: 'ineligible',
        reason_code: 'income_over_limit',
        as_of_date: '2026-03-17',
        rule_set_id: 'benefit-2026',
        rule_set_version: 2,
        recorded_at: '2026-03-20T09:00:00Z',
      }),
    ])
    show()

    expect(await screen.findByText('Ineligible')).toBeInTheDocument()
    expect(screen.getByText(/Income over the limit/)).toBeInTheDocument()
    expect(screen.getByText(/Mar 17, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/benefit-2026 v2/)).toBeInTheDocument()
  })

  it("FR-003-23: lists each rule's ID, inputs, threshold and outcome when the determination has six rules", async () => {
    respondWith([
      determinationView({
        rules: RULE_IDS.map((rule_id) =>
          rule_id === 'ELIG-06'
            ? ruleResult({
                rule_id,
                outcome: 'fail',
                inputs: { household_monthly_income: '4000.00', household_size: '3' },
                threshold: '3200.00',
              })
            : ruleResult({ rule_id }),
        ),
      }),
    ])
    show()

    const rows = await screen.findAllByRole('row')
    // header row plus six rules
    expect(rows).toHaveLength(7)
    for (const id of RULE_IDS) {
      expect(screen.getByRole('cell', { name: id })).toBeInTheDocument()
    }
    const failed = within(
      screen.getByRole('cell', { name: 'ELIG-06' }).closest('tr') as HTMLElement,
    )
    expect(failed.getByText('Fail')).toBeInTheDocument()
    expect(failed.getByText('3200.00')).toBeInTheDocument()
    expect(failed.getByText(/household_monthly_income: 4000.00/)).toBeInTheDocument()
    const passed = within(
      screen.getByRole('cell', { name: 'ELIG-01' }).closest('tr') as HTMLElement,
    )
    expect(passed.getByText('Pass')).toBeInTheDocument()
    expect(passed.getByText(new RegExp(`member_id: ${MEMBER_ID}`))).toBeInTheDocument()
  })

  it('FR-003-23: lists the missing items when the result is cannot determine', async () => {
    const missing = {
      item: 'pay_stub',
      member_id: MEMBER_ID,
      job_id: null,
      reason: 'No usable pay stub for a declared job',
    }
    respondWith([
      determinationView({
        result: 'cannot_determine',
        reason_code: null,
        household_monthly_income: null,
        missing_items: [missing],
        rules: RULE_IDS.map((rule_id) =>
          rule_id === 'ELIG-06'
            ? ruleResult({ rule_id, outcome: 'missing', threshold: '3200.00', missing: [missing] })
            : ruleResult({ rule_id }),
        ),
      }),
    ])
    show()

    expect(await screen.findByText('Cannot determine')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Missing items' })
    expect(within(list).getByText(/pay_stub/)).toBeInTheDocument()
    expect(within(list).getByText(/No usable pay stub for a declared job/)).toBeInTheDocument()
    expect(screen.queryByText(/Reason code/)).not.toBeInTheDocument()
  })

  it('FR-003-23: shows an empty state when the case has no determination', async () => {
    respondWith([])
    show()

    expect(await screen.findByText('No determination yet.')).toBeInTheDocument()
  })

  it('FR-003-23: shows the error state when the determinations request fails', async () => {
    respondTo(`GET /api/v1/cases/${CASE_ID}/determinations`, () =>
      errorResponse(404, 'not_found', 'Could not load the determinations.'),
    )
    show()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the determinations.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
