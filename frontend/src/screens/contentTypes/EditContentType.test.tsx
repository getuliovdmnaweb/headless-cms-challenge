import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

  it('calls updateContentType and navigates to list on success', async () => {
    render$()
    await screen.findByDisplayValue('Car')
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('car', expect.objectContaining({ name: 'Car' })))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('shows inline API error when name conflicts', async () => {
    mockUpdate.mockRejectedValue(new Error('A content type with this name already exists'))
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

  it('redirects to list when slug is not found', async () => {
    mockGet.mockRejectedValue(new Error('Content type not found'))
    render$()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })
})
