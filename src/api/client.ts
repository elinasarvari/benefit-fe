import createClient, { type Middleware } from 'openapi-fetch'
import { parseApiError } from './errors'
import type { paths } from './generated/schema'

const throwApiError: Middleware = {
  async onResponse({ response }) {
    if (!response.ok) {
      throw await parseApiError(response)
    }
    return undefined
  },
}

// The generated paths already carry /api/v1, so the base is just the page origin.
export function createApiClient(fetchImpl?: typeof fetch) {
  const client = createClient<paths>({
    baseUrl: globalThis.location.origin,
    credentials: 'include',
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  })
  client.use(throwApiError)
  return client
}

export const apiClient = createApiClient()
