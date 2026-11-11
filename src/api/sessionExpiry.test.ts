import { describe, expect, it, vi } from 'vitest'
import { ApiError, parseApiError } from './errors'
import { createQueryClient } from './queryClient'

const expired = new ApiError({
  status: 401,
  code: 'auth.session_expired',
  message: 'Your session has expired.',
  fields: [],
  referenceId: null,
})

async function fail(client: ReturnType<typeof createQueryClient>, meta?: Record<string, unknown>) {
  await client
    .getMutationCache()
    .build(client, {
      mutationFn: () => Promise.reject(expired),
      ...(meta ? { meta } : {}),
    })
    .execute(undefined)
    .catch(() => undefined)
}

describe('session expiry on a mutation', () => {
  it('FR-001-24: a mutation that handles expiry in place does not navigate to sign-in', async () => {
    const navigate = vi.fn()

    await fail(createQueryClient({ navigate }), { handlesSessionExpiry: true })

    expect(navigate).not.toHaveBeenCalled()
  })

  it('FR-001-24: any other mutation still navigates to sign-in when the session expires', async () => {
    const navigate = vi.fn()

    await fail(createQueryClient({ navigate }))

    expect(navigate).toHaveBeenCalledWith('/sign-in?reason=expired')
  })
})

describe('error envelope', () => {
  it('FR-001-25: keeps related_case_id from a refusal', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: 'conflict',
          message: 'Conflict',
          fields: [{ field: 'household', message: 'open', type: 'household_has_open_case' }],
          reference_id: 'ref',
          related_case_id: '11111111-2222-4333-8444-555555555555',
        },
      }),
      { status: 409 },
    )

    const error = await parseApiError(response)

    expect(error.relatedCaseId).toBe('11111111-2222-4333-8444-555555555555')
    expect((await parseApiError(new Response('{}', { status: 500 }))).relatedCaseId).toBeNull()
  })
})
