import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { jsonResponse, respondTo, sessionFor } from '@/test/fakeApi'
import { meQueryKey, useLogin, type SessionInfo } from './auth'
import { caseKey, casesKey } from './cases'

const applicantA = sessionFor('applicant')
const applicantB: SessionInfo = {
  ...applicantA,
  user: { ...applicantA.user, id: '00000000-0000-4000-8000-000000000002', username: 'applicant2' },
}

function seededClient(): QueryClient {
  const client = new QueryClient()
  client.setQueryData(meQueryKey, applicantA)
  client.setQueryData(casesKey({}), { items: [{ case_id: 'case-of-a' }] })
  client.setQueryData(caseKey('case-of-a'), { case_id: 'case-of-a' })
  return client
}

async function signIn(client: QueryClient, session: SessionInfo): Promise<void> {
  respondTo('POST /api/v1/auth/login', () => jsonResponse(session))
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useLogin(), { wrapper })
  await act(async () => {
    await result.current.mutateAsync({ username: session.user.username, password: 'synthetic' })
  })
}

describe('useLogin', () => {
  it("FR-001-24: a different user signing in never sees the previous applicant's cached cases", async () => {
    const client = seededClient()

    await signIn(client, applicantB)

    expect(client.getQueryData(casesKey({}))).toBeUndefined()
    expect(client.getQueryData(caseKey('case-of-a'))).toBeUndefined()
    expect(client.getQueryData(meQueryKey)).toEqual(applicantB)
  })

  it('FR-001-24: the same user signing in again keeps their cached cases', async () => {
    const client = seededClient()

    await signIn(client, applicantA)

    expect(client.getQueryData(casesKey({}))).toBeDefined()
    expect(client.getQueryData(meQueryKey)).toEqual(applicantA)
  })
})
