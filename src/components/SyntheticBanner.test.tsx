import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

describe('SyntheticBanner', () => {
  it.each([
    ['/', /sign in/i],
    ['/sign-in', /sign in/i],
  ])(
    'FR-000-14: shows the SYNTHETIC banner when a signed-out visitor opens %s',
    async (path, page) => {
      renderApp(path)

      expect(await screen.findByRole('heading', { name: page })).toBeInTheDocument()
      expect(await screen.findByRole('region', { name: /synthetic/i })).toHaveTextContent(
        /synthetic/i,
      )
    },
  )

  it.each([
    ['caseworker', '/caseworker', /caseworker console/i],
    ['applicant', '/applicant', /applicant portal/i],
    ['caseworker', '/no-such-page', /page not found/i],
    ['applicant', '/forbidden', /access denied/i],
  ] as const)(
    'FR-000-14: shows the SYNTHETIC banner when a signed-in %s opens %s',
    async (role, path, page) => {
      signedInAs(role)

      renderApp(path)

      expect(await screen.findByRole('heading', { name: page })).toBeInTheDocument()
      expect(await screen.findByRole('region', { name: /synthetic/i })).toHaveTextContent(
        /synthetic/i,
      )
    },
  )

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
