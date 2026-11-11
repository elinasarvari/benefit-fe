import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { apiAs, ensureOpenCase } from './support/cases'

test.use({ storageState: storageStatePath('applicant') })

// The audit entry (`access_refused` / `wrong_case`) is asserted by the backend integration tests
// (benefit-be tests/integration/test_case_screens_api.py); no API reads the audit log, so this
// journey checks only what the applicant sees.
test('FR-001-26: applicant gets not found for another household case and the attempt is audited', async ({
  page,
  playwright,
}) => {
  const otherHouseholdCase = await ensureOpenCase(await apiAs(playwright, 'applicant2'))

  await page.goto(`/applicant/cases/${otherHouseholdCase}`)
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()
  const refused = await page.locator('main').innerText()

  await page.goto('/applicant/cases/12345678-1234-4234-8234-123456789012')
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible()
  expect(await page.locator('main').innerText()).toBe(refused)
})
