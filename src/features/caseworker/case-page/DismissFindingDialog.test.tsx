import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ReviewActionBody } from '@/api/cases'
import { createQueryClient } from '@/api/queryClient'
import { CASE_ID, TASK_ID } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo } from '@/test/fakeApi'
import {
  ACTION_URL,
  FINDING_ID,
  VERIFICATION_URL,
  finding,
  reviewCase,
  verification,
} from '@/test/verificationFixtures'
import { DismissFindingDialog } from './DismissFindingDialog'
import { DocumentsSection } from './DocumentsSection'

function wrap(children: React.ReactNode) {
  return render(
    <QueryClientProvider client={createQueryClient({ navigate: () => undefined })}>
      {children}
    </QueryClientProvider>,
  )
}

describe('DismissFindingDialog', () => {
  it('FR-002-19: correct and dismiss require a reason, send it, and refresh the verification query (dismiss)', async () => {
    const bodies: ReviewActionBody[] = []
    let reads = 0
    respondTo(`GET ${VERIFICATION_URL}`, () => {
      reads += 1
      return jsonResponse(verification())
    })
    respondTo(`POST ${ACTION_URL}`, async (request) => {
      bodies.push((await request.json()) as ReviewActionBody)
      return new Response(null, { status: 202 })
    })
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () => jsonResponse(reviewCase()))
    const user = userEvent.setup()
    wrap(<DocumentsSection detail={reviewCase()} />)

    await user.click(await screen.findByRole('button', { name: /dismiss this finding/i }))
    await user.click(screen.getByRole('button', { name: 'Dismiss finding' }))
    expect(await screen.findByText(/a reason is required to dismiss/i)).toBeVisible()
    expect(bodies).toHaveLength(0)

    await user.type(screen.getByLabelText(/^Reason/), 'Second job confirmed by phone')
    await user.click(screen.getByRole('button', { name: 'Dismiss finding' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(bodies).toEqual([
      expect.objectContaining({
        action: 'dismiss_finding',
        finding_id: FINDING_ID,
        reason: 'Second job confirmed by phone',
      }),
    ])
    await waitFor(() => {
      expect(reads).toBeGreaterThan(1)
    })
  })

  it('FR-002-19: action error (422, 409) is shown and the dialog stays open (dismiss)', async () => {
    const user = userEvent.setup()
    let status = 409
    respondTo(`POST ${ACTION_URL}`, () =>
      status === 409
        ? errorResponse(409, 'conflict', 'This action is not allowed for this task.')
        : errorResponse(422, 'validation_failed', 'Some fields are invalid.'),
    )
    wrap(
      <DismissFindingDialog
        caseId={CASE_ID}
        taskId={TASK_ID}
        finding={finding()}
        onClose={() => undefined}
      />,
    )
    await user.type(screen.getByLabelText(/^Reason/), 'Checked with the applicant')

    await user.click(screen.getByRole('button', { name: 'Dismiss finding' }))
    expect(await screen.findByText('This action is not allowed for this task.')).toBeVisible()
    expect(screen.getByRole('dialog')).toBeVisible()

    status = 422
    await user.click(screen.getByRole('button', { name: 'Dismiss finding' }))
    expect(await screen.findByText('Some fields are invalid.')).toBeVisible()
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByLabelText(/^Reason/)).toHaveValue('Checked with the applicant')
  })
})
