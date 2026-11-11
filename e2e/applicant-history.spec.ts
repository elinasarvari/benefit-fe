import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { apiAs } from './support/cases'

interface ApiHistoryEntry {
  outcome: string | null
  explanation: { result: string; text: string } | null
}

// Needs freshly seeded data (`make reset` in benefit-be): applicant4 belongs to a seeded history
// household (ADR-004-05).
test.use({ storageState: storageStatePath('applicant4') })

async function history(playwright: Parameters<typeof apiAs>[0]): Promise<ApiHistoryEntry[]> {
  const api = await apiAs(playwright, 'applicant4')
  const response = await api.get('/api/v1/me/history')
  expect(response.status()).toBe(200)
  return ((await response.json()) as { items: ApiHistoryEntry[] }).items
}

test.describe('applicant history', () => {
  test("FR-004-16: returning applicant sees each coverage period's decision with explanation", async ({
    page,
    playwright,
  }) => {
    const items = await history(playwright)
    expect(items.length).toBeGreaterThan(0)

    await page.goto('/applicant/history')

    await expect(page.getByRole('heading', { name: 'Decision history' })).toBeVisible()
    for (const entry of items) {
      if (entry.explanation) {
        await expect(page.getByText(entry.explanation.text, { exact: false }).first()).toBeVisible()
      }
    }
  })

  test('FR-004-12: overridden seeded case shows unchanged explanation with fixed line', async ({
    page,
    playwright,
  }) => {
    const items = await history(playwright)
    const overridden = items.find(
      (entry) =>
        entry.explanation &&
        entry.outcome === 'approved' &&
        entry.explanation.result !== 'eligible',
    )
    expect(overridden, 'the seeded history applicant has an overridden case').toBeDefined()

    await page.goto('/applicant/history')

    await expect(
      page.getByText(overridden?.explanation?.text ?? '', { exact: false }).first(),
    ).toBeVisible()
    await expect(
      page
        .getByText('A caseworker reviewed this decision and changed the outcome to Approved.')
        .first(),
    ).toBeVisible()
  })
})
