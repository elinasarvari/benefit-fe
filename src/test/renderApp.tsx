import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { createQueryClient } from '@/api/queryClient'
import { routes } from '@/app/router'

export function renderApp(path: string) {
  const navigate = vi.fn<(to: string) => void>()
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={createQueryClient({ navigate, retryDelay: 0 })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, navigate }
}
