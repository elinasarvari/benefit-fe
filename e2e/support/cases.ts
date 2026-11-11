import {
  type APIRequestContext,
  expect,
  type Page,
  type PlaywrightWorkerArgs,
} from '@playwright/test'
import { type Role, storageStatePath } from '../env'

// The journeys share the seeded households (applicant1 approved, applicant2 denied after review,
// applicant3 cannot-determine), so run them against freshly seeded data: `make seed-reset` in benefit-be.

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export function validForm() {
  return {
    members: [
      {
        full_name: 'Synthetic Person',
        date_of_birth: '1980-01-01',
        relationship: 'self',
        citizenship_status: 'us_citizen',
        medicare_entitled: false,
        zero_income: true,
        jobs: [],
      },
    ],
    address: { line1: '1 Test Street', city: 'Springfield', state: 'IL', postal_code: '62701' },
  }
}

export async function apiAs(
  playwright: PlaywrightWorkerArgs['playwright'],
  role: Role,
): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL, storageState: storageStatePath(role) })
}

// Opens a case through the API unless the household already has one; returns its id either way.
export async function ensureOpenCase(api: APIRequestContext): Promise<string> {
  const existing = await openCaseIds(api)
  if (existing[0]) {
    return existing[0]
  }
  const response = await api.post('/api/v1/applications', {
    data: { submission_reference: crypto.randomUUID(), form: validForm() },
  })
  if (!response.ok()) {
    throw new Error(`could not open a case: ${String(response.status())}`)
  }
  return ((await response.json()) as { case_id: string }).case_id
}

// A case of the household: its open case, a new one, or, once it has coverage, the case the
// refusal links to (FR-001-25). For journeys that need a case, not an open one.
export async function ensureCase(api: APIRequestContext): Promise<string> {
  const existing = await openCaseIds(api)
  if (existing[0]) {
    return existing[0]
  }
  const response = await api.post('/api/v1/applications', {
    data: { submission_reference: crypto.randomUUID(), form: validForm() },
  })
  if (response.ok()) {
    return ((await response.json()) as { case_id: string }).case_id
  }
  const body = (await response.json()) as { error?: { related_case_id?: string | null } }
  const related = body.error?.related_case_id
  if (response.status() !== 409 || !related) {
    throw new Error(`could not find or open a case: ${String(response.status())}`)
  }
  return related
}

export async function openCaseIds(api: APIRequestContext): Promise<string[]> {
  const response = await api.get('/api/v1/cases')
  const body = (await response.json()) as { items: { case_id: string }[] }
  return body.items.map((item) => item.case_id)
}

// Waits for the workflow to reach a review task, which opens a moment after submission.
export async function waitForReviewTask(api: APIRequestContext, caseId: string): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await api.get(`/api/v1/cases/${caseId}`)
    const detail = (await response.json()) as { open_review_task: unknown }
    if (detail.open_review_task) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`case ${caseId} never reached a review task`)
}

// The case list pages by decision deadline, and 003 seeds ~120 decided history cases with earlier
// deadlines, so a new case is rarely on page one. Clicks "Load more" until the case's link shows
// or the list has no more pages; returns whether it was found. Safe to call inside `toPass`.
export async function revealInCaseList(page: Page, caseId: string): Promise<boolean> {
  const link = page.getByRole('link', { name: caseId })
  const more = page.getByRole('button', { name: 'Load more' })
  const loading = page.getByRole('button', { name: 'Loading…' })
  const rows = page.getByRole('row')
  await page.getByRole('table').or(page.getByText('No cases to show.')).first().waitFor()
  for (let pages = 0; pages < 100; pages += 1) {
    if (await link.isVisible()) {
      return true
    }
    if (await loading.isVisible()) {
      await loading.waitFor({ state: 'detached' })
      continue
    }
    if (!(await more.isVisible())) {
      return false
    }
    const shown = await rows.count()
    await more.click()
    // "Load more" always adds rows; wait for them rather than for the button, which is briefly
    // renamed "Loading…" and would otherwise read as "no more pages".
    await expect.poll(() => rows.count()).toBeGreaterThan(shown)
  }
  return false
}

export async function fillApplication(page: Page, postalCode = '62701'): Promise<void> {
  await page.getByLabel('Member 1 full name').fill('Synthetic Person')
  await page.getByLabel('Member 1 date of birth').fill('1980-01-01')
  await page.getByRole('radio', { name: 'U.S. citizen' }).click()
  await page.getByRole('checkbox', { name: 'Member 1 has no income' }).click()
  await page.getByLabel('Street address').fill('1 Test Street')
  await page.getByLabel('City').fill('Springfield')
  if (postalCode) {
    await page.getByLabel('ZIP code').fill(postalCode)
  }
}
