import type { components } from '@/api/generated/schema'
import { jsonResponse } from './fakeApi'

type Schemas = components['schemas']

export const CASE_ID = '11111111-2222-4333-8444-555555555555'
export const OTHER_CASE_ID = '99999999-2222-4333-8444-555555555555'
export const TASK_ID = 'aaaaaaaa-2222-4333-8444-555555555555'

export function caseDetail(overrides: Partial<Schemas['CaseDetail']> = {}): Schemas['CaseDetail'] {
  return {
    case_id: CASE_ID,
    state: 'verifying',
    received_on: '2026-03-17',
    decision_deadline: '2026-05-01',
    days_remaining: 20,
    at_risk: false,
    outcome: null,
    denial_reason: null,
    open_review_task: null,
    case_type: 'application',
    coverage_period: null,
    override: null,
    demo_clock: false,
    ...overrides,
  }
}

export function caseSummary(
  overrides: Partial<Schemas['CaseSummary']> = {},
): Schemas['CaseSummary'] {
  return {
    case_id: CASE_ID,
    case_type: 'application',
    state: 'verifying',
    received_on: '2026-03-17',
    decision_deadline: '2026-05-01',
    days_remaining: 20,
    at_risk: false,
    outcome: null,
    ...overrides,
  }
}

export function caseStatus(overrides: Partial<Schemas['CaseStatus']> = {}): Schemas['CaseStatus'] {
  const detail = caseDetail()
  return {
    case_id: detail.case_id,
    state: 'submitted',
    received_on: detail.received_on,
    decision_deadline: detail.decision_deadline,
    days_remaining: detail.days_remaining,
    at_risk: detail.at_risk,
    outcome: null,
    denial_reason: null,
    open_review_task: null,
    ...overrides,
  }
}

export function historyEntry(
  overrides: Partial<Schemas['CaseHistoryEntry']> = {},
): Schemas['CaseHistoryEntry'] {
  return {
    seq: 1,
    kind: 'state_changed',
    from_state: null,
    to_state: 'submitted',
    case_time: '2026-03-17T15:00:00Z',
    real_time: '2026-03-17T15:00:00Z',
    actor: 'System',
    actor_type: 'system',
    reason_code: 'application_received',
    ...overrides,
  }
}

export const casePage = (items: Schemas['CaseSummary'][], nextCursor: string | null = null) =>
  jsonResponse({ items, next_cursor: nextCursor })
