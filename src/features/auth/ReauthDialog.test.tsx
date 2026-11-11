import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { components } from '@/api/generated/schema'
import { fillValidApplication } from '@/test/applyForm'
import { caseStatus } from '@/test/caseFixtures'
import { errorResponse, jsonResponse, respondTo, sessionFor, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

type Submission = components['schemas']['ApplicationSubmission']

// First POST: session expired. Later POSTs succeed. Returns the submissions the server saw.
function expireOnFirstSubmit(): Submission[] {
  const seen: Submission[] = []
  respondTo('POST /api/v1/applications', async (request) => {
    seen.push((await request.json()) as Submission)
    return seen.length === 1
      ? errorResponse(401, 'auth.session_expired', 'Your session has expired.')
      : jsonResponse(caseStatus({ state: 'submitted' }), 201)
  })
  return seen
}

async function signInAgain(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('dialog', { name: /sign in again/i })
  await user.type(screen.getByLabelText('Username'), 'applicant1')
  await user.type(screen.getByLabelText('Password'), 'not-a-real-password')
  await user.click(screen.getByRole('button', { name: /^sign in$/i }))
  return dialog
}

async function expireAndOpenDialog() {
  signedInAs('applicant')
  const seen = expireOnFirstSubmit()
  const user = userEvent.setup()
  const { router, navigate } = renderApp('/applicant/apply')
  await fillValidApplication(user)
  await user.click(screen.getByRole('button', { name: /send application/i }))
  await screen.findByRole('dialog', { name: /sign in again/i })
  return { seen, user, router, navigate }
}

describe('ReauthDialog', () => {
  it('FR-001-24: session expiry on submit opens the sign-in dialog and keeps every entry', async () => {
    const { router, navigate } = await expireAndOpenDialog()

    expect(router.state.location.pathname).toBe('/applicant/apply')
    expect(navigate).not.toHaveBeenCalled()
    // The dialog makes the page behind it inert for assistive technology; read the values anyway.
    expect(screen.getByLabelText('Member 1 full name', { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Synthetic Person', { exact: true })).toBeInTheDocument()
    expect(screen.getByDisplayValue('62701')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1980-01-01')).toBeInTheDocument()
    expect(window.sessionStorage).toHaveLength(0)
    expect(window.localStorage).toHaveLength(0)
  })

  it('FR-001-24: same user signing in again retries with the same submission reference', async () => {
    const { seen, user } = await expireAndOpenDialog()
    respondTo('POST /api/v1/auth/login', () => jsonResponse(sessionFor('applicant')))

    await signInAgain(user)

    expect(await screen.findByRole('heading', { name: /application received/i })).toBeVisible()
    expect(seen).toHaveLength(2)
    expect(seen[1]?.submission_reference).toBe(seen[0]?.submission_reference)
    expect(seen[1]?.form).toEqual(seen[0]?.form)
    expect(window.sessionStorage).toHaveLength(0)
    expect(window.localStorage).toHaveLength(0)
  })

  it('FR-001-24: a different user signing in discards the entries', async () => {
    const { seen, user } = await expireAndOpenDialog()
    const other = sessionFor('applicant')
    respondTo('POST /api/v1/auth/login', () =>
      jsonResponse({
        ...other,
        user: { ...other.user, id: '00000000-0000-4000-8000-000000000002', username: 'applicant2' },
      }),
    )

    await signInAgain(user)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByLabelText('Member 1 full name')).toHaveValue('')
    expect(screen.getByLabelText('ZIP code')).toHaveValue('')
    expect(seen).toHaveLength(1)
  })
})
