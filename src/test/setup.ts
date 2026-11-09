import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { resetFakeApi } from './fakeApi'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  const { fakeFetch } = await import('./fakeApi')
  return { ...actual, apiClient: actual.createApiClient(fakeFetch) }
})

beforeEach(() => {
  resetFakeApi()
})

afterEach(() => {
  cleanup()
})
