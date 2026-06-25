import { render, screen, fireEvent } from '@testing-library/react'
import Button from './Button'

describe('Button', () => {
  it('renders its label and handles clicks', () => {
    const onClick = vi.fn()
    render(<Button label="Save" onClick={onClick} />)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disables the button when disabled is true', () => {
    render(<Button label="Save" onClick={() => {}} disabled />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
