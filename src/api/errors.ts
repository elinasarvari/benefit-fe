import type { components } from './generated/schema'

export type ApiErrorCode = components['schemas']['ErrorCode'] | 'unknown'
export type FieldError = components['schemas']['FieldError']

interface ApiErrorInit {
  status: number
  code: ApiErrorCode
  message: string
  fields: FieldError[]
  referenceId: string | null
  relatedCaseId?: string | null
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fields: FieldError[]
  readonly referenceId: string | null
  readonly relatedCaseId: string | null

  constructor({ status, code, message, fields, referenceId, relatedCaseId }: ApiErrorInit) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.referenceId = referenceId
    this.relatedCaseId = relatedCaseId ?? null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Typed as a Record so the compiler flags any ErrorCode added to the API but missing here.
const KNOWN_CODES: Record<components['schemas']['ErrorCode'], true> = {
  'auth.required': true,
  'auth.session_expired': true,
  'auth.invalid_credentials': true,
  'auth.forbidden': true,
  not_found: true,
  conflict: true,
  validation_failed: true,
  internal_error: true,
  dependency_unavailable: true,
}

function isKnownCode(value: unknown): value is components['schemas']['ErrorCode'] {
  return typeof value === 'string' && Object.hasOwn(KNOWN_CODES, value)
}

function toFieldError(value: unknown): FieldError | null {
  if (
    isRecord(value) &&
    typeof value.field === 'string' &&
    typeof value.message === 'string' &&
    typeof value.type === 'string'
  ) {
    return { field: value.field, message: value.message, type: value.type }
  }
  return null
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
  const {
    code,
    message,
    fields,
    reference_id: referenceId,
    related_case_id: relatedCaseId,
  } = body.error
  return new ApiError({
    status: response.status,
    code: isKnownCode(code) ? code : 'unknown',
    message: typeof message === 'string' ? message : fallback.message,
    fields: Array.isArray(fields)
      ? fields.map(toFieldError).filter((field) => field !== null)
      : fallback.fields,
    referenceId: typeof referenceId === 'string' ? referenceId : fallback.referenceId,
    relatedCaseId: typeof relatedCaseId === 'string' ? relatedCaseId : null,
  })
}
