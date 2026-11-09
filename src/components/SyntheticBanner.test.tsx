import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

describe('SyntheticBanner', () => {
  it.each([
    ['/', 'the root'],
    ['/sign-in', 'sign-in'],
    ['/caseworker', 'the caseworker area'],
    ['/applicant', 'the applicant area'],
    ['/no-such-page', 'an unknown route'],
  ])('FR-000-14: shows the SYNTHETIC banner on every route when visiting %s (%s)', async (path) => {
    renderApp(path)

    const banner = await screen.findByRole('region', { name: /synthetic/i })

    expect(banner).toHaveTextContent(/synthetic/i)
  })

  it('FR-000-14: cannot be dismissed when rendered', async () => {
    renderApp('/sign-in')

    const banner = await screen.findByRole('region', { name: /synthetic/i })

    expect(within(banner).queryByRole('button')).not.toBeInTheDocument()
  })

  it('FR-000-14: keeps a single banner when navigating from the root to sign-in', async () => {
    renderApp('/')

    await screen.findByRole('heading', { name: /sign in/i })

    expect(screen.getAllByRole('region', { name: /synthetic/i })).toHaveLength(1)
  })
})
