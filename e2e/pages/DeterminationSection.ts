import type { APIRequestContext, Locator, Page } from '@playwright/test'

export interface RuleRow {
  ruleId: string
  threshold: string
  outcome: string
}

interface ApiRule {
  rule_id: string
  threshold: string | null
  outcome: 'pass' | 'fail' | 'missing'
}

export interface ApiDetermination {
  result: string
  reason_code: string | null
  as_of_date: string
  rule_set_id: string | null
  rule_set_version: number | null
  rules: ApiRule[]
  missing_items: { item: string }[]
}

const OUTCOME_TEXT = { pass: 'Pass', fail: 'Fail', missing: 'Missing' } as const

// The caseworker case page's Determination section (FR-003-23). Specs use this, not raw selectors.
export class DeterminationSection {
  readonly region: Locator
  readonly ruleRows: Locator
  readonly missingItems: Locator

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
    this.region = page.getByRole('region', { name: 'Determination' })
    this.ruleRows = this.region.getByRole('row').filter({ has: page.getByRole('cell') })
    this.missingItems = this.region.getByRole('list', { name: 'Missing items' })
  }

  async open(caseId: string): Promise<void> {
    await this.page.goto(`/caseworker/cases/${caseId}`)
  }

  // The newest determination is first; its heading is the result.
  result(): Locator {
    return this.region.getByRole('heading', { level: 3 }).first()
  }

  async shownRules(): Promise<RuleRow[]> {
    const rows = await this.ruleRows.all()
    const shown: RuleRow[] = []
    for (const row of rows.slice(0, 6)) {
      const cells = row.getByRole('cell')
      shown.push({
        ruleId: (await cells.nth(0).innerText()).trim(),
        threshold: (await cells.nth(2).innerText()).trim(),
        outcome: (await cells.nth(3).innerText()).trim(),
      })
    }
    return shown
  }
}

export function expectedRules(determination: ApiDetermination): RuleRow[] {
  return determination.rules.map((rule) => ({
    ruleId: rule.rule_id,
    threshold: rule.threshold ?? '–',
    outcome: OUTCOME_TEXT[rule.outcome],
  }))
}

// The stored determinations through the API, newest first (what the page must show).
export async function storedDeterminations(
  api: APIRequestContext,
  caseId: string,
): Promise<ApiDetermination[]> {
  const response = await api.get(`/api/v1/cases/${caseId}/determinations`)
  if (!response.ok()) {
    throw new Error(`could not read determinations of ${caseId}: ${String(response.status())}`)
  }
  return ((await response.json()) as { items: ApiDetermination[] }).items
}

export async function newestDetermination(
  api: APIRequestContext,
  caseId: string,
): Promise<ApiDetermination> {
  const [newest] = await storedDeterminations(api, caseId)
  if (!newest) {
    throw new Error(`case ${caseId} has no stored determination`)
  }
  return newest
}

// Finds a decided case whose newest determination is as of the given year, by reading the case
// list and its determinations as the caseworker (the seeded history, ADR-003-06).
export async function findCaseDeterminedInYear(
  api: APIRequestContext,
  year: number,
): Promise<string> {
  let cursor: string | null = null
  do {
    const response = await api.get('/api/v1/cases', {
      params: { state: 'decided', ...(cursor ? { cursor } : {}) },
    })
    const page = (await response.json()) as {
      items: { case_id: string }[]
      next_cursor: string | null
    }
    for (const item of page.items) {
      const [newest] = await storedDeterminations(api, item.case_id)
      if (newest?.as_of_date.startsWith(String(year))) {
        return item.case_id
      }
    }
    cursor = page.next_cursor
  } while (cursor)
  throw new Error(`no decided case with a determination as of ${String(year)}`)
}
