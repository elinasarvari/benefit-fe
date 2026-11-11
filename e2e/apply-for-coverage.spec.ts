import { demoPassword, storageStatePath, usernameFor } from './env'
import { expect, test } from './fixtures'
import { apiAs, fillApplication, openCaseIds } from './support/cases'

const FIVE_MINUTES_MS = 5 * 60 * 1000

// Runs in the `<browser>-applications` phase, on clean seeded households (playwright.config.ts).
test.describe('applicant1 applies', () => {
  test.use({ storageState: storageStatePath('applicant') })
  // The incomplete application must see the household before the complete one opens its case.
  test.describe.configure({ mode: 'serial' })

  test('FR-001-24: incomplete application names each missing field and opens no case', async ({
    page,
    playwright,
  }) => {
    await page.goto('/applicant/apply')

    await fillApplication(page, '')
    await page.getByRole('button', { name: /send application/i }).click()

    await expect(page.getByRole('alert')).toContainText('ZIP code must be exactly five digits.')
    expect(await openCaseIds(await apiAs(playwright, 'applicant'))).toEqual([])
  })

  test('FR-001-24: applicant submits a complete application and sees the confirmation', async ({
    page,
    browser,
    playwright,
  }) => {
    const started = Date.now()
    await page.goto('/applicant/apply')

    await fillApplication(page)
    await page.getByRole('button', { name: /send application/i }).click()

    await expect(page.getByRole('heading', { name: /application received/i })).toBeVisible()
    await expect(page.getByText(/we will decide by/i)).toBeVisible()
    expect(Date.now() - started).toBeLessThan(FIVE_MINUTES_MS)
    const reference = await page.locator('code').first().textContent()

    const caseworker = await browser.newContext({ storageState: storageStatePath('caseworker') })
    const list = await caseworker.newPage()
    await list.goto('/caseworker')
    // applicant1's result is eligible, so the case is decided within seconds and leaves the
    // default "Open cases" view (quickstart 1: "appears on /caseworker ... then moves on").
    // Look for it under the state it is in now (FR-001-27: the list is filterable by state).
    const staff = await apiAs(playwright, 'caseworker')
    await expect(async () => {
      const detail = await staff.get(`/api/v1/cases/${reference ?? ''}`)
      const { state } = (await detail.json()) as { state: string }
      await list.getByLabel('State').selectOption(state)
      await expect(list.getByRole('link', { name: reference ?? '' })).toBeVisible({
        timeout: 2_000,
      })
    }).toPass({ timeout: 15_000 })
    await caseworker.close()
  })
})

test.describe('applicant3 applies', () => {
  test.use({ storageState: storageStatePath('applicant3') })
  // The case list test reads the case the double submit opens.
  test.describe.configure({ mode: 'serial' })

  test('FR-001-23: double submit opens one case and shows one confirmation', async ({
    page,
    playwright,
  }) => {
    const posts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/v1/applications')) {
        posts.push(request.url())
      }
    })
    await page.goto('/applicant/apply')
    await fillApplication(page)

    await page.getByRole('button', { name: /send application/i }).dblclick()

    await expect(page.getByRole('heading', { name: /application received/i })).toHaveCount(1)
    expect(posts).toHaveLength(1)
    expect(await openCaseIds(await apiAs(playwright, 'applicant3'))).toHaveLength(1)
  })

  test('FR-001-26: applicant sees each open case with its state and decision deadline', async ({
    page,
  }) => {
    await page.goto('/applicant')

    const item = page.getByRole('listitem').first()
    await expect(item).toContainText(/Submitted|Verifying|Determining|Under review/)
    await expect(item).toContainText(/Decision due: \w{3} \d{1,2}, \d{4}/)
  })
})

test.describe('applicant2 loses the session mid-form', () => {
  test.use({ storageState: storageStatePath('applicant2') })

  test('FR-001-24: session expiry mid-form keeps the entries and submits once after signing in again', async ({
    page,
    playwright,
  }) => {
    await page.goto('/applicant/apply')
    await fillApplication(page)
    await page.context().clearCookies()

    await page.getByRole('button', { name: /send application/i }).click()
    const dialog = page.getByRole('dialog', { name: /sign in again/i })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Username').fill(usernameFor('applicant2'))
    await dialog.getByLabel('Password').fill(demoPassword())
    await dialog.getByRole('button', { name: /^sign in$/i }).click()

    await expect(page.getByRole('heading', { name: /application received/i })).toBeVisible()
    expect(await openCaseIds(await apiAs(playwright, 'applicant2'))).toHaveLength(1)
  })
})
