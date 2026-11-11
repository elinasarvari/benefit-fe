import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/api/queryClient'
import { CASE_ID, caseDetail, historyEntry } from '@/test/caseFixtures'
import { jsonResponse, respondTo } from '@/test/fakeApi'
import { HistorySection } from './HistorySection'

function show(demoClock: boolean) {
  respondTo(`GET /api/v1/cases/${CASE_ID}/history`, () =>
    jsonResponse({
      items: [
        historyEntry({
          seq: 1,
          case_time: '2026-03-17T15:00:00Z',
          real_time: '2026-03-17T15:00:00Z',
        }),
        historyEntry({
          seq: 2,
          from_state: 'submitted',
          to_state: 'under_review',
          case_time: '2026-03-19T15:00:00Z',
          real_time: '2026-03-17T15:01:00Z',
          actor: 'Synthetic caseworker 1',
          actor_type: 'user',
          reason_code: 'approve_denial',
        }),
      ],
      next_cursor: null,
    }),
  )
  return render(
    <QueryClientProvider client={createQueryClient({ navigate: () => undefined })}>
      <HistorySection detail={caseDetail({ demo_clock: demoClock })} />
    </QueryClientProvider>,
  )
}

describe('HistorySection', () => {
  it('FR-001-10: the deciding entry of a denied case names the caseworker and the denial reason', async () => {
    respondTo(`GET /api/v1/cases/${CASE_ID}/history`, () =>
      jsonResponse({
        items: [
          historyEntry({ seq: 1 }),
          historyEntry({
            seq: 2,
            from_state: 'under_review',
            to_state: 'decided',
            actor: 'Synthetic caseworker 1',
            actor_type: 'user',
            reason_code: 'approve_denial',
          }),
        ],
        next_cursor: null,
      }),
    )
    render(
      <QueryClientProvider client={createQueryClient({ navigate: () => undefined })}>
        <HistorySection
          detail={caseDetail({
            state: 'decided',
            outcome: 'denied',
            denial_reason: 'income_over_limit',
          })}
        />
      </QueryClientProvider>,
    )
    const entries = await screen.findAllByRole('listitem')
    expect(entries[1]).toHaveTextContent('Synthetic caseworker 1: Approve denial')
    expect(entries[1]).toHaveTextContent('Income over the limit')
    expect(entries[0]).not.toHaveTextContent('Income over the limit')
  })

  it('FR-001-10: history shows case time, actor and reason label, and real time on a demo clock', async () => {
    const { unmount } = show(false)
    const entries = await screen.findAllByRole('listitem')
    expect(entries[0]).toHaveTextContent('Mar 17, 2026')
    expect(entries[0]).toHaveTextContent('System: Application received')
    expect(entries[1]).toHaveTextContent('Mar 19, 2026')
    expect(entries[1]).toHaveTextContent('Synthetic caseworker 1: Approve denial')
    expect(entries[1]).not.toHaveTextContent(/real time/i)
    unmount()

    show(true)
    const demo = await screen.findAllByRole('listitem')
    expect(demo[1]).toHaveTextContent(/real time/i)
    expect(demo[1]).toHaveTextContent('Mar 17, 2026')
    expect(demo[1]?.querySelectorAll('time')).toHaveLength(2)
  })
})
