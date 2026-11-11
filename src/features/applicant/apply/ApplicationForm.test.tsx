import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fillValidApplication } from '@/test/applyForm'
import { ApplicationForm } from './ApplicationForm'
import { emptyForm, emptyMember, type FormValues } from './validation'

function Harness({
  initial = emptyForm(),
  onSubmit,
}: {
  initial?: FormValues
  onSubmit: () => void
}) {
  const [values, setValues] = useState(initial)
  return (
    <ApplicationForm values={values} onChange={setValues} onSubmit={onSubmit} pending={false} />
  )
}

describe('ApplicationForm', () => {
  it('FR-001-24: names each missing field and sends nothing when the form is incomplete', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    const initial = {
      ...emptyForm(),
      members: [
        {
          ...emptyMember('self'),
          full_name: 'Synthetic Person',
          date_of_birth: '1980-01-01',
          citizenship_status: 'us_citizen' as const,
          zero_income: true,
        },
        {
          ...emptyMember('child'),
          full_name: 'Synthetic Child',
          citizenship_status: 'us_citizen' as const,
          zero_income: true,
        },
      ],
      address: { line1: '1 Test Street', line2: '', city: 'Springfield', postal_code: '' },
    }
    render(<Harness initial={initial} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /send application/i }))

    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('Member 2 date of birth is required.')
    expect(summary).toHaveTextContent('ZIP code must be exactly five digits.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('FR-001-24: sends the form once it is complete', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSubmit={onSubmit} />)

    await fillValidApplication(user)
    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('FR-001-24: every form field has an accessible label and linked error text', async () => {
    const user = userEvent.setup()
    render(<Harness onSubmit={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /add a household member/i }))
    await user.click(screen.getByRole('button', { name: /add a job for member 2/i }))

    for (const label of [
      'Member 1 full name',
      'Member 1 date of birth',
      'Member 1 relationship to you',
      'Member 1 is entitled to Medicare',
      'Member 1 has no income',
      'Member 2 job 1 employer',
      'Member 2 job 1 pay frequency',
      'Member 2 job 1 monthly gross income (USD)',
      'Street address',
      'Apartment or unit (optional)',
      'City',
      'ZIP code',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('radiogroup', { name: 'Member 1 citizenship status' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: /send application/i }))

    for (const label of ['Member 1 full name', 'Member 2 job 1 employer', 'ZIP code']) {
      const field = screen.getByLabelText(label)
      const describedBy = field.getAttribute('aria-describedby')
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(describedBy).toBeTruthy()
      expect(document.getElementById(describedBy ?? '')).toHaveTextContent(/.+/)
    }
  })
})
