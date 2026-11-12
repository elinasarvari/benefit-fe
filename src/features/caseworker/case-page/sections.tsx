import type { ComponentType } from 'react'
import type { CaseDetail } from '@/api/cases'
import { DeterminationSection } from './DeterminationSection'
import { DocumentsSection } from './DocumentsSection'
import { HistorySection } from './HistorySection'
import { PendingSection } from './PendingSection'
import { ReviewTaskSection } from './ReviewTaskSection'
import { StatusSection } from './StatusSection'

export interface CaseSection {
  id: string
  title: string
  Component: ComponentType<{ detail: CaseDetail }>
  // A section that has nothing to show for this case is left out, heading included.
  visible?: (detail: CaseDetail) => boolean
}

// Order on the page; a later feature adds its section here and nowhere else (R15).
export const caseSections: readonly CaseSection[] = [
  { id: 'status', title: 'Status', Component: StatusSection },
  {
    id: 'review-task',
    title: 'Review task',
    Component: ReviewTaskSection,
    visible: (detail) => detail.open_review_task !== null,
  },
  { id: 'documents', title: 'Documents', Component: DocumentsSection },
  {
    id: 'determination',
    title: 'Determination',
    Component: DeterminationSection,
    visible: (detail) => ['determining', 'under_review', 'decided'].includes(detail.state),
  },
  // MVP contracts: hidden until 004a and 011 land. The demo clock is for supervisors in the
  // demo profile only (FR-011-11).
  { id: 'explanation', title: 'Explanation', Component: PendingSection, visible: () => false },
  { id: 'notices', title: 'Notices', Component: PendingSection, visible: () => false },
  { id: 'demo-clock', title: 'Demo clock', Component: PendingSection, visible: () => false },
  { id: 'history', title: 'History', Component: HistorySection },
]
