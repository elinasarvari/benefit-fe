import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './errors'

const MAX_RETRIES = 2

const SIGN_IN_REDIRECTS: Partial<Record<string, string>> = {
  'auth.session_expired': '/sign-in?reason=expired',
  'auth.required': '/sign-in?reason=required',
}

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
  const handleUnauthorized = (error: Error): void => {
    if (error instanceof ApiError && error.status === 401) {
      const destination = SIGN_IN_REDIRECTS[error.code]
      if (destination) {
        navigate(destination)
      }
    }
  }
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleUnauthorized }),
    mutationCache: new MutationCache({ onError: handleUnauthorized }),
    defaultOptions: {
      queries: { retry: shouldRetry, ...(retryDelay === undefined ? {} : { retryDelay }) },
    },
  })
}

export const queryClient = createQueryClient()
