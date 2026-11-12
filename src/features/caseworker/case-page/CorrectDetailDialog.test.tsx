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
  DOCUMENT_ID,
  VERIFICATION_URL,
  documentView,
  reviewCase,
  verification,
} from '@/test/verificationFixtures'
import { CorrectDetailDialog } from './CorrectDetailDialog'
import { DocumentsSection } from './DocumentsSection'

function wrap(children: React.ReactNode) {
  return render(
    <QueryClientProvider client={createQueryClient({ navigate: () => undefined })}>
      {children}
    </QueryClientProvider>,
  )
}

describe('CorrectDetailDialog', () => {
  it('FR-002-19: correct and dismiss require a reason, send it, and refresh the verification query (correct)', async () => {
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

    await user.click(await screen.findByRole('button', { name: /correct a detail/i }))
    await user.type(screen.getByLabelText('Corrected value'), '350.00')
    await user.click(screen.getByRole('button', { name: 'Save correction' }))
    expect(await screen.findByText(/a reason is required to correct/i)).toBeVisible()
    expect(bodies).toHaveLength(0)

    await user.type(screen.getByLabelText(/^Reason/), 'Applicant showed the stub')
    await user.click(screen.getByRole('button', { name: 'Save correction' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).toMatchObject({
      action: 'correct_value',
      reason: 'Applicant showed the stub',
      corrected_value: { field_ref: `pay_stub:${DOCUMENT_ID}:gross_pay`, value: '350.00' },
    })
    await waitFor(() => {
      expect(reads).toBeGreaterThan(1) // the verification query was refreshed
    })
  })

  it('FR-002-19: a blank (whitespace) reason is refused without a request', async () => {
    const bodies: ReviewActionBody[] = []
    respondTo(`POST ${ACTION_URL}`, async (request) => {
      bodies.push((await request.json()) as ReviewActionBody)
      return new Response(null, { status: 202 })
    })
    const user = userEvent.setup()
    wrap(
      <CorrectDetailDialog
        caseId={CASE_ID}
        taskId={TASK_ID}
        document={documentView()}
        onClose={() => undefined}
      />,
    )

    await user.type(screen.getByLabelText('Corrected value'), '350.00')
    await user.type(screen.getByLabelText(/^Reason/), '   ')
    await user.click(screen.getByRole('button', { name: 'Save correction' }))

    expect(await screen.findByText(/a reason is required/i)).toBeVisible()
    expect(bodies).toHaveLength(0)
  })

  it('FR-002-19: action error (422, 409) is shown and the dialog stays open (correct)', async () => {
    const user = userEvent.setup()
    let status = 422
    respondTo(`POST ${ACTION_URL}`, () =>
      status === 422
        ? errorResponse(422, 'validation_failed', 'Some fields are invalid.')
        : errorResponse(409, 'conflict', 'This action is not allowed for this task.'),
    )
    wrap(
      <CorrectDetailDialog
        caseId={CASE_ID}
        taskId={TASK_ID}
        document={documentView()}
        onClose={() => undefined}
      />,
    )
    await user.type(screen.getByLabelText('Corrected value'), 'abc')
    await user.type(screen.getByLabelText(/^Reason/), 'Typo in the stub')

    await user.click(screen.getByRole('button', { name: 'Save correction' }))
    expect(await screen.findByText('Some fields are invalid.')).toBeVisible()
    expect(screen.getByRole('dialog')).toBeVisible()

    status = 409
    await user.click(screen.getByRole('button', { name: 'Save correction' }))
    expect(await screen.findByText('This action is not allowed for this task.')).toBeVisible()
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByLabelText('Corrected value')).toHaveValue('abc') // input kept
  })
})
