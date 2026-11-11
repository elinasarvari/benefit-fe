import type { DecisionExplanation } from '@/api/explanations'
import { outcomeLabel } from '@/lib/caseLabels'

const AGREES: Record<string, string> = {
  eligible: 'approved',
  ineligible: 'denied',
  cannot_determine: 'denied',
}

// ADR-004-04: the stored text is never changed. When a caseworker's approved or denied outcome
// differs from the explained result, a fixed line says so beside it.
export function overrideLine(
  outcome: string | null,
  result: DecisionExplanation['result'],
): string | null {
  const expected = AGREES[result]
  if (
    outcome === null ||
    expected === undefined ||
    (outcome !== 'approved' && outcome !== 'denied')
  ) {
    return null
  }
  return outcome === expected
    ? null
    : `A caseworker reviewed this decision and changed the outcome to ${outcomeLabel(outcome)}.`
}
