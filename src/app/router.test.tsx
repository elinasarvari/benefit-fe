import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/api/queryClient'
import { resetFakeApi, signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'
import { shellRoute } from './router'

function Boom(): never {
  throw new Error('SELECT secret FROM internal_table')
}

describe('router error boundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('FR-000-14: keeps the SYNTHETIC banner and a main landmark when a page throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const router = createMemoryRouter([shellRoute([{ path: 'boom', element: <Boom /> }])], {
      initialEntries: ['/boom'],
    })

    render(
      <QueryClientProvider client={createQueryClient({ navigate: vi.fn() })}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/something went wrong/i)
    expect(alert).not.toHaveTextContent(/SELECT|internal_table/)
    expect(screen.getByRole('region', { name: /synthetic/i })).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(alert)
  })
})

describe('role guards on the case routes', () => {
  it('FR-001-26: applicant and caseworker routes sit under their role guards', async () => {
    signedInAs('applicant')
    const applicant = renderApp('/caseworker/cases/11111111-2222-4333-8444-555555555555')
    await waitFor(() => {
      expect(applicant.router.state.location.pathname).toBe('/forbidden')
    })
    applicant.unmount()

    signedInAs('caseworker')
    const caseworker = renderApp('/applicant/apply')
    await waitFor(() => {
      expect(caseworker.router.state.location.pathname).toBe('/forbidden')
    })
    caseworker.unmount()

    resetFakeApi()
    const anonymous = renderApp('/applicant/cases/11111111-2222-4333-8444-555555555555')
    await waitFor(() => {
      expect(anonymous.router.state.location.pathname).toBe('/sign-in')
    })
  })
})

describe('route pages', () => {
  it.each([
    ['/sign-in', null, 'Sign in - Benefit Case Platform'],
    ['/caseworker', 'caseworker', 'Caseworker console - Benefit Case Platform'],
    ['/applicant', 'applicant', 'Applicant portal - Benefit Case Platform'],
    ['/forbidden', 'applicant', 'Access denied - Benefit Case Platform'],
    ['/no-such-page', 'caseworker', 'Page not found - Benefit Case Platform'],
  ] as const)(
    'sets the title and focuses the heading when opening %s',
    async (path, role, title) => {
      if (role) {
        signedInAs(role)
      }

      renderApp(path)

      const heading = await screen.findByRole('heading', { level: 1 })
      expect(document.title).toBe(title)
      expect(heading).toHaveFocus()
    },
  )
})
