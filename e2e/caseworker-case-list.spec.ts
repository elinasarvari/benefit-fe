import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { apiAs, ensureCase, ensureOpenCase, waitForReviewTask } from './support/cases'

test.use({ storageState: storageStatePath('caseworker') })

test('FR-001-27: caseworker filters the case list by state and sees deadline order and at-risk flag', async ({
  page,
  playwright,
}) => {
  const caseId = await ensureOpenCase(await apiAs(playwright, 'applicant3'))
  await waitForReviewTask(await apiAs(playwright, 'applicant3'), caseId)
  await page.goto('/caseworker')

  const days = await page
    .getByRole('row')
    .evaluateAll((rows) =>
      rows
        .slice(1)
        .map((row) => Number.parseInt(row.querySelectorAll('td')[2]?.textContent ?? '', 10)),
    )
  expect(days).toEqual([...days].sort((a, b) => a - b))
  // An at-risk badge appears exactly on the rows with ten days or fewer remaining.
  const badges = await page.getByText('At risk').count()
  expect(badges).toBe(days.filter((value) => value <= 10).length)

  await page.getByLabel('State').selectOption('under_review')
  await expect(page.getByRole('link', { name: caseId })).toBeVisible()
  await page.getByLabel('State').selectOption('decided')
  await expect(page.getByRole('link', { name: caseId })).toHaveCount(0)
})

// Needs the stack started with DEMO_PROFILE=true (API and worker, clock scale 1440); never skipped.
test('FR-001-13: on the demo profile every history entry shows case-clock and real times', async ({
  page,
  playwright,
}) => {
  // applicant1's case is decided (approved) by now, and its history is complete.
  const api = await apiAs(playwright, 'applicant')
  const caseId = await ensureCase(api)
  await page.goto(`/caseworker/cases/${caseId}`)

  const rows = page.getByRole('region', { name: 'History' }).getByRole('listitem')
  await expect(rows.first()).toBeVisible()
  expect(await rows.count()).toBeGreaterThanOrEqual(3)
  for (const row of await rows.all()) {
    await expect(row).toContainText('real time')
    await expect(row.locator('time')).toHaveCount(2)
  }
})

test('FR-001-27: caseworker opens a case and its history matches the recorded case events', async ({
  page,
  playwright,
  request,
}) => {
  const api = await apiAs(playwright, 'applicant3')
  const caseId = await ensureOpenCase(api)
  await waitForReviewTask(api, caseId)

  await page.goto(`/caseworker/cases/${caseId}`)

  await expect(page.getByRole('region', { name: 'Status' })).toBeVisible()
  const history = await request.get(`/api/v1/cases/${caseId}/history`)
  const { items } = (await history.json()) as { items: { actor: string }[] }
  const rows = page.getByRole('region', { name: 'History' }).getByRole('listitem')
  await expect(rows).toHaveCount(items.length)
  expect(items.length).toBeGreaterThan(0)
  await expect(rows.first()).toContainText(items[0]?.actor ?? '')
})
