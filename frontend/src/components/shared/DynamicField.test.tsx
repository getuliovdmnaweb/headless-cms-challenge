import { render, screen, fireEvent } from '@testing-library/react'
import DynamicField from './DynamicField'
import type { FieldDefinition } from '../../types/contentType'

describe('DynamicField', () => {
  it('renders a text input for a text field', () => {
    const field: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: true }
    const onChange = vi.fn()
    render(<DynamicField field={field} value="Toyota" onChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText('brand'), { target: { value: 'Honda' } })
    expect(onChange).toHaveBeenCalledWith('Honda')
  })

  it('renders a number input and coerces to a number', () => {
    const field: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false }
    const onChange = vi.fn()
    render(<DynamicField field={field} value={2022} onChange={onChange} />)

    fireEvent.change(screen.getByPlaceholderText('year'), { target: { value: '2023' } })
    expect(onChange).toHaveBeenCalledWith(2023)
  })

  it('renders a checkbox for a boolean field', () => {
    const field: FieldDefinition = { id: 'f1', name: 'available', type: 'boolean', required: false }
    const onChange = vi.fn()
    render(<DynamicField field={field} value={false} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('available'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('renders a select for a reference field using the given options', () => {
    const field: FieldDefinition = { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'ct2' }
    const onChange = vi.fn()
    render(
      <DynamicField field={field} value="" onChange={onChange} referenceOptions={[{ value: 'e1', label: 'Jane' }]} />
    )

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'e1' } })
    expect(onChange).toHaveBeenCalledWith('e1')
  })
})
