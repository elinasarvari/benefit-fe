import { Navigate, Outlet } from 'react-router'
import { useMe } from '@/api/auth'
import { ApiError } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { hasAnyRole, type Role } from '@/lib/roles'

export function RequireRole({ allow }: { allow: readonly Role[] }) {
  const me = useMe()

  if (me.isPending) {
    return <LoadingState label="Checking your session…" />
  }
  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 401) {
      const reason = me.error.code === 'auth.session_expired' ? 'expired' : 'required'
      return <Navigate to={`/sign-in?reason=${reason}`} replace />
    }
    return (
      <ErrorState
        error={me.error}
        onRetry={() => {
          void me.refetch()
        }}
      />
    )
  }
  if (!hasAnyRole(me.data.user.role, allow)) {
    return <Navigate to="/forbidden" replace />
  }
  return <Outlet />
}
