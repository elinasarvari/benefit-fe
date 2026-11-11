import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { signedInAs } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

describe('MVP placeholder routes', () => {
  it.each([
    ['/applicant/notices', 'applicant', 'Notices'],
    ['/applicant/notices/11111111-2222-4333-8444-555555555555', 'applicant', 'Notice'],
    [
      '/applicant/requests/11111111-2222-4333-8444-555555555555',
      'applicant',
      'Respond to a request',
    ],
    ['/applicant/history', 'applicant', 'Decision history'],
    ['/caseworker/households/11111111-2222-4333-8444-555555555555', 'caseworker', 'Household'],
    ['/caseworker/metrics', 'supervisor', 'Program metrics'],
  ] as const)('%s is routed under its role guard', async (path, role, heading) => {
    signedInAs(role)

    renderApp(path)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })
})
