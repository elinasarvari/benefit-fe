import { Component, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { useCase } from '@/api/cases'
import { ApiError } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PageHeading } from '@/components/PageHeading'
import { NotFoundPage } from '@/features/errors/NotFoundPage'
import { caseSections, type CaseSection } from './sections'

class SectionBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override render(): ReactNode {
    return this.state.failed ? (
      <div role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm">
        This section could not be shown. The rest of the case is unaffected.
      </div>
    ) : (
      this.props.children
    )
  }
}

export function CasePage({ sections = caseSections }: { sections?: readonly CaseSection[] }) {
  const { caseId = '' } = useParams()
  const found = useCase(caseId)

  if (found.isPending) {
    return <LoadingState label="Loading case…" />
  }
  if (found.error instanceof ApiError && found.error.status === 404) {
    return <NotFoundPage />
  }
  if (found.isError) {
    return (
      <ErrorState
        error={found.error}
        onRetry={() => {
          void found.refetch()
        }}
      />
    )
  }
  const detail = found.data
  return (
    <div className="space-y-6">
      <PageHeading>Case</PageHeading>
      <p>Case reference: {detail.case_id}</p>
      {sections
        .filter((section) => section.visible?.(detail) ?? true)
        .map(({ id, title, Component: Body }) => (
          <section key={id} aria-labelledby={`section-${id}`} className="space-y-2">
            <h2 id={`section-${id}`} className="text-lg font-semibold">
              {title}
            </h2>
            <SectionBoundary>
              <Body detail={detail} />
            </SectionBoundary>
          </section>
        ))}
    </div>
  )
}
