import { PageHeading } from '@/components/PageHeading'
import { CaseListPage } from './CaseListPage'

export function CaseworkerHomePage() {
  return (
    <section className="space-y-4">
      <PageHeading>Caseworker console</PageHeading>
      <CaseListPage />
    </section>
  )
}
