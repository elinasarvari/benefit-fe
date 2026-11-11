import { Link } from 'react-router'
import { useApplicantHistory, type HistoryEntry } from '@/api/explanations'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeading } from '@/components/PageHeading'
import { outcomeLabel } from '@/lib/caseLabels'
import { overrideLine } from '@/lib/explanations'
import { formatCalendarDate } from '@/lib/time'

function period(entry: HistoryEntry): string {
  return entry.coverage_start && entry.coverage_end
    ? `${formatCalendarDate(entry.coverage_start)} to ${formatCalendarDate(entry.coverage_end)}`
    : 'No coverage period'
}

function Entry({ entry }: { entry: HistoryEntry }) {
  const note = entry.explanation ? overrideLine(entry.outcome, entry.explanation.result) : null
  return (
    <li className="space-y-1 rounded-lg border p-3 text-sm">
      <p className="font-medium">Coverage period: {period(entry)}</p>
      <p>
        Decision: {entry.outcome ? outcomeLabel(entry.outcome) : 'Not decided yet'}
        {entry.decided_on ? ` on ${formatCalendarDate(entry.decided_on)}` : ''}
      </p>
      {entry.explanation ? <p className="whitespace-pre-line">{entry.explanation.text}</p> : null}
      {note ? <p className="font-medium">{note}</p> : null}
    </li>
  )
}

export function HistoryPage() {
  const history = useApplicantHistory()

  return (
    <section className="space-y-4">
      <PageHeading>Decision history</PageHeading>
      {history.isPending ? <LoadingState label="Loading your decision history…" /> : null}
      {history.isError ? (
        <ErrorState
          error={history.error}
          onRetry={() => {
            void history.refetch()
          }}
        />
      ) : null}
      {history.isSuccess && history.data.items.length === 0 ? (
        <p>No decisions to show yet.</p>
      ) : null}
      {history.isSuccess && history.data.items.length > 0 ? (
        <ul aria-label="Decisions" className="space-y-2">
          {history.data.items.map((entry) => (
            <Entry key={entry.case_id} entry={entry} />
          ))}
        </ul>
      ) : null}
      <Link to="/applicant" className="text-primary underline underline-offset-4">
        Back to your cases
      </Link>
    </section>
  )
}
