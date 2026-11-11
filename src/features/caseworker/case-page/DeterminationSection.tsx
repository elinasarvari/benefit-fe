import {
  useCaseDeterminations,
  type DeterminationView,
  type MissingItem,
} from '@/api/determinations'
import type { CaseDetail } from '@/api/cases'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { denialLabel } from '@/lib/caseLabels'
import { formatCalendarDate, formatDateTime } from '@/lib/time'

const RESULT_LABELS: Record<DeterminationView['result'], string> = {
  eligible: 'Eligible',
  ineligible: 'Ineligible',
  cannot_determine: 'Cannot determine',
}

const OUTCOME_LABELS = { pass: 'Pass', fail: 'Fail', missing: 'Missing' } as const

function MissingList({ items }: { items: MissingItem[] }) {
  return (
    <ul aria-label="Missing items" className="list-disc pl-5 text-sm">
      {items.map((item) => (
        <li key={`${item.item}-${item.member_id ?? ''}-${item.job_id ?? ''}`}>
          {item.item}: {item.reason}
        </li>
      ))}
    </ul>
  )
}

function Determination({ view }: { view: DeterminationView }) {
  return (
    <article className="space-y-2 rounded-lg border p-3 text-sm">
      <h3 className="text-base font-medium">{RESULT_LABELS[view.result]}</h3>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        {view.reason_code ? (
          <>
            <dt>Reason code</dt>
            <dd>{denialLabel(view.reason_code)}</dd>
          </>
        ) : null}
        <dt>As of</dt>
        <dd>{formatCalendarDate(view.as_of_date)}</dd>
        <dt>Rule set</dt>
        <dd>
          {view.rule_set_id === null
            ? 'None for this date'
            : `${view.rule_set_id} v${String(view.rule_set_version ?? '')}`}
        </dd>
        <dt>Recorded</dt>
        <dd>
          <time dateTime={view.recorded_at}>{formatDateTime(view.recorded_at)}</time>
        </dd>
      </dl>
      {view.missing_items.length > 0 ? <MissingList items={view.missing_items} /> : null}
      <table className="w-full text-left">
        <caption className="sr-only">Rule results</caption>
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">Inputs</th>
            <th scope="col">Threshold</th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {view.rules.map((rule) => (
            <tr key={rule.rule_id} className="border-t align-top">
              <td>{rule.rule_id}</td>
              <td>
                {Object.entries(rule.inputs).map(([name, value]) => (
                  <div key={name}>{`${name}: ${value}`}</div>
                ))}
              </td>
              <td>{rule.threshold ?? '–'}</td>
              <td>{OUTCOME_LABELS[rule.outcome]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export function DeterminationSection({ detail }: { detail: CaseDetail }) {
  const determinations = useCaseDeterminations(detail.case_id)

  if (determinations.isPending) {
    return <LoadingState label="Loading determination…" />
  }
  if (determinations.isError) {
    return (
      <ErrorState
        error={determinations.error}
        onRetry={() => {
          void determinations.refetch()
        }}
      />
    )
  }
  if (determinations.data.items.length === 0) {
    return <p>No determination yet.</p>
  }
  return (
    <div className="space-y-3">
      {determinations.data.items.map((view) => (
        <Determination key={view.determination_id} view={view} />
      ))}
    </div>
  )
}
