import type { components } from '@/api/generated/schema'
import { CASE_ID, TASK_ID, caseDetail } from './caseFixtures'

type Schemas = components['schemas']

export const DOCUMENT_ID = 'cccccccc-2222-4333-8444-555555555555'
export const FINDING_ID = 'dddddddd-2222-4333-8444-555555555555'
export const VERIFICATION_URL = `/api/v1/cases/${CASE_ID}/verification`
export const ACTION_URL = `/api/v1/cases/${CASE_ID}/review-tasks/${TASK_ID}/actions`

export function documentView(
  overrides: Partial<Schemas['DocumentView']> = {},
): Schemas['DocumentView'] {
  return {
    document_id: DOCUMENT_ID,
    content_type: 'application/pdf',
    uploaded_at: '2026-03-17T15:00:00Z',
    details: {
      document_id: DOCUMENT_ID,
      case_id: CASE_ID,
      household_id: '5b1c7e2d-3f40-4a8b-9c6d-1e2f3a4b5c6d',
      member_id: null,
      employee_name: 'Synthetic Person',
      employer: 'Synthetic Employer',
      frequency: 'weekly',
      gross_pay: '400.00',
      pay_date: '2026-03-01',
      corrections: [],
    },
    ...overrides,
  }
}

export function finding(overrides: Partial<Schemas['Finding']> = {}): Schemas['Finding'] {
  return {
    finding_id: FINDING_ID,
    cause: 'income_mismatch',
    document_id: DOCUMENT_ID,
    declared_monthly: '1300.00',
    documented_monthly: '1733.33',
    conversion: 'weekly 400.00 x 52 / 12 = 1733.33',
    ...overrides,
  }
}

export function verification(
  overrides: Partial<Schemas['CaseVerification']> = {},
): Schemas['CaseVerification'] {
  return {
    documents: [documentView()],
    result: { complete: true, needs_review: true, findings: [finding()], missing_items: [] },
    ...overrides,
  }
}

// A case with an open verification review task that offers the two 002 actions.
export function reviewCase(): Schemas['CaseDetail'] {
  return caseDetail({
    state: 'under_review',
    open_review_task: {
      task_id: TASK_ID,
      reason: 'verification_review',
      allowed_actions: ['accept_findings', 'correct_value', 'dismiss_finding'],
    },
  })
}
