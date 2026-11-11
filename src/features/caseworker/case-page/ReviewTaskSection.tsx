import { useState, type SyntheticEvent } from 'react'
import { useReviewAction, type CaseDetail, type ReviewActionBody } from '@/api/cases'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { actionLabel, reviewReasonLabel } from '@/lib/caseLabels'

const MAX_REASON = 500
const ACTIONS: readonly ReviewActionBody['action'][] = ['approve_denial', 'override_to_approve']

export function ReviewTaskSection({ detail }: { detail: CaseDetail }) {
  const task = detail.open_review_task
  if (!task) {
    return null
  }
  return <ReviewTaskForm caseId={detail.case_id} task={task} />
}

function ReviewTaskForm({
  caseId,
  task,
}: {
  caseId: string
  task: NonNullable<CaseDetail['open_review_task']>
}) {
  const act = useReviewAction(caseId, task.task_id)
  const [action, setAction] = useState<ReviewActionBody['action'] | ''>('')
  const [reason, setReason] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  // One id per attempt: a repeated click or retry is the same action to the workflow (R10).
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const offered = ACTIONS.filter((candidate) => task.allowed_actions.includes(candidate))

  const handleSubmit = (event: SyntheticEvent): void => {
    event.preventDefault()
    if (action === '') {
      setProblem('Choose an action.')
      return
    }
    const trimmed = reason.trim()
    if (action === 'override_to_approve' && trimmed.length === 0) {
      setProblem('A reason is required to override.')
      return
    }
    if (trimmed.length > MAX_REASON) {
      setProblem(`The reason must be at most ${String(MAX_REASON)} characters.`)
      return
    }
    setProblem(null)
    act.mutate(
      { action, request_id: requestId, ...(trimmed ? { reason: trimmed } : {}) },
      {
        onSuccess: () => {
          setRequestId(crypto.randomUUID())
          setReason('')
          setAction('')
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <p>Why this needs review: {reviewReasonLabel(task.reason)}</p>
      <RadioGroup
        aria-label="Action"
        value={action}
        onValueChange={(value) => {
          setAction(value as ReviewActionBody['action'])
        }}
      >
        {offered.map((candidate) => (
          <div key={candidate} className="flex items-center gap-2">
            <RadioGroupItem id={`action-${candidate}`} value={candidate} />
            <Label htmlFor={`action-${candidate}`}>{actionLabel(candidate)}</Label>
          </div>
        ))}
      </RadioGroup>
      <div className="space-y-1">
        <Label htmlFor="review-reason">
          Reason {action === 'override_to_approve' ? '(required)' : '(optional)'}
        </Label>
        <Textarea
          id="review-reason"
          value={reason}
          aria-invalid={problem !== null}
          {...(problem === null ? {} : { 'aria-describedby': 'review-reason-error' })}
          onChange={(event) => {
            setReason(event.target.value)
          }}
        />
        <p className="text-xs text-muted-foreground">
          {reason.length} of {MAX_REASON} characters. Never enter real personal details.
        </p>
        {problem === null ? null : (
          <p id="review-reason-error" className="text-sm text-destructive">
            {problem}
          </p>
        )}
      </div>
      {act.isError ? <ErrorState error={act.error} /> : null}
      <Button type="submit" disabled={act.isPending}>
        {act.isPending ? 'Sending…' : 'Submit decision'}
      </Button>
    </form>
  )
}
