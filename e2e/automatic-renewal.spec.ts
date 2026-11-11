import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { apiAs } from './support/cases'
import { activePeriod, getCase, getHousehold, householdId } from './support/renewal'

test.use({ storageState: storageStatePath('caseworker') })
// One redetermination per coverage period (FR-007-07), so the journeys run in order.
test.describe.configure({ mode: 'serial' })

const CASE_URL = /\/caseworker\/cases\/[0-9a-f-]{36}/

test('FR-007-02: household E renews automatically from the household page', async ({
  page,
  playwright,
}) => {
  const id = householdId('E')
  const api = await apiAs(playwright, 'caseworker')
  const old = activePeriod(await getHousehold(api, id))

  await page.goto(`/caseworker/households/${id}`)
  await page.getByRole('button', { name: 'Start redetermination' }).first().click()
  await page.waitForURL(CASE_URL)
  const caseId = new URL(page.url()).pathname.split('/').pop() ?? ''
  expect(caseId).not.toBe('')

  await expect
    .poll(async () => (await getCase(api, caseId)).state, { timeout: 30_000 })
    .toBe('decided')
  expect((await getCase(api, caseId)).outcome).toBe('renewed_automatically')

  const after = await getHousehold(api, id)
  const renewed = after.coverage_periods.find(
    (p) => p.coverage_period_id === old.coverage_period_id,
  )
  expect(renewed?.status).toBe('renewed')
  const next = after.coverage_periods.find((p) => p.status === 'active')
  expect(next).toBeDefined()
  const dayAfter = new Date(`${old.end_date}T00:00:00Z`)
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)
  expect(next?.start_date).toBe(dayAfter.toISOString().slice(0, 10))
})

test('FR-007-07: second press of start redetermination links to the same case', async ({
  page,
  playwright,
}) => {
  const id = householdId('F')
  const api = await apiAs(playwright, 'caseworker')
  const period = activePeriod(await getHousehold(api, id))

  await page.goto(`/caseworker/households/${id}`)
  await page.getByRole('button', { name: 'Start redetermination' }).first().click()
  await page.waitForURL(CASE_URL)
  const first = new URL(page.url()).pathname.split('/').pop() ?? ''

  // A second start for the same period (a stale tab, the schedule) must not add a case.
  const again = await api.post(`/api/v1/households/${id}/redeterminations`, {
    data: { coverage_period_id: period.coverage_period_id },
  })
  expect(again.status()).toBe(200)
  const body = (await again.json()) as { case_id: string; created: boolean }
  expect(body.created).toBe(false)
  expect(body.case_id).toBe(first)

  await page.goto(`/caseworker/households/${id}`)
  await expect(page.getByRole('link', { name: 'Open the redetermination case' })).toHaveAttribute(
    'href',
    `/caseworker/cases/${first}`,
  )
  const household = await getHousehold(api, id)
  const running = household.coverage_periods.find(
    (p) => p.coverage_period_id === period.coverage_period_id,
  )
  expect(running?.running_redetermination_case_id).toBe(body.case_id)
})
