import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import { ErrorState } from './ErrorState'

const apiError = new ApiError({
  status: 500,
  code: 'internal_error',
  message: 'Something went wrong on our side.',
  fields: [],
  referenceId: '3f0c2a9e-4b1d-4e55-9a51-7f2f8f5f1c11',
})

describe('ErrorState', () => {
  it('FR-000-08: shows the message and the reference ID, never raw details', () => {
    render(<ErrorState error={apiError} />)

    const alert = screen.getByRole('alert')

    expect(alert).toHaveTextContent('Something went wrong on our side.')
    expect(alert).toHaveTextContent('3f0c2a9e-4b1d-4e55-9a51-7f2f8f5f1c11')
  })

  it('FR-000-08: shows a generic message when the error is not an ApiError', () => {
    render(<ErrorState error={new TypeError('Cannot read properties of undefined (reading id)')} />)

    const alert = screen.getByRole('alert')

    expect(alert).not.toHaveTextContent(/undefined|TypeError/)
    expect(alert).not.toHaveTextContent(/reference/i)
  })

  it('offers a retry button when an onRetry handler is given', async () => {
    const onRetry = vi.fn<() => void>()
    render(<ErrorState error={apiError} onRetry={onRetry} />)

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(onRetry).toHaveBeenCalledOnce()
  })
})
