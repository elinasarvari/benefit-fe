import { storageStatePath } from './env'
import { expect, test } from './fixtures'
import {
  DeterminationSection,
  expectedRules,
  findCaseDeterminedInYear,
  newestDetermination,
} from './pages/DeterminationSection'
import { apiAs, ensureCase, ensureOpenCase, waitForReviewTask } from './support/cases'

// Needs freshly seeded data (`make seed-reset` in benefit-be): the demo households A, B and C
// (applicant1, applicant2, applicant3) give Eligible, Ineligible and Cannot determine through the
// real rules engine (ADR-003-03). Runs after the other journeys, like the review journeys.
test.use({ storageState: storageStatePath('caseworker') })

test.describe('caseworker sees the determination', () => {
  test("FR-003-23: caseworker sees demo household A's eligible determination with six passing rules matching the API", async ({
    page,
    playwright,
  }) => {
    const applicant = await apiAs(playwright, 'applicant')
    const caseId = await ensureCase(applicant)
    const stored = await newestDetermination(await apiAs(playwright, 'caseworker'), caseId)
    expect(stored.result).toBe('eligible')

    const section = new DeterminationSection(page)
    await section.open(caseId)

    await expect(section.result()).toHaveText('Eligible')
    const shown = await section.shownRules()
    expect(shown).toEqual(expectedRules(stored))
    expect(shown.every((rule) => rule.outcome === 'Pass')).toBe(true)
  })

  test('FR-003-23: caseworker sees demo household B ineligible with reason income over limit and ELIG-06 failed', async ({
    page,
    playwright,
  }) => {
    const applicant = await apiAs(playwright, 'applicant2')
    const caseId = await ensureOpenCase(applicant)
    await waitForReviewTask(applicant, caseId)
    const stored = await newestDetermination(await apiAs(playwright, 'caseworker'), caseId)
    expect(stored.reason_code).toBe('income_over_limit')

    const section = new DeterminationSection(page)
    await section.open(caseId)

    await expect(section.result()).toHaveText('Ineligible')
    await expect(section.region).toContainText('Income over the limit')
    const rules = await section.shownRules()
    expect(rules).toEqual(expectedRules(stored))
    expect(rules.find((rule) => rule.ruleId === 'ELIG-06')?.outcome).toBe('Fail')
  })

  test('FR-003-23: caseworker sees the missing pay stub when demo household C cannot be determined', async ({
    page,
    playwright,
  }) => {
    const applicant = await apiAs(playwright, 'applicant3')
    const caseId = await ensureOpenCase(applicant)
    await waitForReviewTask(applicant, caseId)
    const stored = await newestDetermination(await apiAs(playwright, 'caseworker'), caseId)
    expect(stored.result).toBe('cannot_determine')

    const section = new DeterminationSection(page)
    await section.open(caseId)

    await expect(section.result()).toHaveText('Cannot determine')
    await expect(section.missingItems).toContainText('pay_stub')
    expect(await section.shownRules()).toEqual(expectedRules(stored))
  })

  test('FR-003-23: determination section has no axe violations', async ({
    page,
    playwright,
    expectNoSeriousA11yViolations,
  }) => {
    const applicant = await apiAs(playwright, 'applicant2')
    const caseId = await ensureCase(applicant)
    const section = new DeterminationSection(page)
    await section.open(caseId)

    await expect(section.region).toBeVisible()
    await expect(section.result()).toBeVisible()
    await expectNoSeriousA11yViolations()
  })

  test('FR-003-23: caseworker sees a seeded 2025 history determination with the 2025 rule set version', async ({
    page,
    playwright,
  }) => {
    const caseworker = await apiAs(playwright, 'caseworker')
    const caseId = await findCaseDeterminedInYear(caseworker, 2025)
    const stored = await newestDetermination(caseworker, caseId)

    const section = new DeterminationSection(page)
    await section.open(caseId)

    await expect(section.region).toContainText(
      `${stored.rule_set_id ?? ''} v${String(stored.rule_set_version)}`,
    )
    await expect(section.region).toContainText('2025')
    expect(await section.shownRules()).toEqual(expectedRules(stored))
  })
})
