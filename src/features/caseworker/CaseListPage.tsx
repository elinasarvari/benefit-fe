import { useState } from 'react'
import { Link } from 'react-router'
import { useCases, type CaseState } from '@/api/cases'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CASE_STATES, stateLabel } from '@/lib/caseLabels'
import { formatCalendarDate } from '@/lib/time'

export function CaseListPage() {
  const [state, setState] = useState<CaseState | ''>('')
  const cases = useCases(state === '' ? {} : { state })
  const items = cases.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section aria-labelledby="case-list-heading" className="space-y-4">
      <h2 id="case-list-heading" className="text-lg font-semibold">
        Cases
      </h2>
      <div className="max-w-xs space-y-1">
        <Label htmlFor="state-filter">State</Label>
        <Select
          id="state-filter"
          value={state}
          onChange={(event) => {
            setState(event.target.value as CaseState | '')
          }}
        >
          <option value="">Open cases</option>
          {CASE_STATES.map((option) => (
            <option key={option} value={option}>
              {stateLabel(option)}
            </option>
          ))}
        </Select>
      </div>
      {cases.isPending ? <LoadingState label="Loading cases…" /> : null}
      {cases.isError ? (
        <ErrorState
          error={cases.error}
          onRetry={() => {
            void cases.refetch()
          }}
        />
      ) : null}
      {cases.isSuccess && items.length === 0 ? <p>No cases to show.</p> : null}
      {items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Days remaining</TableHead>
              <TableHead>Decision due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.case_id}>
                <TableCell>
                  <Link
                    to={`/caseworker/cases/${item.case_id}`}
                    className="text-primary underline underline-offset-4"
                  >
                    {item.case_id}
                  </Link>
                </TableCell>
                <TableCell>{stateLabel(item.state)}</TableCell>
                <TableCell>
                  {item.days_remaining === null ? '—' : String(item.days_remaining)}{' '}
                  {item.at_risk ? <Badge variant="destructive">At risk</Badge> : null}
                </TableCell>
                <TableCell>{formatCalendarDate(item.decision_deadline)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      {cases.hasNextPage ? (
        <Button
          variant="outline"
          disabled={cases.isFetchingNextPage}
          onClick={() => {
            void cases.fetchNextPage()
          }}
        >
          {cases.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </section>
  )
}
