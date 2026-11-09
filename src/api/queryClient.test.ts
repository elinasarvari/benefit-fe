import { describe, expect, it } from 'vitest'
import { ApiError } from './errors'
import { createQueryClient } from './queryClient'

function apiError(status: number): ApiError {
  return new ApiError({ status, code: 'unknown', message: 'x', fields: [], referenceId: null })
}

describe('createQueryClient', () => {
  it('does not retry when the failure is a 4xx ApiError', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry as (
      count: number,
      error: Error,
    ) => boolean

    expect(retry(0, apiError(404))).toBe(false)
  })

  it('retries up to twice when the failure is a 5xx ApiError', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry as (
      count: number,
      error: Error,
    ) => boolean

    expect([retry(0, apiError(503)), retry(1, apiError(503)), retry(2, apiError(503))]).toEqual([
      true,
      true,
      false,
    ])
  })
})
