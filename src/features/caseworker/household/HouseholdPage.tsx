import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/errors'
import { useHousehold, useStartRedetermination, type CoveragePeriodView } from '@/api/households'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeading } from '@/components/PageHeading'
import { Button } from '@/components/ui/button'
import { coverageLabel, stateLabel } from '@/lib/caseLabels'

const STARTABLE = ['active', 'continued_pending_review']
const caseHref = (caseId: string) => `/caseworker/cases/${caseId}`

export function HouseholdPage() {
  const { householdId = '' } = useParams()
  const household = useHousehold(householdId)
  const start = useStartRedetermination(householdId)
  const navigate = useNavigate()

  if (household.isPending) {
    return <LoadingState label="Loading household…" />
  }
  if (household.isError) {
    return (
      <ErrorState
        error={household.error}
        onRetry={() => {
          void household.refetch()
        }}
      />
    )
  }

  const { members, coverage_periods: periods, cases } = household.data
  const running = new Set(periods.map((p) => p.running_redetermination_case_id).filter(Boolean))
  // The running redetermination comes first.
  const orderedCases = [...cases].sort(
    (a, b) => Number(running.has(b.case_id)) - Number(running.has(a.case_id)),
  )
  const refusal = start.error instanceof ApiError ? start.error : null
  const openCaseId = refusal?.fields.some((f) => f.type === 'household_has_open_case')
    ? refusal.relatedCaseId
    : null

  const startFor = (period: CoveragePeriodView): void => {
    start.mutate(period.coverage_period_id, {
      onSuccess: (result) => {
        void navigate(caseHref(result.case_id))
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeading>Household</PageHeading>

      <section aria-labelledby="household-members" className="space-y-2">
        <h2 id="household-members" className="text-lg font-medium">
          Members
        </h2>
        <ul>
          {members.map((member) => (
            <li key={member.member_id}>
              {member.full_name} ({member.relationship}, born {member.date_of_birth})
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="household-periods" className="space-y-2">
        <h2 id="household-periods" className="text-lg font-medium">
          Coverage periods
        </h2>
        {periods.length === 0 ? <p>No coverage periods.</p> : null}
        <ul className="space-y-2">
          {periods.map((period) => (
            <li key={period.coverage_period_id} className="flex flex-wrap items-center gap-3">
              <span>
                {coverageLabel(period.status)}: {period.start_date} to {period.end_date}
              </span>
              {period.running_redetermination_case_id ? (
                <Link className="underline" to={caseHref(period.running_redetermination_case_id)}>
                  Open the redetermination case
                </Link>
              ) : STARTABLE.includes(period.status) ? (
                <Button
                  size="sm"
                  disabled={start.isPending}
                  onClick={() => {
                    startFor(period)
                  }}
                >
                  Start redetermination
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {openCaseId ? (
          <div role="alert" className="rounded-lg border border-destructive/40 p-3">
            <p>Another case is open for this household.</p>
            <Link className="underline" to={caseHref(openCaseId)}>
              Open the case
            </Link>
          </div>
        ) : start.isError ? (
          <ErrorState error={start.error} />
        ) : null}
      </section>

      <section aria-labelledby="household-cases" className="space-y-2">
        <h2 id="household-cases" className="text-lg font-medium">
          Cases
        </h2>
        {orderedCases.length === 0 ? <p>No cases yet.</p> : null}
        <ul>
          {orderedCases.map((item) => (
            <li key={item.case_id}>
              <Link className="underline" to={caseHref(item.case_id)}>
                {item.case_id}
              </Link>{' '}
              ({item.case_type}, {stateLabel(item.state)})
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
