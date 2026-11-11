import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { components } from './generated/schema'

export type SessionInfo = components['schemas']['SessionInfo']
export type LoginRequest = components['schemas']['LoginRequest']

export const meQueryKey = ['auth', 'me'] as const

// A fresh sign-in response is trusted for this long; expiry still surfaces as a 401 from any call.
const SESSION_STALE_MS = 30_000

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    staleTime: SESSION_STALE_MS,
    queryFn: async (): Promise<SessionInfo> => {
      const { data } = await apiClient.GET('/api/v1/auth/me')
      if (!data) {
        throw new Error('Empty session response')
      }
      return data
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LoginRequest): Promise<SessionInfo> => {
      const { data } = await apiClient.POST('/api/v1/auth/login', { body })
      if (!data) {
        throw new Error('Empty sign-in response')
      }
      return data
    },
    onSuccess: (session) => {
      // A different user signing in (for example in the re-auth dialog) must never see the
      // previous user's cached cases: drop every query before storing the new session.
      const previous = queryClient.getQueryData<SessionInfo>(meQueryKey)
      if (previous && previous.user.id !== session.user.id) {
        queryClient.removeQueries()
      }
      queryClient.setQueryData(meQueryKey, session)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await apiClient.POST('/api/v1/auth/logout')
    },
    // Drop every cached query so the next user never sees the previous user's data.
    onSuccess: () => {
      queryClient.removeQueries()
    },
  })
}
