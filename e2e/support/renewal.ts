import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type APIRequestContext, expect } from '@playwright/test'

// Households E (renewal-automatic) and F (renewal-one-document) are seeded by benefit-be
// (`make reset`). Their IDs come from the environment, or from the seed test set that lists the
// periods due for a redetermination.

interface DueItem {
  household_id: string
  coverage_period_id: string
  expected_path: 'renew_automatically' | 'ask_applicant'
}

export interface CoveragePeriod {
  coverage_period_id: string
  start_date: string
  end_date: string
  status: string
  running_redetermination_case_id: string | null
}

export interface Household {
  household_id: string
  coverage_periods: CoveragePeriod[]
  cases: { case_id: string }[]
}

export interface CaseDetail {
  state: string
  outcome: string | null
  open_review_task: { task_id: string; allowed_actions: string[]; reason: string } | null
  pending_timer: { name: string; due_case_time: string } | null
}

function dueItems(): DueItem[] {
  const path =
    process.env.E2E_REDETERMINATIONS_DUE ??
    resolve('..', 'benefit-be', 'db', 'seeds', 'generated', 'testsets', 'redeterminations_due.json')
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { items?: DueItem[] } | DueItem[]
  return Array.isArray(parsed) ? parsed : (parsed.items ?? [])
}

export function householdId(which: 'E' | 'F'): string {
  const configured = process.env[`E2E_HOUSEHOLD_${which}_ID`]
  if (configured) {
    return configured
  }
  const path = which === 'E' ? 'renew_automatically' : 'ask_applicant'
  const found = dueItems().find((item) => item.expected_path === path)
  if (!found) {
    throw new Error(`no seeded household ${which}: run \`make reset\` in benefit-be`)
  }
  return found.household_id
}

export async function getHousehold(api: APIRequestContext, id: string): Promise<Household> {
  const response = await api.get(`/api/v1/households/${id}`)
  expect(response.status()).toBe(200)
  return (await response.json()) as Household
}

export async function getCase(api: APIRequestContext, caseId: string): Promise<CaseDetail> {
  const response = await api.get(`/api/v1/cases/${caseId}`)
  expect(response.status()).toBe(200)
  return (await response.json()) as CaseDetail
}

export function activePeriod(household: Household): CoveragePeriod {
  const period = household.coverage_periods.find((p) => p.status === 'active')
  if (!period) {
    throw new Error('household has no active coverage period: run `make reset` in benefit-be')
  }
  return period
}
