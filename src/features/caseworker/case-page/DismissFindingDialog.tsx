import { useQueryClient } from '@tanstack/react-query'
import { useState, type SyntheticEvent } from 'react'
import { useReviewAction } from '@/api/cases'
import { caseVerificationKey, type Finding } from '@/api/documents'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_REASON = 500

interface DismissFindingDialogProps {
  caseId: string
  taskId: string
  finding: Finding
  onClose: () => void
}

// A dismissal needs a reason and is recorded with the reviewer and time (FR-002-19, ADR-002-06).
export function DismissFindingDialog({
  caseId,
  taskId,
  finding,
  onClose,
}: DismissFindingDialogProps) {
  const queryClient = useQueryClient()
  const act = useReviewAction(caseId, taskId)
  const [reason, setReason] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [requestId] = useState(() => crypto.randomUUID())

  const handleSubmit = (event: SyntheticEvent): void => {
    event.preventDefault()
    const trimmed = reason.trim()
    if (trimmed.length === 0) {
      setProblem('A reason is required to dismiss a finding.')
      return
    }
    if (trimmed.length > MAX_REASON) {
      setProblem(`The reason must be at most ${String(MAX_REASON)} characters.`)
      return
    }
    setProblem(null)
    act.mutate(
      {
        action: 'dismiss_finding',
        request_id: requestId,
        reason: trimmed,
        finding_id: finding.finding_id,
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
        <DialogTitle>Dismiss finding</DialogTitle>
        <DialogDescription>
          The finding stays on record with your reason, your name and the time.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="space-y-1">
            <Label htmlFor="dismiss-reason">Reason (required)</Label>
            <Textarea
              id="dismiss-reason"
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
              {act.isPending ? 'Sending…' : 'Dismiss finding'}
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
