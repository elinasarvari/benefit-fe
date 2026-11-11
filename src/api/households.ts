import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type { components } from './generated/schema'

type Schemas = components['schemas']

export type HouseholdView = Schemas['HouseholdView']
export type CoveragePeriodView = Schemas['CoveragePeriodView']

export const householdKey = (householdId: string) => ['household', householdId] as const

export function useHousehold(householdId: string) {
  return useQuery({
    queryKey: householdKey(householdId),
    queryFn: async (): Promise<HouseholdView> => {
      const { data } = await apiClient.GET('/api/v1/households/{household_id}', {
        params: { path: { household_id: householdId } },
      })
      if (!data) {
        throw new Error('Empty household response')
      }
      return data
    },
  })
}

export function useStartRedetermination(householdId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (coveragePeriodId: string) => {
      const { data } = await apiClient.POST('/api/v1/households/{household_id}/redeterminations', {
        params: { path: { household_id: householdId } },
        body: { coverage_period_id: coveragePeriodId },
      })
      if (!data) {
        throw new Error('Empty redetermination response')
      }
      return data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: householdKey(householdId) }),
        queryClient.invalidateQueries({ queryKey: ['cases'] }),
      ])
    },
  })
}
