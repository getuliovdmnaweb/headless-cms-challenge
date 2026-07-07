import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Button from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('defaults to type="button" to avoid accidental form submission', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('can be set to type="submit"', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled and does not call onClick when disabled prop is set', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Click me</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards aria-label', () => {
    render(<Button aria-label="Delete item">✕</Button>)
    expect(screen.getByRole('button', { name: /delete item/i })).toBeInTheDocument()
  })

  it('applies className override', () => {
    render(<Button className="extra-class">Click</Button>)
    expect(screen.getByRole('button')).toHaveClass('extra-class')
  })

  it('primary variant has indigo background', () => {
    render(<Button variant="primary">Save</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-indigo-600')
  })

  it('secondary variant has gray border', () => {
    render(<Button variant="secondary">Cancel</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-gray-300')
  })

  it('warning variant has amber background', () => {
    render(<Button variant="warning">Apply changes</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-amber-600')
  })

  it('ghost variant has indigo text', () => {
    render(<Button variant="ghost">View</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-indigo-600')
  })

  it('danger variant has red text', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-red-500')
  })

  it('dashed variant has dashed border', () => {
    render(<Button variant="dashed">+ Add field</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-dashed')
  })
})
