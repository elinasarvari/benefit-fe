import { describe, expect, it } from 'vitest'
import {
  emptyForm,
  emptyJob,
  emptyMember,
  emptyStub,
  validateForm,
  type FormValues,
  type MemberValues,
  type StubValues,
} from './validation'

function member(overrides: Partial<MemberValues> = {}): MemberValues {
  return {
    ...emptyMember('self'),
    full_name: 'Synthetic Person',
    date_of_birth: '1980-01-01',
    citizenship_status: 'us_citizen',
    zero_income: true,
    ...overrides,
  }
}

function validForm(overrides: Partial<FormValues> = {}): FormValues {
  return {
    members: [member()],
    address: { line1: '1 Test St', line2: '', city: 'Springfield', postal_code: '62701' },
    ...overrides,
  }
}

describe('application form validation', () => {
  it('accepts a complete form', () => {
    expect(validateForm(validForm())).toEqual({})
  })

  it('FR-001-24: requires exactly one self member and at most ten members', () => {
    const none = validForm({ members: [member({ relationship: 'spouse' })] })
    const two = validForm({ members: [member(), member()] })
    const eleven = validForm({
      members: [member(), ...Array.from({ length: 10 }, () => member({ relationship: 'child' }))],
    })

    expect(validateForm(none).members).toMatch(/exactly one/i)
    expect(validateForm(two).members).toMatch(/exactly one/i)
    expect(validateForm(eleven).members).toMatch(/1 to 10/)
    expect(validateForm(validForm()).members).toBeUndefined()
  })

  it('FR-001-24: requires zero income or at least one job for each member', () => {
    const job = {
      employer: 'Acme',
      pay_frequency: 'monthly' as const,
      declared_monthly_gross: '10',
      stub: null,
    }
    const neither = validForm({ members: [member({ zero_income: false, jobs: [] })] })
    const both = validForm({ members: [member({ zero_income: true, jobs: [job] })] })
    const six = validForm({
      members: [member({ zero_income: false, jobs: Array.from({ length: 6 }, () => job) })],
    })
    const onlyJobs = validForm({ members: [member({ zero_income: false, jobs: [job] })] })

    expect(validateForm(neither)['members.0.jobs']).toBeDefined()
    expect(validateForm(both)['members.0.jobs']).toBeDefined()
    expect(validateForm(six)['members.0.jobs']).toMatch(/at most 5/)
    expect(validateForm(onlyJobs)).toEqual({})
  })

  it('FR-001-24: rejects a non five-digit ZIP and a negative or three-decimal income', () => {
    const base = emptyForm()
    const withZip = (postal_code: string) =>
      validForm({ address: { ...validForm().address, postal_code } })
    const withIncome = (declared_monthly_gross: string) =>
      validForm({
        members: [
          member({
            zero_income: false,
            jobs: [
              { ...emptyJob(), employer: 'Acme', pay_frequency: 'weekly', declared_monthly_gross },
            ],
          }),
        ],
      })

    expect(base.members).toHaveLength(1)
    expect(validateForm(withZip('6060'))['address.postal_code']).toBeDefined()
    expect(validateForm(withZip('60601-1234'))['address.postal_code']).toBeDefined()
    expect(validateForm(withZip('62701'))['address.postal_code']).toBeUndefined()
    expect(validateForm(withIncome('-1'))['members.0.jobs.0.declared_monthly_gross']).toBeDefined()
    expect(
      validateForm(withIncome('10.005'))['members.0.jobs.0.declared_monthly_gross'],
    ).toBeDefined()
    expect(validateForm(withIncome('10.50'))).toEqual({})
  })

  it('FR-001-24: a date of birth today or later is refused', () => {
    const future = validForm({ members: [member({ date_of_birth: '2999-01-01' })] })

    expect(validateForm(future)['members.0.date_of_birth']).toMatch(/past/)
  })

  it('FR-002-21: every stub detail is checked, and a complete stub passes', () => {
    const job = { ...emptyJob(), employer: 'Acme', pay_frequency: 'weekly' as const }
    const file = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' })
    const complete = {
      ...emptyStub(),
      file,
      employee_name: 'Synthetic Person',
      frequency: 'weekly' as const,
      gross_pay: '300.00',
      pay_date: '2026-03-01',
    }
    const form = (stub: StubValues): FormValues =>
      validForm({
        members: [
          member({
            zero_income: false,
            jobs: [{ ...job, declared_monthly_gross: '1300.00', stub }],
          }),
        ],
      })

    expect(validateForm(form(complete))).toEqual({})
    const fields = ['employee_name', 'frequency', 'gross_pay', 'pay_date'] as const
    for (const field of fields) {
      const blank = { ...complete, [field]: '' }
      expect(Object.keys(validateForm(form(blank)))).toEqual([`members.0.jobs.0.stub.${field}`])
    }
    expect(Object.keys(validateForm(form({ ...complete, file: null })))).toEqual([
      'members.0.jobs.0.stub.file',
    ])
    expect(validateForm(form({ ...complete, gross_pay: '0' }))).toHaveProperty([
      'members.0.jobs.0.stub.gross_pay',
    ])
  })
})
