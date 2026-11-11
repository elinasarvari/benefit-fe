import {
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiClient } from './client'
import type { components } from './generated/schema'

type Schemas = components['schemas']

export type CaseState = Schemas['CaseState']
export type CaseSummary = Schemas['CaseSummary']
export type CaseDetail = Schemas['CaseDetail']
export type CaseHistoryEntry = Schemas['CaseHistoryEntry']
export type CaseStatus = Schemas['CaseStatus']
export type ApplicationSubmission = Schemas['ApplicationSubmission']
export type ReviewActionBody = Schemas['ReviewActionBody']

export interface CaseFilters {
  state?: CaseState
}

export const casesKey = (filters: CaseFilters) => ['cases', filters] as const
export const caseKey = (caseId: string) => ['case', caseId] as const
export const caseHistoryKey = (caseId: string) => ['case', caseId, 'history'] as const

export const caseNoticesKey = (caseId: string) => ['case', caseId, 'notices'] as const

export const POLL_INTERVAL_MS = 1_000
export const POLL_LIMIT_MS = 10_000

export function useCases(filters: CaseFilters) {
  return useInfiniteQuery({
    queryKey: casesKey(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.GET('/api/v1/cases', {
        params: {
          query: {
            ...(filters.state ? { state: filters.state } : {}),
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        },
      })
      if (!data) {
        throw new Error('Empty case list response')
      }
      return data
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  })
}

export function useCase(caseId: string) {
  return useQuery({
    queryKey: caseKey(caseId),
    queryFn: async (): Promise<CaseDetail> => {
      const { data } = await apiClient.GET('/api/v1/cases/{case_id}', {
        params: { path: { case_id: caseId } },
      })
      if (!data) {
        throw new Error('Empty case response')
      }
      return data
    },
  })
}

export function useCaseHistory(caseId: string) {
  return useQuery({
    queryKey: caseHistoryKey(caseId),
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/cases/{case_id}/history', {
        params: { path: { case_id: caseId } },
      })
      if (!data) {
        throw new Error('Empty history response')
      }
      return data
    },
  })
}

export function useCaseNotices(caseId: string, enabled = true) {
  return useQuery({
    queryKey: caseNoticesKey(caseId),
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/cases/{case_id}/notices', {
        params: { path: { case_id: caseId } },
      })
      if (!data) {
        throw new Error('Empty notices response')
      }
      return data
    },
  })
}

export function useSubmitApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    // The apply page opens its own sign-in dialog when the session expires.
    meta: { handlesSessionExpiry: true },
    mutationFn: async (body: ApplicationSubmission): Promise<CaseStatus> => {
      const { data } = await apiClient.POST('/api/v1/applications', { body })
      if (!data) {
        throw new Error('Empty submission response')
      }
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  })
}

// The signal reaches the workflow a moment after the 202, so re-read the case once a second for
// at most ten seconds, stopping as soon as the review task is gone (R17).
export function pollCaseUntilTaskCleared(queryClient: QueryClient, caseId: string): () => void {
  let elapsed = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const tick = (): void => {
    timer = setTimeout(() => {
      elapsed += POLL_INTERVAL_MS
      void queryClient.refetchQueries({ queryKey: caseKey(caseId), exact: true }).then(() => {
        const detail = queryClient.getQueryData<CaseDetail>(caseKey(caseId))
        if (detail?.open_review_task == null || elapsed >= POLL_LIMIT_MS) {
          void queryClient.invalidateQueries({ queryKey: caseHistoryKey(caseId) })
          return
        }
        tick()
      })
    }, POLL_INTERVAL_MS)
  }
  tick()
  return () => {
    clearTimeout(timer)
  }
}

export function useReviewAction(caseId: string, taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: ReviewActionBody): Promise<void> => {
      await apiClient.POST('/api/v1/cases/{case_id}/review-tasks/{task_id}/actions', {
        params: { path: { case_id: caseId, task_id: taskId } },
        body,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: caseKey(caseId), exact: true }),
        queryClient.invalidateQueries({ queryKey: caseHistoryKey(caseId) }),
        queryClient.invalidateQueries({ queryKey: caseNoticesKey(caseId) }),
        queryClient.invalidateQueries({ queryKey: ['cases'] }),
      ])
      pollCaseUntilTaskCleared(queryClient, caseId)
    },
  })
}
