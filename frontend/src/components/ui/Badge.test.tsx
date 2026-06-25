import { render, screen } from '@testing-library/react'
import Badge from './Badge'

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge label="Valid" variant="success" />)
    expect(screen.getByText('Valid')).toBeInTheDocument()
  })
})
