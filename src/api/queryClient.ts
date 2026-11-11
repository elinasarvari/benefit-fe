import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './errors'

const MAX_RETRIES = 2

const SIGN_IN_REDIRECTS = new Map([
  ['auth.session_expired', '/sign-in?reason=expired'],
  ['auth.required', '/sign-in?reason=required'],
])

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false
  }
  return failureCount < MAX_RETRIES
}

function navigateToSignIn(to: string): void {
  if (window.location.pathname !== '/sign-in') {
    window.location.assign(to)
  }
}

interface QueryClientOptions {
  navigate?: (to: string) => void
  retryDelay?: number
}

export function createQueryClient({
  navigate = navigateToSignIn,
  retryDelay,
}: QueryClientOptions = {}): QueryClient {
  const handleUnauthorized = (error: Error, handledInPlace = false): void => {
    if (handledInPlace) {
      return
    }
    if (error instanceof ApiError && error.status === 401) {
      const destination = SIGN_IN_REDIRECTS.get(error.code)
      if (destination) {
        navigate(destination)
      }
    }
  }
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        handleUnauthorized(error)
      },
    }),
    // A mutation with `meta.handlesSessionExpiry` opens its own sign-in dialog, so a lost
    // session does not navigate away and discard what the person typed (ADR-001-10).
    mutationCache: new MutationCache({
      onError: (error, _variables, _result, mutation) => {
        handleUnauthorized(error, mutation.meta?.handlesSessionExpiry === true)
      },
    }),
    defaultOptions: {
      queries: { retry: shouldRetry, ...(retryDelay === undefined ? {} : { retryDelay }) },
    },
  })
}

export const queryClient = createQueryClient()
