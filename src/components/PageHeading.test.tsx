import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeading } from './PageHeading'

describe('PageHeading', () => {
  it('sets the document title to the heading text when rendered', () => {
    render(<PageHeading>Sign in</PageHeading>)

    expect(document.title).toBe('Sign in - Benefit Case Platform')
  })

  it('moves focus to the heading when rendered', () => {
    render(<PageHeading>Sign in</PageHeading>)

    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toHaveFocus()
  })
})
