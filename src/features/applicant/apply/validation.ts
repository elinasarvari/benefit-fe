import type { components } from '@/api/generated/schema'

type Schemas = components['schemas']

export type Relationship = Schemas['ApplicantMember']['relationship']
export type CitizenshipStatus = Schemas['ApplicantMember']['citizenship_status']
export type PayFrequency = Schemas['Job']['pay_frequency']

export const RELATIONSHIPS: readonly { value: Relationship; label: string }[] = [
  { value: 'self', label: 'Myself' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'partner', label: 'Partner' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other_relative', label: 'Other relative' },
  { value: 'other', label: 'Other' },
]

export const CITIZENSHIP: readonly { value: CitizenshipStatus; label: string }[] = [
  { value: 'us_citizen', label: 'U.S. citizen' },
  { value: 'qualifying_immigrant', label: 'Qualifying immigrant' },
  { value: 'neither', label: 'Neither' },
]

export const PAY_FREQUENCIES: readonly { value: PayFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Monthly' },
]

export const MAX_MEMBERS = 10
export const MAX_JOBS = 5

export interface JobValues {
  employer: string
  pay_frequency: PayFrequency | ''
  declared_monthly_gross: string
}

export interface MemberValues {
  full_name: string
  date_of_birth: string
  relationship: Relationship | ''
  citizenship_status: CitizenshipStatus | ''
  medicare_entitled: boolean
  zero_income: boolean
  jobs: JobValues[]
}

export interface FormValues {
  members: MemberValues[]
  address: { line1: string; line2: string; city: string; postal_code: string }
}

// Error messages keyed by dotted path: `members.1.date_of_birth`, `address.postal_code`, `members`.
export type FormErrors = Record<string, string>

export function emptyJob(): JobValues {
  return { employer: '', pay_frequency: '', declared_monthly_gross: '' }
}

export function emptyMember(relationship: Relationship | '' = ''): MemberValues {
  return {
    full_name: '',
    date_of_birth: '',
    relationship,
    citizenship_status: '',
    medicare_entitled: false,
    zero_income: false,
    jobs: [],
  }
}

export function emptyForm(): FormValues {
  return {
    members: [emptyMember('self')],
    address: { line1: '', line2: '', city: '', postal_code: '' },
  }
}

const POSTAL_CODE = /^\d{5}$/
const MONEY = /^\d{1,7}(\.\d{1,2})?$/

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function validateJob(job: JobValues, prefix: string, label: string, errors: FormErrors): void {
  const employer = job.employer.trim()
  if (employer.length === 0 || employer.length > 100) {
    errors[`${prefix}.employer`] = `${label} employer is required (1 to 100 characters).`
  }
  if (job.pay_frequency === '') {
    errors[`${prefix}.pay_frequency`] = `${label} pay frequency is required.`
  }
  if (!MONEY.test(job.declared_monthly_gross.trim())) {
    errors[`${prefix}.declared_monthly_gross`] =
      `${label} monthly gross income must be zero or more, with at most two decimals.`
  }
}

function validateMember(member: MemberValues, index: number, errors: FormErrors): void {
  const prefix = `members.${String(index)}`
  const label = `Member ${String(index + 1)}`
  const name = member.full_name.trim()
  if (name.length === 0 || name.length > 100) {
    errors[`${prefix}.full_name`] = `${label} full name is required (1 to 100 characters).`
  }
  if (member.date_of_birth === '') {
    errors[`${prefix}.date_of_birth`] = `${label} date of birth is required.`
  } else if (member.date_of_birth >= todayIso()) {
    errors[`${prefix}.date_of_birth`] = `${label} date of birth must be in the past.`
  }
  if (member.relationship === '') {
    errors[`${prefix}.relationship`] = `${label} relationship is required.`
  }
  if (member.citizenship_status === '') {
    errors[`${prefix}.citizenship_status`] = `${label} citizenship status is required.`
  }
  if (member.zero_income && member.jobs.length > 0) {
    errors[`${prefix}.jobs`] = `${label}: remove the jobs or clear "no income".`
  } else if (!member.zero_income && member.jobs.length === 0) {
    errors[`${prefix}.jobs`] = `${label}: say there is no income or add at least one job.`
  } else if (member.jobs.length > MAX_JOBS) {
    errors[`${prefix}.jobs`] = `${label} can have at most ${String(MAX_JOBS)} jobs.`
  }
  member.jobs.forEach((job, jobIndex) => {
    validateJob(
      job,
      `${prefix}.jobs.${String(jobIndex)}`,
      `${label} job ${String(jobIndex + 1)}`,
      errors,
    )
  })
}

export function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {}
  const selfCount = values.members.filter((member) => member.relationship === 'self').length
  if (values.members.length < 1 || values.members.length > MAX_MEMBERS) {
    errors.members = `The household needs 1 to ${String(MAX_MEMBERS)} members.`
  } else if (selfCount !== 1) {
    errors.members = 'Exactly one member must be you (relationship "Myself").'
  }
  values.members.forEach((member, index) => {
    validateMember(member, index, errors)
  })
  const { address } = values
  const line1 = address.line1.trim()
  const city = address.city.trim()
  if (line1.length === 0 || line1.length > 100) {
    errors['address.line1'] = 'Street address is required (1 to 100 characters).'
  }
  if (address.line2.trim().length > 100) {
    errors['address.line2'] = 'Apartment or unit must be at most 100 characters.'
  }
  if (city.length === 0 || city.length > 60) {
    errors['address.city'] = 'City is required (1 to 60 characters).'
  }
  if (!POSTAL_CODE.test(address.postal_code.trim())) {
    errors['address.postal_code'] = 'ZIP code must be exactly five digits.'
  }
  return errors
}

// Only call with values that passed `validateForm`: the empty-string options are gone by then.
export function toApplicationForm(values: FormValues): Schemas['ApplicationForm'] {
  const line2 = values.address.line2.trim()
  return {
    members: values.members.map((member) => ({
      full_name: member.full_name.trim(),
      date_of_birth: member.date_of_birth,
      relationship: member.relationship as Relationship,
      citizenship_status: member.citizenship_status as CitizenshipStatus,
      medicare_entitled: member.medicare_entitled,
      zero_income: member.zero_income,
      jobs: member.jobs.map((job) => ({
        employer: job.employer.trim(),
        pay_frequency: job.pay_frequency as PayFrequency,
        declared_monthly_gross: job.declared_monthly_gross.trim(),
      })),
    })),
    address: {
      line1: values.address.line1.trim(),
      ...(line2 ? { line2 } : {}),
      city: values.address.city.trim(),
      state: 'IL',
      postal_code: values.address.postal_code.trim(),
    },
  }
}
