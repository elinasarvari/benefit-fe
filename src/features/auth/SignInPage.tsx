import { useActionState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useLogin, useMe } from '@/api/auth'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { homePathFor } from '@/lib/roles'
import { PageHeading } from '@/components/PageHeading'

interface FormState {
  username: string
  error: unknown
}

const NOTICES = new Map([
  ['expired', 'Your session has expired. Please sign in again.'],
  ['required', 'Please sign in to continue.'],
])

function readText(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

export function SignInPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useLogin()
  const me = useMe()
  const notice = NOTICES.get(params.get('reason') ?? '')

  const [state, submit, isPending] = useActionState(
    async (_previous: FormState, formData: FormData): Promise<FormState> => {
      const username = readText(formData, 'username')
      try {
        const session = await login.mutateAsync({
          username,
          password: readText(formData, 'password'),
        })
        void navigate(homePathFor(session.user.role))
        return { username, error: null }
      } catch (error) {
        return { username, error }
      }
    },
    { username: '', error: null },
  )

  if (me.isSuccess) {
    return <Navigate to={homePathFor(me.data.user.role)} replace />
  }

  return (
    <section className="mx-auto max-w-sm space-y-4">
      <PageHeading>Sign in</PageHeading>
      {notice ? (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          {notice}
        </p>
      ) : null}
      <form action={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            defaultValue={state.username}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      {state.error ? <ErrorState error={state.error} /> : null}
    </section>
  )
}
