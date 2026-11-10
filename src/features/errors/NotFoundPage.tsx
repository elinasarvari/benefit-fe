import { Link } from 'react-router'
import { PageHeading } from '@/components/PageHeading'

export function NotFoundPage() {
  return (
    <section className="space-y-4">
      <PageHeading>Page not found</PageHeading>
      <p>The page you are looking for does not exist.</p>
      <Link to="/sign-in" className="text-primary underline underline-offset-4">
        Go to sign in
      </Link>
    </section>
  )
}
