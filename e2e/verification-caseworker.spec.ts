import type { APIRequestContext } from '@playwright/test'
import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import { apiAs } from './support/cases'

// quickstart 5–6, on freshly seeded data (`make reset` in benefit-be). Until 011 runs the pay stub
// check from the case workflow, the seeded history cases carry their stubs and check results
// (`db/seeds/verification_history.py`), so these journeys read one of those. TC-71 (correct and
// dismiss in the browser) moved to 011, which wires the check's re-run (ADR-002-06).
test.use({ storageState: storageStatePath('caseworker') })

interface Finding {
  finding_id: string
  cause: string
  dismissed: unknown
}

interface Verification {
  documents: { document_id: string; details: { employer: string } }[]
  result: { findings: Finding[] } | null
}

interface CasePage {
  items: { case_id: string }[]
  next_cursor: string | null
}

// The first seeded history case whose check result satisfies `wanted`, through the caseworker API.
async function findCase(
  staff: APIRequestContext,
  wanted: (verification: Verification) => boolean,
): Promise<{ caseId: string; verification: Verification }> {
  let cursor: string | null = null
  do {
    const query: string = cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`
    // Staff see open cases unless they ask for a state; the seeded history cases are decided.
    const listed = await staff.get(`/api/v1/cases?state=decided&limit=100${query}`)
    expect(listed.ok()).toBe(true)
    const page = (await listed.json()) as CasePage
    for (const { case_id: caseId } of page.items) {
      const response = await staff.get(`/api/v1/cases/${caseId}/verification`)
      if (!response.ok()) {
        continue
      }
      const verification = (await response.json()) as Verification
      if (wanted(verification)) {
        return { caseId, verification }
      }
    }
    cursor = page.next_cursor
  } while (cursor !== null)
  throw new Error('no seeded case matches; reseed with `make reset` in benefit-be')
}

const mismatch = (v: Verification) =>
  v.result?.findings.some((f) => f.cause === 'income_mismatch' && f.dismissed == null) ?? false

test.describe('caseworker sees verification', () => {
  test('FR_002_18_caseworker_sees_documents_details_and_result', async ({ page, playwright }) => {
    const staff = await apiAs(playwright, 'caseworker')
    const { caseId, verification } = await findCase(
      staff,
      (v) => v.documents.length > 0 && v.result !== null,
    )

    await page.goto(`/caseworker/cases/${caseId}`)

    const section = page.getByRole('region', { name: /documents/i })
    await expect(section).toBeVisible()
    const employer = verification.documents[0]?.details.employer ?? ''
    await expect(section.getByText(employer).first()).toBeVisible()
    await expect(section.getByText(/gross pay/i).first()).toBeVisible()
    await expect(section.getByText(/result|finding|no findings/i).first()).toBeVisible()
  })

  test('FR_002_03_caseworker_sees_seeded_mismatch_finding', async ({ page, playwright }) => {
    const staff = await apiAs(playwright, 'caseworker')
    const { caseId } = await findCase(staff, mismatch)

    await page.goto(`/caseworker/cases/${caseId}`)

    const section = page.getByRole('region', { name: /documents/i })
    await expect(section.getByText(/declared/i).first()).toBeVisible()
    await expect(section.getByText(/documented/i).first()).toBeVisible()
    // The conversion as the check writes it: "biweekly 830.77 x 26 / 12 = 1800.00" (or "monthly … = …").
    await expect(
      section.getByText(/Conversion: \w+ [\d.]+ (x \d+ \/ 12 )?= [\d.]+/).first(),
    ).toBeVisible()
  })
})
