import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { respondTo, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

describe('AppShell', () => {
  it('shows no sign-out button when nobody is signed in', async () => {
    renderApp('/sign-in')

    await screen.findByRole('heading', { name: /sign in/i })

    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('signs out and returns to sign-in when the sign-out button is pressed', async () => {
    signedInAs('caseworker')
    let loggedOut = false
    respondTo('POST /api/v1/auth/logout', () => {
      loggedOut = true
      return new Response(null, { status: 204 })
    })
    const { router } = renderApp('/caseworker')

    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(loggedOut).toBe(true)
    expect(router.state.location.pathname).toBe('/sign-in')
  })
})
