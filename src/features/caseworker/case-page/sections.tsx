import type { ComponentType } from 'react'
import type { CaseDetail } from '@/api/cases'
import { HistorySection } from './HistorySection'
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
  { id: 'history', title: 'History', Component: HistorySection },
]
