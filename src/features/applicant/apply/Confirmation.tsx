import { Link } from 'react-router'
import type { CaseStatus } from '@/api/cases'
import { formatCalendarDate as day } from '@/lib/time'

export interface SentStub {
  employer: string
  fileName: string
}

export function Confirmation({
  status,
  stubs = [],
}: {
  status: CaseStatus
  stubs?: readonly SentStub[]
}) {
  return (
    <section aria-labelledby="confirmation-heading" className="space-y-3">
      <h2 id="confirmation-heading" className="text-xl font-semibold">
        Application received
      </h2>
      <p>
        Your case reference is <code>{status.case_id}</code>.
      </p>
      <p>
        We will decide by <strong>{day(status.decision_deadline)}</strong>.
      </p>
      {stubs.length > 0 ? (
        <div>
          <h3 className="font-medium">Pay stubs sent</h3>
          <ul className="list-disc pl-5 text-sm">
            {stubs.map((stub, index) => (
              <li key={index}>
                {stub.employer}: {stub.fileName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link
        to={`/applicant/cases/${status.case_id}`}
        className="text-primary underline underline-offset-4"
      >
        View your case
      </Link>
    </section>
  )
}
