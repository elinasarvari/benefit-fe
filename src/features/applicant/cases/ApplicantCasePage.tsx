import { useParams } from 'react-router'
import { useCase } from '@/api/cases'
import { ApiError } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeading } from '@/components/PageHeading'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { denialLabel, outcomeLabel, stateLabel } from '@/lib/caseLabels'
import { formatCalendarDate } from '@/lib/time'

export function ApplicantCasePage() {
  const { caseId = '' } = useParams()
  const found = useCase(caseId)

  if (found.isPending) {
    return <LoadingState label="Loading your case…" />
  }
  // Any 404 looks the same: a case that is missing and one that is someone else's (PL-6, R12).
  if (found.error instanceof ApiError && found.error.status === 404) {
    return <NotFoundPage />
  }
  if (found.isError) {
    return (
      <ErrorState
        error={found.error}
        onRetry={() => {
          void found.refetch()
        }}
      />
    )
  }
  const detail = found.data
  return (
    <section className="space-y-3">
      <PageHeading>Your case</PageHeading>
      <p>Case reference: {detail.case_id}</p>
      <p>Status: {stateLabel(detail.state)}</p>
      <p>Received: {formatCalendarDate(detail.received_on)}</p>
      <p>Decision due: {formatCalendarDate(detail.decision_deadline)}</p>
      {detail.outcome ? <p>Outcome: {outcomeLabel(detail.outcome)}</p> : null}
      {detail.denial_reason ? <p>Reason: {denialLabel(detail.denial_reason)}</p> : null}
    </section>
  )
}
