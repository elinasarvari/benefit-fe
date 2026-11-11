import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { findCaseDeterminedInYear } from './pages/DeterminationSection'
import { apiAs } from './support/cases'

interface ApiExplanation {
  text: string
  citations: { rule_id: string; section: string; title: string }[]
}

// Needs freshly seeded data (`make reset` in benefit-be): decided history cases carry stored
// explanations (ADR-004-02).
test.use({ storageState: storageStatePath('caseworker') })

test.describe('caseworker sees the explanation', () => {
  test('FR-004-15: caseworker sees stored explanation and citations on a decided seeded case', async ({
    page,
    playwright,
  }) => {
    const caseworker = await apiAs(playwright, 'caseworker')
    const caseId = await findCaseDeterminedInYear(caseworker, 2025)
    const response = await caseworker.get(`/api/v1/cases/${caseId}/explanations`)
    expect(response.status()).toBe(200)
    const [stored] = ((await response.json()) as { items: ApiExplanation[] }).items
    expect(stored).toBeDefined()
    expect(stored?.citations.length).toBeGreaterThan(0)

    await page.goto(`/caseworker/cases/${caseId}`)

    const section = page.getByRole('region', { name: 'Explanation' })
    await expect(section).toBeVisible()
    for (const citation of stored?.citations.slice(0, 3) ?? []) {
      await expect(section).toContainText(citation.section)
      await expect(section).toContainText(citation.title)
    }
  })
})
