import { Outlet, useNavigate } from 'react-router'
import { useLogout, useMe } from '@/api/auth'
import { ErrorState } from '@/components/ErrorState'
import { SyntheticBanner } from '@/components/SyntheticBanner'
import { Button } from '@/components/ui/button'

export function AppShell() {
  const me = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col">
      <SyntheticBanner />
      {me.isSuccess ? (
        <header className="flex items-center justify-end gap-3 border-b px-4 py-2 text-sm">
          <span>
            {me.data.user.display_name} ({me.data.user.role})
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={logout.isPending}
            onClick={() => {
              logout.mutate(undefined, { onSuccess: () => void navigate('/sign-in') })
            }}
          >
            Sign out
          </Button>
        </header>
      ) : null}
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-6">
        {logout.isError ? <ErrorState error={logout.error} /> : null}
        <Outlet />
      </main>
    </div>
  )
}
