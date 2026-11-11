import { Link } from 'react-router'
import type { CaseDetail } from '@/api/cases'
import { Badge } from '@/components/ui/badge'
import { coverageLabel, denialLabel, outcomeLabel, stateLabel } from '@/lib/caseLabels'
import { formatCalendarDate } from '@/lib/time'

export function StatusSection({ detail }: { detail: CaseDetail }) {
  const { coverage_period: coverage, override } = detail
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
      <dt className="font-medium">State</dt>
      <dd>{stateLabel(detail.state)}</dd>
      <dt className="font-medium">Received</dt>
      <dd>{formatCalendarDate(detail.received_on)}</dd>
      <dt className="font-medium">Decision due</dt>
      <dd>{formatCalendarDate(detail.decision_deadline)}</dd>
      {detail.days_remaining === null ? null : (
        <>
          <dt className="font-medium">Days remaining</dt>
          <dd>
            {detail.days_remaining}{' '}
            {detail.at_risk ? <Badge variant="destructive">At risk</Badge> : null}
          </dd>
        </>
      )}
      {detail.outcome ? (
        <>
          <dt className="font-medium">Outcome</dt>
          <dd>{outcomeLabel(detail.outcome)}</dd>
        </>
      ) : null}
      {detail.denial_reason ? (
        <>
          <dt className="font-medium">Denial reason</dt>
          <dd>{denialLabel(detail.denial_reason)}</dd>
        </>
      ) : null}
      {coverage ? (
        <>
          <dt className="font-medium">Coverage period</dt>
          <dd>
            {formatCalendarDate(coverage.start_date)} to {formatCalendarDate(coverage.end_date)} (
            {coverageLabel(coverage.status)})
          </dd>
        </>
      ) : null}
      <dt className="font-medium">Household</dt>
      <dd>
        <Link className="underline" to={`/caseworker/households/${detail.household_id}`}>
          Open the household
        </Link>
      </dd>
      {override ? (
        <>
          <dt className="font-medium">Override</dt>
          <dd>
            Approved by {override.reviewer_name} on {formatCalendarDate(override.decided_on)}
            {override.reason ? `. Reason: ${override.reason}` : ''}
          </dd>
        </>
      ) : null}
    </dl>
  )
}
