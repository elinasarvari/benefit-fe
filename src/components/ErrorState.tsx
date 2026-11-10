import { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'

const GENERIC_MESSAGE = 'Something went wrong. Please try again.'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const apiError = error instanceof ApiError ? error : null

  return (
    <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 p-4">
      <p className="font-medium text-destructive">{apiError?.message ?? GENERIC_MESSAGE}</p>
      {apiError?.referenceId ? (
        <p className="text-sm text-muted-foreground">
          Reference ID: <code>{apiError.referenceId}</code>
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
