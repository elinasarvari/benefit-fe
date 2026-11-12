import { useQueryClient } from '@tanstack/react-query'
import { useState, type SyntheticEvent } from 'react'
import { useReviewAction } from '@/api/cases'
import { caseVerificationKey, type DocumentView } from '@/api/documents'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const MAX_REASON = 500
const FIELDS = [
  { value: 'employee_name', label: 'Employee name' },
  { value: 'employer', label: 'Employer' },
  { value: 'frequency', label: 'Pay frequency (weekly, biweekly, semimonthly, monthly)' },
  { value: 'gross_pay', label: 'Gross pay' },
  { value: 'pay_date', label: 'Pay date (YYYY-MM-DD)' },
] as const
type Field = (typeof FIELDS)[number]['value']

interface CorrectDetailDialogProps {
  caseId: string
  taskId: string
  document: DocumentView
  onClose: () => void
}

// A correction needs a reason and is recorded with the reviewer and time (FR-002-19, ADR-002-06).
export function CorrectDetailDialog({
  caseId,
  taskId,
  document,
  onClose,
}: CorrectDetailDialogProps) {
  const queryClient = useQueryClient()
  const act = useReviewAction(caseId, taskId)
  const [field, setField] = useState<Field>('gross_pay')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  // One id per attempt: a repeated click or retry is the same action to the workflow.
  const [requestId] = useState(() => crypto.randomUUID())

  const handleSubmit = (event: SyntheticEvent): void => {
    event.preventDefault()
    const trimmed = reason.trim()
    if (value.trim().length === 0) {
      setProblem('Enter the corrected value.')
      return
    }
    if (trimmed.length === 0) {
      setProblem('A reason is required to correct a detail.')
      return
    }
    if (trimmed.length > MAX_REASON) {
      setProblem(`The reason must be at most ${String(MAX_REASON)} characters.`)
      return
    }
    setProblem(null)
    act.mutate(
      {
        action: 'correct_value',
        request_id: requestId,
        reason: trimmed,
        corrected_value: {
          field_ref: `pay_stub:${document.document_id}:${field}`,
          value: value.trim(),
        },
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: caseVerificationKey(caseId) })
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogTitle>Correct a detail</DialogTitle>
        <DialogDescription>
          Correct what was entered for the {document.details.employer} pay stub. The check runs
          again with the new value.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="correct-field">Detail to correct</Label>
            <Select
              id="correct-field"
              value={field}
              onChange={(event) => {
                setField(event.target.value as Field)
              }}
            >
              {FIELDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="correct-value">Corrected value</Label>
            <Input
              id="correct-value"
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="correct-reason">Reason (required)</Label>
            <Textarea
              id="correct-reason"
              value={reason}
              aria-invalid={problem !== null}
              onChange={(event) => {
                setReason(event.target.value)
              }}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length} of {MAX_REASON} characters. Never enter real personal details.
            </p>
          </div>
          {problem === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          )}
          {act.isError ? <ErrorState error={act.error} /> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={act.isPending}>
              {act.isPending ? 'Sending…' : 'Save correction'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
