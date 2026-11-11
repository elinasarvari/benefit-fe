import { Link } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { refusalLabel } from '@/lib/caseLabels'

interface RefusalPanelProps {
  reason: string
  relatedCaseId: string | null
}

export function RefusalPanel({ reason, relatedCaseId }: RefusalPanelProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>We could not accept this application</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{refusalLabel(reason)}</p>
        {relatedCaseId ? (
          <Link
            to={`/applicant/cases/${relatedCaseId}`}
            className="text-primary underline underline-offset-4"
          >
            View the related case
          </Link>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
