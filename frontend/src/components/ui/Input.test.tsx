import { render, screen, fireEvent } from '@testing-library/react'
import Input from './Input'

describe('Input', () => {
  it('renders the value and reports changes', () => {
    const onChange = vi.fn()
    render(<Input value="Car" onChange={onChange} placeholder="Name" />)

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Recipe' } })

    expect(onChange).toHaveBeenCalledWith('Recipe')
  })
})
