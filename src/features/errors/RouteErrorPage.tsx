import { Link } from 'react-router'

export function RouteErrorPage() {
  return (
    <section role="alert" className="space-y-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p>The page could not be shown. Please try again.</p>
      <Link to="/sign-in" className="text-primary underline underline-offset-4">
        Go to sign in
      </Link>
    </section>
  )
}
