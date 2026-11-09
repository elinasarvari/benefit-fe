import { Link } from 'react-router'
import { useMe } from '@/api/auth'
import { homePathFor } from '@/lib/roles'

export function ForbiddenPage() {
  const me = useMe()
  const home = me.data ? homePathFor(me.data.user.role) : '/sign-in'

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p>Your account is not allowed to open this page.</p>
      <Link to={home} className="text-primary underline underline-offset-4">
        {me.data ? 'Go to your home page' : 'Go to sign in'}
      </Link>
    </section>
  )
}
