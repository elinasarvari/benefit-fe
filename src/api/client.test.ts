import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import { ApiError } from './errors'
import { createQueryClient } from './queryClient'

const envelope = {
  error: {
    code: 'validation_failed',
    message: 'Some fields are invalid.',
    fields: [{ field: 'body.username', message: 'Field required', type: 'missing' }],
    reference_id: '3f0c2a9e-4b1d-4e55-9a51-7f2f8f5f1c11',
  },
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('API client', () => {
  it('parses the error envelope into ApiError with code and referenceId', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(envelope, 422))
    const client = createApiClient(fetchMock)

    const error = await client.GET('/api/v1/auth/me').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'validation_failed',
      message: 'Some fields are invalid.',
      referenceId: '3f0c2a9e-4b1d-4e55-9a51-7f2f8f5f1c11',
      fields: [{ field: 'body.username', message: 'Field required', type: 'missing' }],
    })
  })

  it('falls back to a generic ApiError when the error body is not an envelope', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))
    const client = createApiClient(fetchMock)

    const error = await client.GET('/api/v1/auth/me').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, code: 'unknown', fields: [], referenceId: null })
  })

  it('returns the parsed body when the response is successful', async () => {
    const report = { component: 'api', status: 'ok', version: '0.1.0', synthetic_data: true }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(report, 200))
    const client = createApiClient(fetchMock)

    const { data } = await client.GET('/api/v1/health')

    expect(data).toEqual(report)
  })

  it('sends requests to /api/v1 with credentials included', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 200))
    const client = createApiClient(fetchMock)

    await client.GET('/api/v1/health')

    const request = fetchMock.mock.calls[0]?.[0] as Request
    expect(new URL(request.url).pathname).toBe('/api/v1/health')
    expect(request.credentials).toBe('include')
  })
  it.each([
    ['auth.session_expired', '/sign-in?reason=expired'],
    ['auth.required', '/sign-in?reason=required'],
  ])('FR-000-07: a 401 %s redirects to %s', async (code, destination) => {
    const navigate = vi.fn<(to: string) => void>()
    const queryClient = createQueryClient({ navigate })
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: { ...envelope.error, code, fields: [] } }, 401))
    const client = createApiClient(fetchMock)

    await queryClient
      .query({ queryKey: ['auth', 'me'], queryFn: () => client.GET('/api/v1/auth/me') })
      .catch(() => undefined)

    expect(navigate).toHaveBeenCalledExactlyOnceWith(destination)
  })

  it('does not redirect when a 401 carries invalid credentials', async () => {
    const navigate = vi.fn<(to: string) => void>()
    const queryClient = createQueryClient({ navigate })
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse(
          { error: { ...envelope.error, code: 'auth.invalid_credentials', fields: [] } },
          401,
        ),
      )
    const client = createApiClient(fetchMock)

    await queryClient
      .query({ queryKey: ['auth', 'me'], queryFn: () => client.GET('/api/v1/auth/me') })
      .catch(() => undefined)

    expect(navigate).not.toHaveBeenCalled()
  })
})
