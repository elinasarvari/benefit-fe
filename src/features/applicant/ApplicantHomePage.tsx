import { Link } from 'react-router'
import { useCases } from '@/api/cases'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeading } from '@/components/PageHeading'
import { stateLabel } from '@/lib/caseLabels'
import { formatCalendarDate } from '@/lib/time'

export function ApplicantHomePage() {
  const cases = useCases({})
  const items = cases.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section className="space-y-4">
      <PageHeading>Applicant portal</PageHeading>
      <Link to="/applicant/apply" className="text-primary underline underline-offset-4">
        Apply for coverage
      </Link>
      {cases.isPending ? <LoadingState label="Loading your cases…" /> : null}
      {cases.isError ? (
        <ErrorState
          error={cases.error}
          onRetry={() => {
            void cases.refetch()
          }}
        />
      ) : null}
      {cases.isSuccess && items.length === 0 ? <p>No applications to show yet.</p> : null}
      {items.length > 0 ? (
        <ul className="space-y-2" aria-label="Your open cases">
          {items.map((item) => (
            <li key={item.case_id} className="rounded-lg border p-3">
              <Link
                to={`/applicant/cases/${item.case_id}`}
                className="font-medium text-primary underline underline-offset-4"
              >
                Case {item.case_id}
              </Link>
              <p>Status: {stateLabel(item.state)}</p>
              <p>Decision due: {formatCalendarDate(item.decision_deadline)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
