import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CASE_ID, TASK_ID, caseDetail } from '@/test/caseFixtures'
import { jsonResponse, respondTo } from '@/test/fakeApi'
import { POLL_LIMIT_MS, caseKey, pollCaseUntilTaskCleared, useCase, useReviewAction } from './cases'

const taskDetail = () =>
  caseDetail({
    state: 'under_review',
    open_review_task: { task_id: TASK_ID, reason: 'adverse_determination', allowed_actions: [] },
  })

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('review action polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('FR-001-27: review action mutation invalidates the case, history and list queries', async () => {
    respondTo(
      `POST /api/v1/cases/${CASE_ID}/review-tasks/${TASK_ID}/actions`,
      () => new Response(null, { status: 202 }),
    )
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () => jsonResponse(caseDetail()))
    const { queryClient, wrapper } = setup()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useReviewAction(CASE_ID, TASK_ID), { wrapper })

    result.current.mutate({ action: 'approve_denial', request_id: crypto.randomUUID() })

    await vi.waitFor(() => {
      const keys = spy.mock.calls.map(([filters]) => filters?.queryKey)
      expect(keys).toContainEqual(['case', CASE_ID])
      expect(keys).toContainEqual(['case', CASE_ID, 'history'])
      expect(keys).toContainEqual(['cases'])
    })
    await vi.advanceTimersByTimeAsync(POLL_LIMIT_MS + 1000)
  })

  it('FR-001-27: after a 202 the case is re-read once a second until the review task is cleared', async () => {
    let reads = 0
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () => {
      reads += 1
      return jsonResponse(reads >= 4 ? caseDetail() : taskDetail())
    })
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useCase(CASE_ID), { wrapper })
    await vi.advanceTimersByTimeAsync(0)
    expect(result.current.data?.open_review_task).toBeTruthy()
    expect(reads).toBe(1)

    pollCaseUntilTaskCleared(queryClient, CASE_ID)
    await vi.advanceTimersByTimeAsync(1000)
    expect(reads).toBe(2)
    await vi.advanceTimersByTimeAsync(1000)
    expect(reads).toBe(3)
    await vi.advanceTimersByTimeAsync(1000)
    expect(reads).toBe(4)
    expect(
      queryClient.getQueryData<{ open_review_task: unknown }>(caseKey(CASE_ID))?.open_review_task,
    ).toBeNull()

    await vi.advanceTimersByTimeAsync(POLL_LIMIT_MS)
    expect(reads).toBe(4)
  })

  it('FR-001-27: polling stops after ten seconds when the task never clears', async () => {
    let reads = 0
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () => {
      reads += 1
      return jsonResponse(taskDetail())
    })
    const { queryClient, wrapper } = setup()
    renderHook(() => useCase(CASE_ID), { wrapper })
    await vi.advanceTimersByTimeAsync(0)

    pollCaseUntilTaskCleared(queryClient, CASE_ID)
    await vi.advanceTimersByTimeAsync(POLL_LIMIT_MS * 3)

    expect(reads).toBe(11)
  })

  it('FR-002-19: when the review task clears the verification result is read again', async () => {
    respondTo(`GET /api/v1/cases/${CASE_ID}`, () => jsonResponse(caseDetail()))
    const { queryClient } = setup()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    pollCaseUntilTaskCleared(queryClient, CASE_ID)
    await vi.advanceTimersByTimeAsync(1000)

    const keys = spy.mock.calls.map(([filters]) => filters?.queryKey)
    expect(keys).toContainEqual(['case', CASE_ID, 'verification'])
  })
})
