import { useCaseExplanations, type DecisionExplanation } from '@/api/explanations'
import type { CaseDetail } from '@/api/cases'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { overrideLine } from '@/lib/explanations'
import { formatCalendarDate, formatDateTime } from '@/lib/time'

function Explanation({ item, note }: { item: DecisionExplanation; note: string | null }) {
  return (
    <article className="space-y-2 rounded-lg border p-3 text-sm">
      <p>
        <time dateTime={item.built_at}>{formatDateTime(item.built_at)}</time>
      </p>
      <p className="whitespace-pre-line">{item.text}</p>
      {note ? <p className="font-medium">{note}</p> : null}
      {(item.citations ?? []).length > 0 ? (
        <ul aria-label="Citations" className="list-disc pl-5">
          {(item.citations ?? []).map((citation) => (
            <li key={citation.rule_id}>
              {citation.rule_id}: {citation.section} {citation.title} (manual version{' '}
              {formatCalendarDate(citation.manual_version)})
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

export function ExplanationSection({ detail }: { detail: CaseDetail }) {
  const explanations = useCaseExplanations(detail.case_id)

  if (explanations.isPending) {
    return <LoadingState label="Loading explanation…" />
  }
  if (explanations.isError) {
    return (
      <ErrorState
        error={explanations.error}
        onRetry={() => {
          void explanations.refetch()
        }}
      />
    )
  }
  if (explanations.data.items.length === 0) {
    return <p>No explanation stored for this case.</p>
  }
  return (
    <div className="space-y-3">
      {explanations.data.items.map((item, index) => (
        <Explanation
          key={item.determination_id}
          item={item}
          note={index === 0 ? overrideLine(detail.outcome, item.result) : null}
        />
      ))}
    </div>
  )
}
