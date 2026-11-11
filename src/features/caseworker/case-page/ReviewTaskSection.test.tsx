import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { components } from '@/api/generated/schema'
import { CASE_ID, TASK_ID, caseDetail } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

type ActionBody = components['schemas']['ReviewActionBody']

const actionsPath = `POST /api/v1/cases/${CASE_ID}/review-tasks/${TASK_ID}/actions`

const withTask = () =>
  caseDetail({
    state: 'under_review',
    open_review_task: {
      task_id: TASK_ID,
      reason: 'adverse_determination',
      allowed_actions: ['approve_denial', 'override_to_approve'],
    },
  })

function openCase(detail = withTask()) {
  signedInAs('caseworker')
  respondTo(`GET /api/v1/cases/${CASE_ID}`, () => jsonResponse(detail))
  respondTo(`GET /api/v1/cases/${CASE_ID}/history`, () =>
    jsonResponse({ items: [], next_cursor: null }),
  )
  renderApp(`/caseworker/cases/${CASE_ID}`)
}

describe('ReviewTaskSection', () => {
  it('FR-001-09: review task section offers approve denial and override with a required reason', async () => {
    const bodies: ActionBody[] = []
    respondTo(actionsPath, async (request) => {
      bodies.push((await request.json()) as ActionBody)
      return new Response(null, { status: 202 })
    })
    const user = userEvent.setup()
    openCase()

    expect(await screen.findByRole('radio', { name: 'Approve the denial' })).toBeVisible()
    await user.click(screen.getByRole('radio', { name: 'Override and approve' }))
    await user.click(screen.getByRole('button', { name: /submit decision/i }))
    expect(await screen.findByText('A reason is required to override.')).toBeVisible()

    await user.click(screen.getByLabelText(/reason/i))
    await user.paste('x'.repeat(501))
    await user.click(screen.getByRole('button', { name: /submit decision/i }))
    expect(await screen.findByText(/at most 500 characters/i)).toBeVisible()
    expect(bodies).toHaveLength(0)

    await user.clear(screen.getByLabelText(/reason/i))
    await user.type(screen.getByLabelText(/reason/i), 'Verified by phone')
    await user.click(screen.getByRole('button', { name: /submit decision/i }))

    await waitFor(() => {
      expect(bodies).toHaveLength(1)
    })
    expect(bodies[0]).toMatchObject({ action: 'override_to_approve', reason: 'Verified by phone' })
    expect(bodies[0]?.request_id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('FR-001-09: no open review task means no review task section', async () => {
    openCase(caseDetail())

    await screen.findByRole('region', { name: 'Status' })

    expect(screen.queryByRole('region', { name: 'Review task' })).not.toBeInTheDocument()
  })

  it('FR-001-27: review action shows the API message on 409 and refreshes the case after 202', async () => {
    let reads = 0
    const user = userEvent.setup()
    signedInAs('caseworker')
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () => {
      reads += 1
      return jsonResponse(
        reads === 1
          ? withTask()
          : caseDetail({ state: 'decided', outcome: 'denied', days_remaining: null }),
      )
    })
    respondTo(`GET /api/v1/cases/${CASE_ID}/history`, () =>
      jsonResponse({ items: [], next_cursor: null }),
    )
    let calls = 0
    respondTo(actionsPath, () => {
      calls += 1
      return calls === 1
        ? errorResponse(409, 'conflict', 'This task is no longer open for that action.')
        : new Response(null, { status: 202 })
    })
    renderApp(`/caseworker/cases/${CASE_ID}`)

    await user.click(await screen.findByRole('radio', { name: 'Approve the denial' }))
    await user.click(screen.getByRole('button', { name: /submit decision/i }))
    expect(await screen.findByText('This task is no longer open for that action.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: /submit decision/i }))

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Review task' })).not.toBeInTheDocument()
    })
    expect(reads).toBeGreaterThan(1)
    expect(screen.getByText('Denied')).toBeVisible()
  })
})
