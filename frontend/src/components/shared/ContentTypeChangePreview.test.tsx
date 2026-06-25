import { render, screen, fireEvent } from '@testing-library/react'
import ContentTypeChangePreview from './ContentTypeChangePreview'
import type { FieldImpact } from '../../types/evolution'

describe('ContentTypeChangePreview', () => {
  it('shows an auto-migrated summary with no backfill input when nothing needs attention', () => {
    const impacts: FieldImpact[] = [
      { fieldId: 'f1', fieldName: 'make', changes: ['renamed'], affectedCount: 9, autoMigratedCount: 9, needsAttention: [] },
    ]
    render(<ContentTypeChangePreview impacts={impacts} onCommit={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Auto-migrated')).toBeInTheDocument()
    expect(screen.getByText(/9/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Backfill value')).not.toBeInTheDocument()
  })

  it('shows needs-attention entries with sample values and a backfill input', () => {
    const impacts: FieldImpact[] = [
      {
        fieldId: 'f1',
        fieldName: 'owner',
        changes: ['required-changed'],
        affectedCount: 3,
        autoMigratedCount: 2,
        needsAttention: [{ entryId: 'e1', currentValue: undefined }],
      },
    ]
    render(<ContentTypeChangePreview impacts={impacts} onCommit={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('Needs attention')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Backfill value')).toBeInTheDocument()
  })

  it('commits with the entered backfill values keyed by field id', () => {
    const impacts: FieldImpact[] = [
      {
        fieldId: 'f1',
        fieldName: 'owner',
        changes: ['required-changed'],
        affectedCount: 1,
        autoMigratedCount: 0,
        needsAttention: [{ entryId: 'e1', currentValue: undefined }],
      },
    ]
    const onCommit = vi.fn()
    render(<ContentTypeChangePreview impacts={impacts} onCommit={onCommit} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Backfill value'), { target: { value: 'Unassigned' } })
    fireEvent.click(screen.getByRole('button', { name: 'Commit changes' }))

    expect(onCommit).toHaveBeenCalledWith({ f1: 'Unassigned' })
  })

  it('commits with no backfills when none were entered', () => {
    const impacts: FieldImpact[] = [
      { fieldId: 'f1', fieldName: 'owner', changes: ['required-changed'], affectedCount: 1, autoMigratedCount: 0, needsAttention: [{ entryId: 'e1', currentValue: undefined }] },
    ]
    const onCommit = vi.fn()
    render(<ContentTypeChangePreview impacts={impacts} onCommit={onCommit} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Commit changes' }))

    expect(onCommit).toHaveBeenCalledWith({})
  })

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()
    render(<ContentTypeChangePreview impacts={[]} onCommit={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
  })
})
