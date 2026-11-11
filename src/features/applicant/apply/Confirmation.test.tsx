import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { caseStatus } from '@/test/caseFixtures'
import { Confirmation } from './Confirmation'

describe('Confirmation', () => {
  it('FR-001-24: confirmation shows the case reference and decision deadline', () => {
    render(
      <MemoryRouter>
        <Confirmation status={caseStatus({ decision_deadline: '2026-05-01' })} />
      </MemoryRouter>,
    )

    expect(screen.getByText('11111111-2222-4333-8444-555555555555')).toBeInTheDocument()
    expect(screen.getByText('May 1, 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view your case/i })).toHaveAttribute(
      'href',
      '/applicant/cases/11111111-2222-4333-8444-555555555555',
    )
  })
})
