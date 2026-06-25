import { render, screen, fireEvent } from '@testing-library/react'
import Checkbox from './Checkbox'

describe('Checkbox', () => {
  it('renders its label and reports toggles', () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onChange={onChange} label="Required" />)

    fireEvent.click(screen.getByLabelText('Required'))

    expect(onChange).toHaveBeenCalledWith(true)
  })
})
