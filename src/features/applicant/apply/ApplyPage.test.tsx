import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { components } from '@/api/generated/schema'
import { fillValidApplication } from '@/test/applyForm'
import { CASE_ID, caseStatus } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

type Submission = components['schemas']['ApplicationSubmission']

describe('ApplyPage', () => {
  it('FR-001-23: double submit sends one request with one submission reference', async () => {
    const bodies: Submission[] = []
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    signedInAs('applicant')
    respondTo('POST /api/v1/applications', async (request) => {
      bodies.push((await request.json()) as Submission)
      await gate
      return jsonResponse(caseStatus({ state: 'submitted' }), 201)
    })
    const user = userEvent.setup()
    renderApp('/applicant/apply')
    await fillValidApplication(user)

    const send = screen.getByRole('button', { name: /send application/i })
    await user.click(send)
    await user.click(send)

    expect(await screen.findByRole('button', { name: /sending/i })).toBeDisabled()
    release()
    expect(await screen.findByRole('heading', { name: /application received/i })).toBeVisible()
    expect(bodies).toHaveLength(1)
    expect(bodies[0]?.submission_reference).toMatch(/^[0-9a-f-]{36}$/)
    expect(screen.getByText(CASE_ID)).toBeVisible()
  })

  it('FR-001-23: a retry after a server failure reuses the same submission reference', async () => {
    const references: string[] = []
    signedInAs('applicant')
    respondTo('POST /api/v1/applications', async (request) => {
      references.push(((await request.json()) as Submission).submission_reference)
      return references.length === 1
        ? errorResponse(503, 'dependency_unavailable', 'Try again shortly.')
        : jsonResponse(caseStatus({ state: 'submitted' }), 201)
    })
    const user = userEvent.setup()
    renderApp('/applicant/apply')
    await fillValidApplication(user)

    await user.click(screen.getByRole('button', { name: /send application/i }))
    expect(await screen.findByText('Try again shortly.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /send application/i }))

    await waitFor(() => {
      expect(references).toHaveLength(2)
    })
    expect(references[1]).toBe(references[0])
  })

  it('FR-001-25: a refused submission shows the reason and a link to the related case', async () => {
    signedInAs('applicant')
    respondTo('POST /api/v1/applications', () =>
      jsonResponse(
        {
          error: {
            code: 'conflict',
            message: 'Conflict',
            fields: [{ field: 'household', message: 'open', type: 'household_has_open_case' }],
            reference_id: 'ref-1',
            related_case_id: CASE_ID,
          },
        },
        409,
      ),
    )
    const user = userEvent.setup()
    renderApp('/applicant/apply')
    await fillValidApplication(user)

    await user.click(screen.getByRole('button', { name: /send application/i }))

    expect(await screen.findByText(/already has an open case/i)).toBeVisible()
    expect(screen.getByRole('link', { name: /related case/i })).toHaveAttribute(
      'href',
      `/applicant/cases/${CASE_ID}`,
    )
  })
})
