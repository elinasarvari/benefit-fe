import { useActionState } from 'react'
import { useLogin } from '@/api/auth'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ReauthDialogProps {
  open: boolean
  // Called with the id of whoever signed in, after the session is back.
  onSignedIn: (userId: string) => void
}

interface DialogState {
  error: unknown
}

function readText(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

// Sign-in without leaving the page, so a half-filled form is not lost when the session ends.
export function ReauthDialog({ open, onSignedIn }: ReauthDialogProps) {
  const login = useLogin()
  const [state, submit, isPending] = useActionState(
    async (_previous: DialogState, formData: FormData): Promise<DialogState> => {
      try {
        const session = await login.mutateAsync({
          username: readText(formData, 'username'),
          password: readText(formData, 'password'),
        })
        onSignedIn(session.user.id)
        return { error: null }
      } catch (error) {
        return { error }
      }
    },
    { error: null },
  )

  return (
    <Dialog open={open}>
      <DialogContent
        onEscapeKeyDown={(event) => {
          event.preventDefault()
        }}
        onInteractOutside={(event) => {
          event.preventDefault()
        }}
      >
        <DialogTitle>Sign in again</DialogTitle>
        <DialogDescription>
          Your session has expired. Sign in to send your application; what you entered is kept.
        </DialogDescription>
        <form action={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reauth-username">Username</Label>
            <Input id="reauth-username" name="username" autoComplete="username" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reauth-password">Password</Label>
            <Input
              id="reauth-password"
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
      </DialogContent>
    </Dialog>
  )
}
