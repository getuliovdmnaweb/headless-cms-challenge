import { render, screen, fireEvent } from '@testing-library/react'
import Select from './Select'

describe('Select', () => {
  it('renders options and reports the selected value', () => {
    const onChange = vi.fn()
    render(
      <Select
        value="text"
        onChange={onChange}
        options={[
          { value: 'text', label: 'Text' },
          { value: 'number', label: 'Number' },
        ]}
      />
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'number' } })

    expect(onChange).toHaveBeenCalledWith('number')
    expect(screen.getByRole('option', { name: 'Number' })).toBeInTheDocument()
  })
})
