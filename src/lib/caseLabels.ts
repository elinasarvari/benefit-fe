import type { components } from '@/api/generated/schema'

type Schemas = components['schemas']

export type CaseState = Schemas['CaseState']

const STATE_LABELS: Record<CaseState, string> = {
  submitted: 'Submitted',
  verifying: 'Verifying documents',
  awaiting_applicant: 'Waiting for the applicant',
  determining: 'Determining eligibility',
  under_review: 'Under review', // the state's name in FR-001-02
  decided: 'Decided',
}

export const CASE_STATES = Object.keys(STATE_LABELS) as CaseState[]

const OUTCOME_LABELS: Record<string, string> = { approved: 'Approved', denied: 'Denied' }

const DENIAL_LABELS: Record<string, string> = {
  income_over_limit: 'Income over the limit',
  other_rule_not_met: 'Another rule was not met',
  missing_information: 'Missing information',
}

const REFUSAL_LABELS: Record<string, string> = {
  household_has_open_case: 'Your household already has an open case.',
  household_has_coverage: 'Your household already has active coverage.',
  submission_reference_in_use: 'This application was already submitted with different details.',
}

const COVERAGE_LABELS: Record<string, string> = {
  active: 'Active',
  continued_pending_review: 'Continued pending review',
  renewed: 'Renewed',
  ended: 'Ended',
}

const ACTION_LABELS: Record<string, string> = {
  approve_denial: 'Approve the denial',
  override_to_approve: 'Override and approve',
}

const REVIEW_REASON_LABELS: Record<string, string> = {
  adverse_determination: 'The determination was adverse',
  cannot_determine: 'Eligibility could not be determined',
}

// Reason codes are enum-backed snake_case; an unknown one is still shown readably.
function humanise(code: string): string {
  const text = code.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function lookup(labels: Record<string, string>, code: string): string {
  return Object.hasOwn(labels, code) ? (labels[code] ?? humanise(code)) : humanise(code)
}

export const stateLabel = (state: CaseState): string => lookup(STATE_LABELS, state)
export const outcomeLabel = (outcome: string): string => lookup(OUTCOME_LABELS, outcome)
export const denialLabel = (reason: string): string => lookup(DENIAL_LABELS, reason)
export const refusalLabel = (reason: string): string => lookup(REFUSAL_LABELS, reason)
export const coverageLabel = (status: string): string => lookup(COVERAGE_LABELS, status)
export const actionLabel = (action: string): string => lookup(ACTION_LABELS, action)
export const reviewReasonLabel = (reason: string): string => lookup(REVIEW_REASON_LABELS, reason)
export const reasonCodeLabel = (code: string): string => humanise(code)
