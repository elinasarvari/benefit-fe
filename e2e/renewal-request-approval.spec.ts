import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { apiAs } from './support/cases'
import { activePeriod, getCase, getHousehold, householdId } from './support/renewal'

test.use({ storageState: storageStatePath('caseworker') })

test('FR-007-03: caseworker approves the one-document request for household F', async ({
  page,
  playwright,
}) => {
  const id = householdId('F')
  const api = await apiAs(playwright, 'caseworker')
  const before = await getHousehold(api, id)
  const period = activePeriod(before)

  // FR-007-07: starting again returns the case the earlier journey started, if any.
  const started = await api.post(`/api/v1/households/${id}/redeterminations`, {
    data: { coverage_period_id: period.coverage_period_id },
  })
  expect([200, 201]).toContain(started.status())
  const { case_id: caseId } = (await started.json()) as { case_id: string }

  await expect
    .poll(async () => (await getCase(api, caseId)).open_review_task?.reason, { timeout: 30_000 })
    .toBe('notice_approval')

  const notices = await api.get(`/api/v1/cases/${caseId}/notices`)
  const { items } = (await notices.json()) as {
    items: { notice_type: string; status: string; items: unknown[] }[]
  }
  const request = items.find((n) => n.notice_type === 'request_for_information')
  expect(request?.status).toBe('pending_approval')
  expect(request?.items).toHaveLength(1)

  await page.goto(`/caseworker/cases/${caseId}`)
  await expect(page.getByText(/income/i).first()).toBeVisible()
  await page.getByRole('button', { name: 'Approve and send the request' }).click()

  await expect.poll(async () => (await getCase(api, caseId)).state).toBe('awaiting_applicant')
  const waiting = await getCase(api, caseId)
  expect(waiting.pending_timer?.name).toBe('redetermination_response_deadline')
  expect(waiting.open_review_task).toBeNull()

  const after = await getHousehold(api, id)
  const same = after.coverage_periods.find(
    (p) => p.coverage_period_id === period.coverage_period_id,
  )
  expect(same?.status).toBe('active')
  expect(after.coverage_periods.some((p) => p.status === 'ended')).toBe(false)
})
