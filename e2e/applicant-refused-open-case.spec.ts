import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { apiAs, ensureCase, ensureOpenCase, fillApplication } from './support/cases'

test.describe('applicant2 has an open case', () => {
  test.use({ storageState: storageStatePath('applicant2') })

  test('FR-001-25: applicant with an open case is refused and follows the link', async ({
    page,
    playwright,
  }) => {
    const caseId = await ensureOpenCase(await apiAs(playwright, 'applicant2'))
    await page.goto('/applicant/apply')
    await fillApplication(page)

    await page.getByRole('button', { name: /send application/i }).click()

    await expect(page.getByRole('alert').first()).toContainText(/already has an open case/i)
    await page.getByRole('link', { name: /related case/i }).click()
    await expect(page).toHaveURL(new RegExp(`/applicant/cases/${caseId}$`))
    await expect(page.getByRole('heading', { name: /your case/i })).toBeVisible()
  })
})

test.describe('applicant1 has active coverage', () => {
  test.use({ storageState: storageStatePath('applicant') })

  test('FR-001-25: applicant with active coverage is refused and follows the link', async ({
    page,
    playwright,
  }) => {
    // applicant1's seeded stub result is eligible, so the case opened by the application journey
    // ends approved with coverage; the `-applications` phase runs that journey before this one.
    // `ensureCase` keeps the precondition when this file runs on its own.
    await ensureCase(await apiAs(playwright, 'applicant'))
    await page.goto('/applicant/apply')
    await fillApplication(page)

    await page.getByRole('button', { name: /send application/i }).click()

    await expect(page.getByRole('alert').first()).toContainText(
      /already has (active coverage|an open case)/i,
    )
    await page.getByRole('link', { name: /related case/i }).click()
    await expect(page.getByRole('heading', { name: /your case/i })).toBeVisible()
  })
})
