import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { components } from '@/api/generated/schema'
import { errorResponse, jsonResponse, respondTo, sessionFor, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

async function signIn(username: string, password: string) {
  await userEvent.type(await screen.findByLabelText(/username/i), username)
  await userEvent.type(screen.getByLabelText(/password/i), password)
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('SignInPage', () => {
  it('FR-000-21: signs in and routes caseworker to /caseworker', async () => {
    let body: components['schemas']['LoginRequest'] | undefined
    respondTo('POST /api/v1/auth/login', async (request) => {
      body = (await request.json()) as components['schemas']['LoginRequest']
      signedInAs('caseworker')
      return jsonResponse(sessionFor('caseworker'))
    })
    const { router } = renderApp('/sign-in')

    await signIn('caseworker1', 'not-a-real-password')

    expect(await screen.findByRole('heading', { name: /caseworker console/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/caseworker')
    expect(body).toEqual({ username: 'caseworker1', password: 'not-a-real-password' })
  })

  it('FR-000-21: routes an applicant to /applicant when signing in', async () => {
    respondTo('POST /api/v1/auth/login', () => {
      signedInAs('applicant')
      return jsonResponse(sessionFor('applicant'))
    })
    const { router } = renderApp('/sign-in')

    await signIn('applicant1', 'not-a-real-password')

    expect(await screen.findByRole('heading', { name: /applicant portal/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/applicant')
  })

  it('FR-000-21: uses the sign-in response as the session without calling /auth/me again', async () => {
    let meCalls = 0
    respondTo('GET /api/v1/auth/me', () => {
      meCalls += 1
      return errorResponse(401, 'auth.required', 'Sign in to continue.')
    })
    respondTo('POST /api/v1/auth/login', () => jsonResponse(sessionFor('caseworker')))
    renderApp('/sign-in')
    await screen.findByLabelText(/username/i)
    await waitFor(() => {
      expect(meCalls).toBe(1)
    })

    await signIn('caseworker1', 'not-a-real-password')

    expect(await screen.findByRole('heading', { name: /caseworker console/i })).toBeInTheDocument()
    expect(meCalls).toBe(1)
  })

  it.each([
    ['caseworker', '/caseworker'],
    ['applicant', '/applicant'],
  ] as const)('FR-000-21: redirects a signed-in %s from /sign-in to %s', async (role, home) => {
    signedInAs(role)

    const { router } = renderApp('/sign-in')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(home)
    })
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument()
  })

  it('FR-000-21: shows the error message and reference ID on invalid credentials', async () => {
    respondTo('POST /api/v1/auth/login', () =>
      errorResponse(401, 'auth.invalid_credentials', 'Invalid username or password.', 'ref-5678'),
    )
    const { router } = renderApp('/sign-in')

    await signIn('caseworker1', 'wrong-password')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Invalid username or password.')
    expect(alert).toHaveTextContent('ref-5678')
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(screen.getByLabelText(/username/i)).toHaveValue('caseworker1')
  })

  it('FR-000-07: shows an expired-session notice when reason is expired', async () => {
    renderApp('/sign-in?reason=expired')

    expect(await screen.findByText(/your session has expired/i)).toBeInTheDocument()
  })

  it('FR-000-06: shows a sign-in-required notice when reason is required', async () => {
    renderApp('/sign-in?reason=required')

    expect(await screen.findByText(/sign in to continue/i)).toBeInTheDocument()
  })

  it.each(['__proto__', 'constructor', 'toString', 'unknown'])(
    'shows no notice and still renders the form when reason is %s',
    async (reason) => {
      renderApp(`/sign-in?reason=${reason}`)

      expect(await screen.findByLabelText(/username/i)).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    },
  )

  it('shows no notice when there is no reason', async () => {
    renderApp('/sign-in')

    await screen.findByLabelText(/username/i)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
