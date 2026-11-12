import { useState } from 'react'
import type { CaseDetail } from '@/api/cases'
import {
  useCaseVerification,
  type DocumentView,
  type Finding,
  type MissingDocument,
} from '@/api/documents'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { formatCalendarDate, formatDateTime } from '@/lib/time'
import { CorrectDetailDialog } from './CorrectDetailDialog'
import { DismissFindingDialog } from './DismissFindingDialog'

const CAUSE_LABELS: Record<Finding['cause'], string> = {
  income_mismatch: 'Income does not match the pay stub',
  different_person: 'Pay stub is for a different person',
  conflicting_stubs: 'Pay stubs conflict',
  identity_mismatch: 'Identity does not match the reference record',
}

const MISSING_LABELS: Record<MissingDocument['kind'], string> = {
  no_stub: 'No pay stub for this job',
  stub_too_old: 'Latest pay stub is older than 45 days',
}

const FREQUENCY_LABELS: Record<DocumentView['details']['frequency'], string> = {
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  semimonthly: 'Twice a month',
  monthly: 'Monthly',
}

const FILE_LABELS: Record<DocumentView['content_type'], string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
}

function Stub({ document, onCorrect }: { document: DocumentView; onCorrect: (() => void) | null }) {
  const { details } = document
  return (
    <li className="space-y-1 rounded-lg border p-3 text-sm">
      <p className="font-medium">
        {details.employer} ({FILE_LABELS[document.content_type]})
      </p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        <dt>Employee name</dt>
        <dd>{details.employee_name}</dd>
        <dt>Employer</dt>
        <dd>{details.employer}</dd>
        <dt>Pay frequency</dt>
        <dd>{FREQUENCY_LABELS[details.frequency]}</dd>
        <dt>Gross pay</dt>
        <dd>{details.gross_pay}</dd>
        <dt>Pay date</dt>
        <dd>{formatCalendarDate(details.pay_date)}</dd>
        <dt>Uploaded</dt>
        <dd>
          <time dateTime={document.uploaded_at}>{formatDateTime(document.uploaded_at)}</time>
        </dd>
      </dl>
      {(details.corrections ?? []).length > 0 ? (
        <ul aria-label="Corrections" className="list-disc pl-5">
          {(details.corrections ?? []).map((correction) => (
            <li key={`${correction.field}-${correction.corrected_at}`}>
              Corrected {correction.field.replace('_', ' ')} from {correction.old_value} to{' '}
              {correction.new_value}: {correction.reason}
            </li>
          ))}
        </ul>
      ) : null}
      {onCorrect ? (
        <Button type="button" variant="outline" size="sm" onClick={onCorrect}>
          Correct a detail of the {details.employer} pay stub
        </Button>
      ) : null}
    </li>
  )
}

function FindingItem({ finding, onDismiss }: { finding: Finding; onDismiss: (() => void) | null }) {
  return (
    <li className="space-y-1 rounded-lg border p-3 text-sm">
      <p className="font-medium">{CAUSE_LABELS[finding.cause]}</p>
      {finding.declared_monthly != null || finding.documented_monthly != null ? (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
          <dt>Declared monthly income</dt>
          <dd>{finding.declared_monthly ?? 'None'}</dd>
          <dt>Documented monthly income</dt>
          <dd>{finding.documented_monthly ?? 'None'}</dd>
        </dl>
      ) : null}
      {finding.conversion ? <p>Conversion: {finding.conversion}</p> : null}
      {finding.identity === 'no_record' ? <p>No reference record was found.</p> : null}
      {finding.dismissed ? (
        <p>
          Dismissed on{' '}
          <time dateTime={finding.dismissed.dismissed_at}>
            {formatDateTime(finding.dismissed.dismissed_at)}
          </time>
          : {finding.dismissed.reason}
        </p>
      ) : onDismiss ? (
        <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
          Dismiss this finding
        </Button>
      ) : null}
    </li>
  )
}

export function DocumentsSection({ detail }: { detail: CaseDetail }) {
  const query = useCaseVerification(detail.case_id)
  const [correcting, setCorrecting] = useState<DocumentView | null>(null)
  const [dismissing, setDismissing] = useState<Finding | null>(null)

  if (query.isPending) {
    return <LoadingState label="Loading documents…" />
  }
  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }
  const { documents, result } = query.data
  if (documents.length === 0 && result === null) {
    return <p>No pay stubs have been uploaded for this case, and no check has run.</p>
  }
  const task = detail.open_review_task
  const taskId = task?.task_id ?? null
  const canCorrect = taskId !== null && task?.allowed_actions.includes('correct_value') === true
  const canDismiss = taskId !== null && task?.allowed_actions.includes('dismiss_finding') === true

  return (
    <div className="space-y-4">
      <ul aria-label="Pay stubs" className="space-y-2">
        {documents.map((document) => (
          <Stub
            key={document.document_id}
            document={document}
            onCorrect={
              canCorrect
                ? () => {
                    setCorrecting(document)
                  }
                : null
            }
          />
        ))}
      </ul>
      {result === null ? (
        <p>The check has not run yet.</p>
      ) : (
        <div className="space-y-2">
          <h3 className="font-medium">
            Check result:{' '}
            {result.needs_review ? 'needs review' : result.complete ? 'complete' : 'incomplete'}
          </h3>
          {(result.findings ?? []).length > 0 ? (
            <ul aria-label="Findings" className="space-y-2">
              {(result.findings ?? []).map((finding) => (
                <FindingItem
                  key={finding.finding_id}
                  finding={finding}
                  onDismiss={
                    canDismiss && !finding.dismissed
                      ? () => {
                          setDismissing(finding)
                        }
                      : null
                  }
                />
              ))}
            </ul>
          ) : (
            <p>No findings.</p>
          )}
          {(result.missing_items ?? []).length > 0 ? (
            <ul aria-label="Missing documents" className="list-disc pl-5 text-sm">
              {(result.missing_items ?? []).map((item) => (
                <li key={`${item.member_id}-${item.job_id}`}>{MISSING_LABELS[item.kind]}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      {taskId !== null && correcting ? (
        <CorrectDetailDialog
          caseId={detail.case_id}
          taskId={taskId}
          document={correcting}
          onClose={() => {
            setCorrecting(null)
          }}
        />
      ) : null}
      {taskId !== null && dismissing ? (
        <DismissFindingDialog
          caseId={detail.case_id}
          taskId={taskId}
          finding={dismissing}
          onClose={() => {
            setDismissing(null)
          }}
        />
      ) : null}
    </div>
  )
}
