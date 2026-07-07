import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditContentType from './EditContentType'
import * as service from '../../services/contentTypes'

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core')
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSensor: vi.fn(),
    useSensors: () => [],
  }
})

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/sortable')>('@dnd-kit/sortable')
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: undefined,
    }),
  }
})

vi.mock('../../services/contentTypes')
const mockGet = vi.mocked(service.getContentType)
const mockUpdate = vi.mocked(service.updateContentType)
const mockList = vi.mocked(service.listContentTypes)
const mockPreview = vi.mocked(service.previewChanges)
const mockCommit = vi.mocked(service.commitChanges)

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const fakeContentType = {
  id: 1,
  name: 'Car',
  slug: 'car',
  version: 1,
  fields: [
    { id: 1, content_type_id: 1, name: 'Brand', type: 'text' as const, required: true, position: 0 },
    { id: 2, content_type_id: 1, name: 'Year', type: 'number' as const, required: false, position: 1 },
  ],
}

function render$() {
  return render(
    <MemoryRouter initialEntries={['/edit/car']}>
      <Routes>
        <Route path="/edit/:slug" element={<EditContentType />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EditContentType', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue(fakeContentType)
    mockUpdate.mockResolvedValue({ ...fakeContentType, name: 'Automobile' })
    mockPreview?.mockResolvedValue?.({ changes: [], totalAffected: 0, unconvertible: 0 })
    mockCommit?.mockResolvedValue?.(fakeContentType)
    mockList.mockResolvedValue([
      { id: 1, name: 'Car', slug: 'car', version: 1, fieldCount: 2 },
      { id: 2, name: 'Person', slug: 'person', version: 1, fieldCount: 1 },
    ])
  })

  it('pre-fills name from loaded content type', async () => {
    render$()
    expect(await screen.findByDisplayValue('Car')).toBeInTheDocument()
  })

  it('renders slug as read-only', async () => {
    render$()
    const slugInput = await screen.findByDisplayValue('car')
    expect(slugInput).toHaveAttribute('readonly')
  })

  it('pre-fills existing fields', async () => {
    render$()
    expect(await screen.findByDisplayValue('Brand')).toBeInTheDocument()
    expect(await screen.findByDisplayValue('Year')).toBeInTheDocument()
  })

  it('can add a new field', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    const inputs = screen.getAllByPlaceholderText(/field name/i)
    expect(inputs).toHaveLength(3)
  })

  it('can delete a field', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await userEvent.click(deleteButtons[0])
    expect(screen.queryByDisplayValue('Brand')).not.toBeInTheDocument()
  })

  it('disables save when all fields are deleted', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await userEvent.click(deleteButtons[1])
    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    expect(screen.getByText(/add at least one field to continue/i)).toBeInTheDocument()
  })

  it('shows "Name is required" when submitting with empty name', async () => {
    render$()
    const nameInput = await screen.findByDisplayValue('Car')
    await userEvent.clear(nameInput)
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByText('Name is required')).toBeInTheDocument()
  })

  it('shows "Field name is required" when a field has no name', async () => {
    render$()
    const brandInput = await screen.findByDisplayValue('Brand')
    await userEvent.clear(brandInput)
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByText(/field name is required/i)).toBeInTheDocument()
  })

  it('shows "Field names must be unique" for duplicate field names', async () => {
    mockGet.mockResolvedValue({
      ...fakeContentType,
      fields: [
        { id: 1, content_type_id: 1, name: 'Brand', type: 'text' as const, required: true, position: 0 },
        { id: 2, content_type_id: 1, name: 'Brand', type: 'text' as const, required: false, position: 1 },
      ],
    })
    render$()
    await screen.findAllByDisplayValue('Brand')
    fireEvent.submit(screen.getByRole('form'))
    const errors = await screen.findAllByText(/field names must be unique/i)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('calls commitChanges and navigates to list on success', async () => {
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(mockCommit).toHaveBeenCalledWith('car', expect.any(Array), 1, {}))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('shows inline API error when commitChanges fails', async () => {
    mockPreview.mockResolvedValue({ changes: [], totalAffected: 0, unconvertible: 0 })
    mockCommit.mockRejectedValue(new Error('A content type with this name already exists'))
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument()
  })

  it('Cancel navigates back to the list', async () => {
    render$()
    await screen.findByDisplayValue('Car')
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('redirects to list with error state when slug is not found', async () => {
    mockGet.mockRejectedValue(new Error('Content type not found'))
    render$()
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { state: { error: 'Content type not found.' } })
    )
  })

  it('shows target content type dropdown when field type is reference', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    const typeSelects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(typeSelects[0], 'reference')
    expect(await screen.findByRole('combobox', { name: /references/i })).toBeInTheDocument()
  })

  it('excludes the current content type from the reference target list', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    const typeSelects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(typeSelects[0], 'reference')
    const targetSelect = await screen.findByRole('combobox', { name: /references/i })
    const options = Array.from(targetSelect.querySelectorAll('option')).map(o => o.textContent)
    expect(options).not.toContain('Car')
    expect(options).toContain('Person')
  })

  it('saves options.targetSlug when submitting a reference field', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    const typeSelects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(typeSelects[0], 'reference')
    const targetSelect = await screen.findByRole('combobox', { name: /references/i })
    await userEvent.selectOptions(targetSelect, 'person')
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() =>
      expect(mockCommit).toHaveBeenCalledWith('car', expect.arrayContaining([
        expect.objectContaining({ type: 'reference', options: { targetSlug: 'person' } }),
      ]), 1, {})
    )
  })
})

describe('EditContentType — migration flow', () => {
  const riskyImpact = {
    changes: [{ kind: 'type_change' as const, fieldName: 'Year', from: 'number', to: 'text' }],
    totalAffected: 2,
    unconvertible: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue(fakeContentType)
    mockList.mockResolvedValue([])
    mockPreview.mockResolvedValue({ changes: [], totalAffected: 0, unconvertible: 0 })
    mockCommit.mockResolvedValue(fakeContentType)
  })

  it('calls previewChanges on submit', async () => {
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(mockPreview).toHaveBeenCalledWith('car', expect.any(Array)))
  })

  it('calls commitChanges and navigates when no risky changes', async () => {
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(mockCommit).toHaveBeenCalledWith('car', expect.any(Array), 1, {}))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('opens ReviewModal when preview returns risky changes', async () => {
    mockPreview.mockResolvedValue(riskyImpact)
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('does not commit immediately when risky changes require review', async () => {
    mockPreview.mockResolvedValue(riskyImpact)
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    await screen.findByRole('dialog')
    expect(mockCommit).not.toHaveBeenCalled()
  })

  it('calls commitChanges and navigates when modal Apply is clicked', async () => {
    mockPreview.mockResolvedValue(riskyImpact)
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: /apply changes/i }))
    await waitFor(() => expect(mockCommit).toHaveBeenCalledWith('car', expect.any(Array), 1, {}))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('closes the modal when Cancel is clicked and does not commit', async () => {
    mockPreview.mockResolvedValue(riskyImpact)
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mockCommit).not.toHaveBeenCalled()
  })

  it('shows conflict error when commitChanges rejects with Conflict', async () => {
    mockPreview.mockResolvedValue({ changes: [], totalAffected: 0, unconvertible: 0 })
    mockCommit.mockRejectedValue(new Error('Content type was modified by another session. Reload and try again.'))
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByText(/modified by another session/i)).toBeInTheDocument()
  })

  it('sends the correct version loaded from the content type', async () => {
    mockGet.mockResolvedValue({ ...fakeContentType, version: 3 })
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(mockCommit).toHaveBeenCalledWith('car', expect.any(Array), 3, {}))
  })
})

describe('EditContentType — risky change highlighting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue(fakeContentType)
    mockList.mockResolvedValue([])
    mockPreview?.mockResolvedValue?.({ changes: [], totalAffected: 0, unconvertible: 0 })
    mockCommit?.mockResolvedValue?.(fakeContentType)
  })

  it('marks a row as risky when its type changes from the original', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    const typeSelects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(typeSelects[0], 'number')
    const riskyRows = document.querySelectorAll('[data-risky="true"]')
    expect(riskyRows).toHaveLength(1)
  })

  it('marks a row as risky when required changes from optional to required', async () => {
    render$()
    await screen.findByDisplayValue('Year')
    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[1])
    const riskyRows = document.querySelectorAll('[data-risky="true"]')
    expect(riskyRows).toHaveLength(1)
  })

  it('marks a new field as risky if it is required', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    const inputs = screen.getAllByPlaceholderText(/field name/i)
    await userEvent.type(inputs[2], 'Color')
    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[2])
    const riskyRows = document.querySelectorAll('[data-risky="true"]')
    expect(riskyRows).toHaveLength(1)
  })

  it('does not mark a row as risky when type is unchanged', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    const riskyRows = document.querySelectorAll('[data-risky="true"]')
    expect(riskyRows).toHaveLength(0)
  })

  it('does not mark a row as risky when relaxing required to optional', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[0])
    const riskyRows = document.querySelectorAll('[data-risky="true"]')
    expect(riskyRows).toHaveLength(0)
  })

  it('does not mark a new optional field as risky', async () => {
    render$()
    await screen.findByDisplayValue('Brand')
    await userEvent.click(screen.getByRole('button', { name: /add field/i }))
    const inputs = screen.getAllByPlaceholderText(/field name/i)
    await userEvent.type(inputs[2], 'Color')
    const riskyRows = document.querySelectorAll('[data-risky="true"]')
    expect(riskyRows).toHaveLength(0)
  })
})
