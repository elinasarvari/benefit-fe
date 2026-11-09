import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/sign-in" className="text-primary underline underline-offset-4">
        Go to sign in
      </Link>
    </section>
  )
}
