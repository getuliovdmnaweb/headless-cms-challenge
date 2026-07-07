import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Select from './Select'

describe('Select', () => {
  it('renders a select element', () => {
    render(
      <Select>
        <option value="text">text</option>
      </Select>
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders children as options', () => {
    render(
      <Select>
        <option value="text">text</option>
        <option value="number">number</option>
      </Select>
    )
    expect(screen.getByRole('option', { name: 'text' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'number' })).toBeInTheDocument()
  })

  it('passes value and onChange through', () => {
    const onChange = vi.fn()
    render(
      <Select value="text" onChange={onChange}>
        <option value="text">text</option>
        <option value="number">number</option>
      </Select>
    )
    expect(screen.getByRole('combobox')).toHaveValue('text')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'number' } })
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('has default border color when no error', () => {
    render(
      <Select>
        <option value="">pick</option>
      </Select>
    )
    expect(screen.getByRole('combobox')).toHaveClass('border-gray-300')
  })

  it('applies error classes when error prop is true', () => {
    render(
      <Select error>
        <option value="">pick</option>
      </Select>
    )
    const select = screen.getByRole('combobox')
    expect(select).toHaveClass('border-red-400')
    expect(select).toHaveClass('bg-red-50')
  })

  it('is disabled when disabled prop is set', () => {
    render(
      <Select disabled>
        <option value="">pick</option>
      </Select>
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('forwards aria-label', () => {
    render(
      <Select aria-label="References">
        <option value="person">person</option>
      </Select>
    )
    expect(screen.getByRole('combobox', { name: /references/i })).toBeInTheDocument()
  })

  it('accepts className override', () => {
    render(
      <Select className="extra-class">
        <option value="">pick</option>
      </Select>
    )
    expect(screen.getByRole('combobox')).toHaveClass('extra-class')
  })
})
