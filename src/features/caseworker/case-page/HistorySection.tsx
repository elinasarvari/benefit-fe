import type { components } from '@/api/generated/schema'
import { useCaseHistory, type CaseDetail } from '@/api/cases'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { denialLabel, reasonCodeLabel, stateLabel } from '@/lib/caseLabels'
import { formatDateTime } from '@/lib/time'

type HistoryEntry = components['schemas']['CaseHistoryEntry']

// FR-001-10: the deciding entry gives its reason. A denial's reason code is the caseworker's
// action ("Approve denial"), so the denial reason the case was decided on is added to it (TC-161).
function decisionReason(entry: HistoryEntry, detail: CaseDetail): string {
  if (entry.to_state !== 'decided' || !detail.denial_reason) {
    return ''
  }
  return ` - reason: ${denialLabel(detail.denial_reason)}`
}

export function HistorySection({ detail }: { detail: CaseDetail }) {
  const history = useCaseHistory(detail.case_id)

  if (history.isPending) {
    return <LoadingState label="Loading history…" />
  }
  if (history.isError) {
    return (
      <ErrorState
        error={history.error}
        onRetry={() => {
          void history.refetch()
        }}
      />
    )
  }
  if (history.data.items.length === 0) {
    return <p>No history yet.</p>
  }
  return (
    <ol className="space-y-2">
      {history.data.items.map((entry) => (
        <li key={entry.seq} className="rounded-lg border p-2 text-sm">
          <p>
            <time dateTime={entry.case_time}>{formatDateTime(entry.case_time)}</time>
            {detail.demo_clock ? (
              <>
                {' '}
                (real time <time dateTime={entry.real_time}>{formatDateTime(entry.real_time)}</time>
                )
              </>
            ) : null}
          </p>
          <p>
            {entry.actor}: {reasonCodeLabel(entry.reason_code)}
            {entry.to_state ? ` (now ${stateLabel(entry.to_state)})` : ''}
            {decisionReason(entry, detail)}
          </p>
        </li>
      ))}
    </ol>
  )
}
