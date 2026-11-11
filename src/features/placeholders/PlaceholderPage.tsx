import { PageHeading } from '@/components/PageHeading'

// MVP contracts PR: a route whose feature has not landed yet. Each feature replaces its
// placeholder in router.tsx with its own page; delete this file when none is left.
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="space-y-4">
      <PageHeading>{title}</PageHeading>
      <p>This page is not available yet.</p>
    </section>
  )
}
