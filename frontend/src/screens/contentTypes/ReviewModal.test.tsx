import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ReviewModal from './ReviewModal'
import type { ImpactPreview } from '../../services/contentTypes'

const noRiskImpact: ImpactPreview = {
  changes: [],
  totalAffected: 0,
  unconvertible: 0,
}

const typeChangeImpact: ImpactPreview = {
  changes: [{ kind: 'type_change', fieldName: 'Year', from: 'text', to: 'number' }],
  totalAffected: 3,
  unconvertible: 1,
}

const multiChangeImpact: ImpactPreview = {
  changes: [
    { kind: 'type_change', fieldName: 'Year', from: 'text', to: 'number' },
    { kind: 'field_deleted', fieldName: 'Brand' },
    { kind: 'required_tightened', fieldName: 'Color' },
  ],
  totalAffected: 5,
  unconvertible: 1,
}

describe('ReviewModal', () => {
  it('renders heading and apply/cancel buttons', () => {
    render(<ReviewModal impact={noRiskImpact} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /apply changes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    render(<ReviewModal impact={noRiskImpact} onConfirm={vi.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onConfirm with empty fallback when Apply is clicked and no type changes', async () => {
    const onConfirm = vi.fn()
    render(<ReviewModal impact={noRiskImpact} onConfirm={onConfirm} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /apply changes/i }))
    expect(onConfirm).toHaveBeenCalledWith({})
  })

  it('shows type_change description with from and to types', () => {
    render(<ReviewModal impact={typeChangeImpact} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/year/i)).toBeInTheDocument()
    expect(screen.getByText(/text.*number/i)).toBeInTheDocument()
  })

  it('shows field_deleted description', () => {
    render(<ReviewModal impact={multiChangeImpact} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/brand/i)).toBeInTheDocument()
    expect(screen.getByText(/deleted/i)).toBeInTheDocument()
  })

  it('shows required_tightened description', () => {
    render(<ReviewModal impact={multiChangeImpact} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/color/i)).toBeInTheDocument()
    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })

  it('shows totalAffected count', () => {
    render(<ReviewModal impact={typeChangeImpact} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('shows fallback input when there are unconvertible entries', () => {
    render(<ReviewModal impact={typeChangeImpact} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText(/fallback for year/i)).toBeInTheDocument()
  })

  it('does not show fallback input when unconvertible is 0', () => {
    const impact: ImpactPreview = {
      changes: [{ kind: 'type_change', fieldName: 'Year', from: 'text', to: 'number' }],
      totalAffected: 2,
      unconvertible: 0,
    }
    render(<ReviewModal impact={impact} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByLabelText(/fallback/i)).not.toBeInTheDocument()
  })

  it('passes fallback value to onConfirm when user fills in a fallback', async () => {
    const onConfirm = vi.fn()
    render(<ReviewModal impact={typeChangeImpact} onConfirm={onConfirm} onCancel={vi.fn()} />)
    const fallbackInput = screen.getByLabelText(/fallback for year/i)
    await userEvent.type(fallbackInput, '0')
    await userEvent.click(screen.getByRole('button', { name: /apply changes/i }))
    expect(onConfirm).toHaveBeenCalledWith({ Year: '0' })
  })
})
