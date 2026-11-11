import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { apiAs, ensureOpenCase, waitForReviewTask } from './support/cases'

// Runs last (the `<browser>` phase, playwright.config.ts) and in order: the supervisor's override
// approves applicant3's case, which the caseworker's no-reason test must still see under review.
test.describe.configure({ mode: 'serial' })

test.describe('caseworker', () => {
  test.use({ storageState: storageStatePath('caseworker') })
  // The TC-161 test reads the case the first test decides, so they run in order.
  test.describe.configure({ mode: 'serial' })

  test('FR-001-20: override to approve without a reason is refused and the case stays under review', async ({
    page,
    playwright,
  }) => {
    // applicant3's seeded stub result is cannot-determine, so the case waits under review.
    const api = await apiAs(playwright, 'applicant3')
    const caseId = await ensureOpenCase(api)
    await waitForReviewTask(api, caseId)
    await page.goto(`/caseworker/cases/${caseId}`)

    await page.getByRole('radio', { name: 'Override and approve' }).click()
    await page.getByRole('button', { name: /submit decision/i }).click()

    await expect(page.getByText('A reason is required to override.')).toBeVisible()
    const status = page.getByRole('region', { name: 'Status' })
    await expect(status).toContainText('Under review')
    await expect(page.getByRole('region', { name: 'Review task' })).toBeVisible()
  })

  test('FR-001-10: approving a denial adds a history entry with the caseworker and the reason', async ({
    page,
    playwright,
  }) => {
    // applicant2's income-over-limit case (ineligible stub), opened by the session-expiry journey
    // and waiting under review. This file runs serially, so this test decides it; the next one
    // opens a new case for the household.
    const api = await apiAs(playwright, 'applicant2')
    const caseId = await ensureOpenCase(api)
    await waitForReviewTask(api, caseId)
    await page.goto(`/caseworker/cases/${caseId}`)
    const status = page.getByRole('region', { name: 'Status' })
    // `isVisible()` doesn't wait, so checking it before the page loaded skipped the action.
    await page.getByRole('radio', { name: 'Approve the denial' }).click()
    await page.getByRole('button', { name: /submit decision/i }).click()
    await expect(status).toContainText('Denied', { timeout: 15_000 })

    const rows = page.getByRole('region', { name: 'History' }).getByRole('listitem')
    const decisionRow = rows.filter({ hasText: 'Income over the limit' }).last()
    await expect(decisionRow).toBeVisible()
    await expect(decisionRow).not.toContainText('System:')
  })

  test('FR-001-09: caseworker approves a denial and the case page shows Denied with its reason', async ({
    page,
    playwright,
  }) => {
    // applicant2's seeded stub result is ineligible, so the case waits under review.
    const api = await apiAs(playwright, 'applicant2')
    const caseId = await ensureOpenCase(api)
    await waitForReviewTask(api, caseId)
    await page.goto(`/caseworker/cases/${caseId}`)

    await page.getByRole('radio', { name: 'Approve the denial' }).click()
    await page.getByRole('button', { name: /submit decision/i }).click()

    const status = page.getByRole('region', { name: 'Status' })
    await expect(status).toContainText('Denied', { timeout: 15_000 })
    await expect(status).toContainText(/Denial reason/)
    await expect(page.getByRole('region', { name: 'Review task' })).toHaveCount(0)
  })
})

test.describe('supervisor', () => {
  test.use({ storageState: storageStatePath('supervisor') })

  test('FR-001-20: supervisor overrides to approve with a reason and the case page shows the override', async ({
    page,
    playwright,
  }) => {
    // applicant3's seeded stub result is cannot-determine, so the case waits under review.
    const api = await apiAs(playwright, 'applicant3')
    const caseId = await ensureOpenCase(api)
    await waitForReviewTask(api, caseId)
    await page.goto(`/caseworker/cases/${caseId}`)

    await page.getByRole('radio', { name: 'Override and approve' }).click()
    await page.getByLabel(/reason/i).fill('Documents checked by phone')
    await page.getByRole('button', { name: /submit decision/i }).click()

    const status = page.getByRole('region', { name: 'Status' })
    await expect(status).toContainText('Approved', { timeout: 15_000 })
    await expect(status).toContainText('Documents checked by phone')
  })
})
