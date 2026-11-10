import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { errorResponse, respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

describe('RequireRole', () => {
  it('FR-000-05: redirects an applicant away from /caseworker', async () => {
    signedInAs('applicant')

    const { router } = renderApp('/caseworker')

    expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /caseworker console/i })).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/forbidden')
  })

  it('FR-000-05: lets a supervisor into caseworker routes', async () => {
    signedInAs('supervisor')

    renderApp('/caseworker')

    expect(await screen.findByRole('heading', { name: /caseworker console/i })).toBeInTheDocument()
  })

  it('FR-000-05: lets a caseworker into caseworker routes', async () => {
    signedInAs('caseworker')

    renderApp('/caseworker')

    expect(await screen.findByRole('heading', { name: /caseworker console/i })).toBeInTheDocument()
  })

  it('FR-000-05: lets an applicant into applicant routes', async () => {
    signedInAs('applicant')

    renderApp('/applicant')

    expect(await screen.findByRole('heading', { name: /applicant portal/i })).toBeInTheDocument()
  })

  it('FR-000-05: refuses a supervisor on applicant routes', async () => {
    signedInAs('supervisor')

    const { router } = renderApp('/applicant')

    expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/forbidden')
  })

  it('FR-000-06: sends a signed-out visitor to sign-in with a required notice', async () => {
    const { router } = renderApp('/caseworker')

    expect(await screen.findByText(/sign in to continue/i)).toBeInTheDocument()
    expect(router.state.location.pathname + router.state.location.search).toBe(
      '/sign-in?reason=required',
    )
  })

  it('FR-000-07: sends an expired session to sign-in with an expired notice', async () => {
    respondTo('GET /api/v1/auth/me', () =>
      errorResponse(401, 'auth.session_expired', 'Your session has expired.'),
    )

    const { router } = renderApp('/caseworker')

    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument()
    expect(router.state.location.search).toBe('?reason=expired')
  })

  it('FR-000-08: shows the error message and reference ID when the session check fails', async () => {
    respondTo('GET /api/v1/auth/me', () =>
      errorResponse(500, 'internal_error', 'Something went wrong on our side.', 'ref-1234'),
    )

    renderApp('/caseworker')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong on our side.')
    expect(alert).toHaveTextContent('ref-1234')
  })
})
