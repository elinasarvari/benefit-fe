import type { components } from '@/api/generated/schema'

type Role = components['schemas']['Role']
type SessionInfo = components['schemas']['SessionInfo']
type Responder = (request: Request) => Response | Promise<Response>

const handlers = new Map<string, Responder>()

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function errorResponse(
  status: number,
  code: components['schemas']['ErrorCode'],
  message: string,
  referenceId = '3f0c2a9e-4b1d-4e55-9a51-7f2f8f5f1c11',
): Response {
  return jsonResponse({ error: { code, message, fields: [], reference_id: referenceId } }, status)
}

export function sessionFor(role: Role): SessionInfo {
  return {
    expires_at: '2030-01-01T14:00:00Z',
    user: {
      id: '9d4b1f0a-6a52-4c5e-8a43-0c1e2f3a4b5c',
      username: `${role}1`,
      display_name: `Synthetic ${role} 1`,
      role,
      household_id: role === 'applicant' ? '5b1c7e2d-3f40-4a8b-9c6d-1e2f3a4b5c6d' : null,
    },
  }
}

export function respondTo(route: string, responder: Responder): void {
  handlers.set(route, responder)
}

export function signedInAs(role: Role): void {
  respondTo('GET /api/v1/auth/me', () => jsonResponse(sessionFor(role)))
}

export function resetFakeApi(): void {
  handlers.clear()
  respondTo('GET /api/v1/auth/me', () =>
    errorResponse(401, 'auth.required', 'Sign in to continue.'),
  )
}

export const fakeFetch: typeof fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init)
  const path = new URL(request.url).pathname
  const responder = handlers.get(`${request.method} ${path}`)
  return responder
    ? responder(request)
    : errorResponse(404, 'not_found', `No fake handler for ${request.method} ${path}`)
}

resetFakeApi()
