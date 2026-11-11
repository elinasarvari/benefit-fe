import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import type { components } from './generated/schema'

type Schemas = components['schemas']

export type DeterminationView = Schemas['DeterminationView']
export type RuleResult = Schemas['RuleResult']
export type MissingItem = Schemas['MissingItem']

export const caseDeterminationsKey = (caseId: string) => ['case', caseId, 'determinations'] as const

export function useCaseDeterminations(caseId: string) {
  return useQuery({
    queryKey: caseDeterminationsKey(caseId),
    enabled: caseId !== '',
    queryFn: async () => {
      const { data } = await apiClient.GET('/api/v1/cases/{case_id}/determinations', {
        params: { path: { case_id: caseId } },
      })
      if (!data) {
        throw new Error('Empty determinations response')
      }
      return data
    },
  })
}
