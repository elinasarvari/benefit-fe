import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { caseDetail } from '@/test/caseFixtures'
import { StatusSection } from './StatusSection'

describe('StatusSection', () => {
  it('FR-001-27: status section shows state, dates, outcome, coverage period and override', () => {
    render(
      <StatusSection
        detail={caseDetail({
          state: 'decided',
          outcome: 'approved',
          days_remaining: null,
          coverage_period: { start_date: '2026-03-01', end_date: '2027-02-28', status: 'active' },
          override: {
            reviewer_name: 'Synthetic caseworker 1',
            reason: 'Documents verified by phone',
            decided_on: '2026-03-20',
          },
        })}
      />,
    )

    expect(screen.getByText('Decided')).toBeVisible()
    expect(screen.getByText('Mar 17, 2026')).toBeVisible()
    expect(screen.getByText('May 1, 2026')).toBeVisible()
    expect(screen.getByText('Approved')).toBeVisible()
    expect(screen.getByText(/Mar 1, 2026 to Feb 28, 2027/)).toBeVisible()
    expect(screen.getByText(/Approved by Synthetic caseworker 1 on Mar 20, 2026/)).toBeVisible()
    expect(screen.getByText(/Documents verified by phone/)).toBeVisible()
    expect(screen.queryByText('Days remaining')).not.toBeInTheDocument()
  })

  it('FR-001-27: an undecided case hides the outcome and shows days remaining with the at-risk badge', () => {
    render(<StatusSection detail={caseDetail({ days_remaining: 9, at_risk: true })} />)

    expect(screen.queryByText('Outcome')).not.toBeInTheDocument()
    expect(screen.queryByText('Coverage period')).not.toBeInTheDocument()
    expect(screen.getByText('Days remaining')).toBeVisible()
    expect(screen.getByText('At risk')).toBeVisible()
  })
})
