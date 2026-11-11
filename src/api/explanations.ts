import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import type { components } from './generated/schema'

type Schemas = components['schemas']

export type DecisionExplanation = Schemas['DecisionExplanation']
export type Citation = Schemas['Citation']
export type HistoryEntry = Schemas['HistoryEntry']

export const caseExplanationsKey = (caseId: string) => ['case', caseId, 'explanations'] as const
export const applicantHistoryKey = ['me', 'history'] as const

export function useCaseExplanations(caseId: string) {
  return useQuery({
    queryKey: caseExplanationsKey(caseId),
    enabled: caseId !== '',
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/cases/{case_id}/explanations', {
        params: { path: { case_id: caseId } },
      })
      if (!data) {
        throw new Error('Empty explanations response')
      }
      return data
    },
  })
}

export function useApplicantHistory() {
  return useQuery({
    queryKey: applicantHistoryKey,
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/me/history')
      if (!data) {
        throw new Error('Empty history response')
      }
      return data
    },
  })
}
