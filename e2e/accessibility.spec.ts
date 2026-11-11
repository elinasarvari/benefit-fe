import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { apiAs, ensureOpenCase, fillApplication } from './support/cases'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

async function runAxe(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([])
}

test.describe('applicant pages', () => {
  test.use({ storageState: storageStatePath('applicant2') })

  test('FR-001-24: form, confirmation and refusal pages have no axe violations', async ({
    page,
    playwright,
    expectNoSeriousA11yViolations,
  }) => {
    await page.goto('/applicant/apply')
    await expect(page.getByRole('heading', { name: /apply for coverage/i })).toBeVisible()
    await expectNoSeriousA11yViolations()

    // Errors shown on the form.
    await page.getByRole('button', { name: /send application/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expectNoSeriousA11yViolations()

    // Refusal: the household already has an open case.
    await ensureOpenCase(await apiAs(playwright, 'applicant2'))
    await page.reload()
    await fillApplication(page)
    await page.getByRole('button', { name: /send application/i }).click()
    await expect(page.getByRole('link', { name: /related case/i })).toBeVisible()
    await expectNoSeriousA11yViolations()
  })

  test('FR-001-27: applicant home, case list and case page have no axe violations', async ({
    page,
    browser,
    playwright,
    expectNoSeriousA11yViolations,
  }) => {
    const caseId = await ensureOpenCase(await apiAs(playwright, 'applicant2'))

    await page.goto('/applicant')
    await expect(page.getByRole('heading', { name: /applicant portal/i })).toBeVisible()
    await expectNoSeriousA11yViolations()

    await page.goto(`/applicant/cases/${caseId}`)
    await expect(page.getByRole('heading', { name: /your case/i })).toBeVisible()
    await expectNoSeriousA11yViolations()

    // The caseworker's pages need their own session; axe runs against that page.
    const caseworker = await browser.newContext({ storageState: storageStatePath('caseworker') })
    const staffPage = await caseworker.newPage()
    await staffPage.goto('/caseworker')
    await expect(staffPage.getByRole('table')).toBeVisible()
    await runAxe(staffPage)
    await staffPage.goto(`/caseworker/cases/${caseId}`)
    await expect(staffPage.getByRole('region', { name: 'Status' })).toBeVisible()
    await runAxe(staffPage)
    await caseworker.close()
  })
})
