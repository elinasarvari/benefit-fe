import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fillValidApplication } from '@/test/applyForm'
import { ApplicationForm } from './ApplicationForm'
import {
  emptyForm,
  emptyJob,
  emptyMember,
  emptyStub,
  type FormValues,
  type JobValues,
  type StubUpload,
  type StubValues,
} from './validation'

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

const PDF_FILE = (): File =>
  new File(['%PDF-1.4 synthetic'], 'stub.pdf', { type: 'application/pdf' })

function stubbedJob(overrides: Partial<StubValues> = {}): JobValues {
  return {
    ...emptyJob(),
    employer: 'Synthetic Employer',
    pay_frequency: 'weekly',
    declared_monthly_gross: '1300.00',
    stub: {
      ...emptyStub(),
      file: PDF_FILE(),
      employee_name: 'Synthetic Person',
      frequency: 'weekly',
      gross_pay: '300.00',
      pay_date: '2026-03-01',
      ...overrides,
    },
  }
}

function formWithJobs(perMember: number, members = 1): FormValues {
  return {
    ...emptyForm(),
    members: Array.from({ length: members }, (_, index) => ({
      ...emptyMember(index === 0 ? 'self' : 'child'),
      full_name: `Synthetic Person ${String(index)}`,
      date_of_birth: '1980-01-01',
      citizenship_status: 'us_citizen' as const,
      jobs: Array.from({ length: perMember }, () => stubbedJob()),
    })),
    address: { line1: '1 Test Street', line2: '', city: 'Springfield', postal_code: '62701' },
  }
}

describe('ApplicationForm pay stubs', () => {
  it('FR-002-17: refuses a file over 10 MB, a wrong type and an 11th file with the allowed sizes and types and keeps the form', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup({ applyAccept: false })
    const initial = formWithJobs(1)
    initial.members[0]?.jobs.push({ ...emptyJob(), employer: 'Second Employer', stub: null })
    render(<Harness initial={initial} onSubmit={onSubmit} />)

    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', {
      type: 'application/pdf',
    })
    await user.upload(screen.getByLabelText('Member 1 job 1 pay stub file'), big)
    expect(await screen.findByText(/big\.pdf is larger than 10 MB/)).toBeVisible()
    expect(screen.getByLabelText('Member 1 job 1 pay stub file')).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    const exe = new File(['MZ'], 'run.exe', { type: 'application/x-msdownload' })
    await user.upload(screen.getByLabelText('Member 1 job 1 pay stub file'), exe)
    expect(await screen.findByText(/run\.exe is not a PDF, PNG or JPEG/)).toBeVisible()
    expect(
      screen.getAllByText(/PDF, PNG or JPEG, up to 10 MB each, at most 10 per case/).length,
    ).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /send application/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Member 1 job 1 pay stub employee name')).toHaveValue(
      'Synthetic Person',
    )
    expect(screen.getByLabelText('Member 1 job 1 employer')).toHaveValue('Synthetic Employer')
    expect(screen.getByLabelText('Street address')).toHaveValue('1 Test Street')
  })

  it('FR-002-17: an 11th pay stub is refused and the form is kept', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial={formWithJobs(4, 3)} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Too many pay stubs: 12 attached/)).toBeVisible()
    expect(screen.getByLabelText('Street address')).toHaveValue('1 Test Street')
  })

  it('FR-002-21: names each missing stub detail and blocks submit without losing input', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    const initial = formWithJobs(1)
    const job = initial.members[0]?.jobs[0]
    if (job) {
      job.stub = {
        ...emptyStub(),
        file: null,
        employee_name: '',
        frequency: '',
        gross_pay: '',
        pay_date: '',
      }
    }
    render(<Harness initial={initial} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Member 1 job 1 pay stub employee name'), 'Typed Name')

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    for (const message of [
      /pay stub file is required/,
      /pay stub pay frequency is required/,
      /pay stub gross pay is required/,
      /pay stub pay date is required/,
    ]) {
      expect(screen.getAllByText(message).length).toBeGreaterThan(0)
    }
    expect(screen.queryByText(/employee name is required/)).toBeNull() // typed, so not missing
    expect(screen.getByLabelText('Member 1 job 1 pay stub employee name')).toHaveValue('Typed Name')
    expect(screen.getByLabelText('Member 1 job 1 pay stub gross pay (USD)')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('FR-002-21: the stub employer is the job employer, read-only', () => {
    render(<Harness initial={formWithJobs(1)} onSubmit={vi.fn()} />)

    const employer = screen.getByLabelText('Member 1 job 1 pay stub employer')

    expect(employer).toHaveValue('Synthetic Employer')
    expect(employer).toHaveAttribute('readonly')
  })

  it('FR-002-17: a valid stub is passed to submit with its file and typed details', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial={formWithJobs(1)} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const stubs = onSubmit.mock.calls[0]?.[1] as StubUpload[]
    expect(stubs).toHaveLength(1)
    expect(stubs[0]?.body).toMatchObject({
      employee_name: 'Synthetic Person',
      employer: 'Synthetic Employer',
      frequency: 'weekly',
      gross_pay: '300.00',
      pay_date: '2026-03-01',
      content_type: 'application/pdf',
    })
  })
})
