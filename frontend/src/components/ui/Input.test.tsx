import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Input from './Input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('passes value and onChange through', () => {
    const onChange = vi.fn()
    render(<Input value="hello" onChange={onChange} />)
    expect(screen.getByRole('textbox')).toHaveValue('hello')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'world' } })
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('passes placeholder through', () => {
    render(<Input placeholder="e.g. Blog post" />)
    expect(screen.getByPlaceholderText('e.g. Blog post')).toBeInTheDocument()
  })

  it('has default border color when no error', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toHaveClass('border-gray-300')
  })

  it('applies error classes when error prop is true', () => {
    render(<Input error />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-400')
    expect(input).toHaveClass('bg-red-50')
  })

  it('does not apply error classes when error prop is false', () => {
    render(<Input error={false} />)
    const input = screen.getByRole('textbox')
    expect(input).not.toHaveClass('border-red-400')
    expect(input).not.toHaveClass('bg-red-50')
  })

  it('applies readonly styles when readOnly is set', () => {
    render(<Input readOnly />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('readonly')
    expect(input).toHaveClass('bg-gray-50')
    expect(input).toHaveClass('cursor-not-allowed')
  })

  it('accepts className override', () => {
    render(<Input className="extra-class" />)
    expect(screen.getByRole('textbox')).toHaveClass('extra-class')
  })

  it('forwards id for label association', () => {
    render(<Input id="ct-name" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'ct-name')
  })
})
