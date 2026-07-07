import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FieldInput from './FieldInput'
import type { EntryListResponse } from '../../types/entry'

const mockRefData: EntryListResponse = {
  contentType: {
    id: 1, name: 'Author', slug: 'author', version: 1,
    fields: [{ id: 1, name: 'Name', type: 'text', required: true, position: 0 }],
  },
  entries: [
    { id: 10, data: { Name: 'Alice' }, isValid: true },
    { id: 11, data: { Name: 'Bob' }, isValid: true },
  ],
}

describe('FieldInput', () => {
  it('renders the field label', () => {
    render(<FieldInput name="Title" type="text" required={false} value="" onChange={vi.fn()} />)
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  it('shows required asterisk when required', () => {
    render(<FieldInput name="Title" type="text" required value="" onChange={vi.fn()} />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('renders a text input for type text', () => {
    render(<FieldInput name="Title" type="text" required={false} value="hello" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('hello')
  })

  it('renders a number input for type number', () => {
    render(<FieldInput name="Age" type="number" required={false} value={42} onChange={vi.fn()} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(42)
  })

  it('renders a checkbox for type boolean', () => {
    render(<FieldInput name="Published" type="boolean" required={false} value={true} onChange={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onChange with string when text input changes', () => {
    const onChange = vi.fn()
    render(<FieldInput name="Title" type="text" required={false} value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalledWith('hello')
  })

  it('shows error message', () => {
    render(<FieldInput name="Title" type="text" required value="" onChange={vi.fn()} error="Title is required" />)
    expect(screen.getByText('Title is required')).toBeInTheDocument()
  })

  it('renders a select for reference type with refData', () => {
    render(
      <FieldInput name="Author" type="reference" required={false} value="" onChange={vi.fn()} refData={mockRefData} />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows "no entries" message when refData has no entries', () => {
    const empty: EntryListResponse = { ...mockRefData, entries: [] }
    render(
      <FieldInput name="Author" type="reference" required={false} value="" onChange={vi.fn()} refData={empty} />
    )
    expect(screen.getByText(/No Author entries yet/)).toBeInTheDocument()
  })

  it('shows "entry no longer exists" when current id is not in refData', () => {
    render(
      <FieldInput name="Author" type="reference" required={false} value={999} onChange={vi.fn()} refData={mockRefData} />
    )
    expect(screen.getByText('Entry no longer exists')).toBeInTheDocument()
  })
})
