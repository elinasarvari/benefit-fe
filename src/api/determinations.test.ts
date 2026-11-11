import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { CASE_ID, determinationView } from '@/test/caseFixtures'
import { jsonResponse, respondTo } from '@/test/fakeApi'
import { caseDeterminationsKey, useCaseDeterminations } from './determinations'

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

describe('useCaseDeterminations', () => {
  it('FR-003-23: fetches determinations under key cases/id/determinations when a case id is given', async () => {
    let requested = ''
    respondTo(`GET /api/v1/cases/${CASE_ID}/determinations`, (request) => {
      requested = new URL(request.url).pathname
      return jsonResponse({ items: [determinationView()] })
    })
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useCaseDeterminations(CASE_ID), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(requested).toBe(`/api/v1/cases/${CASE_ID}/determinations`)
    expect(caseDeterminationsKey(CASE_ID)).toEqual(['case', CASE_ID, 'determinations'])
    expect(queryClient.getQueryData(caseDeterminationsKey(CASE_ID))).toEqual({
      items: [determinationView()],
    })
  })

  it('FR-003-23: does not fetch when the case id is empty', () => {
    const { wrapper } = setup()
    const { result } = renderHook(() => useCaseDeterminations(''), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
