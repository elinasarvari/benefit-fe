import { Link } from 'react-router'
import { PageHeading } from '@/components/PageHeading'

export function RouteErrorPage() {
  return (
    <section role="alert" className="space-y-4">
      <PageHeading>Something went wrong</PageHeading>
      <p>The page could not be shown. Please try again.</p>
      <Link to="/sign-in" className="text-primary underline underline-offset-4">
        Go to sign in
      </Link>
    </section>
  )
}
