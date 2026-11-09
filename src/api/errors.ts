import type { components } from './generated/schema'

export type ApiErrorCode = components['schemas']['ErrorCode'] | 'unknown'
export type FieldError = components['schemas']['FieldError']

interface ApiErrorInit {
  status: number
  code: ApiErrorCode
  message: string
  fields: FieldError[]
  referenceId: string | null
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fields: FieldError[]
  readonly referenceId: string | null

  constructor({ status, code, message, fields, referenceId }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.referenceId = referenceId
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function parseApiError(response: Response): Promise<ApiError> {
  const fallback: ApiErrorInit = {
    status: response.status,
    code: 'unknown',
    message: 'Something went wrong. Please try again.',
    fields: [],
    referenceId: response.headers.get('X-Request-ID'),
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return new ApiError(fallback)
  }
  if (!isRecord(body) || !isRecord(body.error)) {
    return new ApiError(fallback)
  }
  const { code, message, fields, reference_id: referenceId } = body.error
  const envelope = body as components['schemas']['ErrorEnvelope']
  return new ApiError({
    status: response.status,
    code: typeof code === 'string' ? envelope.error.code : fallback.code,
    message: typeof message === 'string' ? message : fallback.message,
    fields: Array.isArray(fields) ? envelope.error.fields : fallback.fields,
    referenceId: typeof referenceId === 'string' ? referenceId : fallback.referenceId,
  })
}
