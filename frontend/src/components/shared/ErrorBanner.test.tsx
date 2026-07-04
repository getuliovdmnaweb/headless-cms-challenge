import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ErrorBanner from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders the message', () => {
    render(<ErrorBanner message="Content type not found." />)
    expect(screen.getByText('Content type not found.')).toBeInTheDocument()
  })

  it('is dismissed when the close button is clicked', () => {
    render(<ErrorBanner message="Content type not found." />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText('Content type not found.')).not.toBeInTheDocument()
  })

  it('renders nothing when message is empty', () => {
    const { container } = render(<ErrorBanner message="" />)
    expect(container.firstChild).toBeNull()
  })
})
