import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditEntry from './EditEntry'
import * as entryService from '../../services/entries'
import * as ctService from '../../services/contentTypes'
import type { EntrySummary } from '../../types/entry'
import type { ContentType } from '../../types/contentType'

vi.mock('../../services/entries')
vi.mock('../../services/contentTypes')

const mockGetEntry = vi.mocked(entryService.getEntry)
const mockUpdateEntry = vi.mocked(entryService.updateEntry)
const mockGetEntries = vi.mocked(entryService.getEntries)
const mockGetCT = vi.mocked(ctService.getContentType)
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const fakeCT: ContentType = {
  id: 1, name: 'Car', slug: 'car', version: 1,
  fields: [
    { id: 1, content_type_id: 1, name: 'Brand', type: 'text', required: true, position: 0 },
    { id: 2, content_type_id: 1, name: 'Year', type: 'number', required: false, position: 1 },
  ],
}

const fakeCTWithRef: ContentType = {
  id: 1, name: 'Car', slug: 'car', version: 1,
  fields: [
    { id: 1, content_type_id: 1, name: 'Brand', type: 'text', required: true, position: 0 },
    { id: 3, content_type_id: 1, name: 'Owner', type: 'reference', required: false, position: 1, options: { targetSlug: 'person' } },
  ],
}

const fakePersonEntries = {
  contentType: { id: 2, name: 'Person', slug: 'person', version: 1, fields: [
    { id: 10, name: 'Full Name', type: 'text', required: true, position: 0 },
  ]},
  entries: [
    { id: 1, data: { 'Full Name': 'Alice Souza' }, isValid: true },
    { id: 2, data: { 'Full Name': 'Bob Lima' }, isValid: true },
  ],
}

const fakeEntry: EntrySummary = {
  id: 1,
  data: { Brand: 'Toyota', Year: 2020 },
  isValid: true,
}

function render$(slug = 'car', id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/${slug}/entries/${id}/edit`]}>
      <Routes>
        <Route path="/:slug/entries/:id/edit" element={<EditEntry />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EditEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCT.mockResolvedValue(fakeCT)
    mockGetEntry.mockResolvedValue(fakeEntry)
    mockUpdateEntry.mockResolvedValue({ ...fakeEntry, data: { Brand: 'Honda', Year: 2022 } })
    mockGetEntries.mockResolvedValue(fakePersonEntries)
  })

  it('loads and pre-fills the form with existing entry data', async () => {
    render$()
    expect(await screen.findByDisplayValue('Toyota')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2020')).toBeInTheDocument()
  })

  it('shows the content type name in the heading', async () => {
    render$()
    expect(await screen.findByRole('heading', { name: /edit car entry/i })).toBeInTheDocument()
  })

  it('Save button is present', async () => {
    render$()
    await screen.findByDisplayValue('Toyota')
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('Cancel navigates back to /:slug/entries', async () => {
    render$()
    await screen.findByDisplayValue('Toyota')
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/car/entries')
  })

  it('submitting updated values calls updateEntry and navigates to list', async () => {
    render$()
    await screen.findByDisplayValue('Toyota')
    const brandInput = screen.getByDisplayValue('Toyota')
    fireEvent.change(brandInput, { target: { value: 'Honda' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await vi.waitFor(() =>
      expect(mockUpdateEntry).toHaveBeenCalledWith('car', 1, expect.objectContaining({ Brand: 'Honda' }))
    )
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/car/entries'))
  })

  it('shows required validation error when required field is cleared', async () => {
    render$()
    await screen.findByDisplayValue('Toyota')
    fireEvent.change(screen.getByDisplayValue('Toyota'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByText(/brand is required/i)).toBeInTheDocument()
    expect(mockUpdateEntry).not.toHaveBeenCalled()
  })

  it('shows API error when updateEntry fails with a generic error', async () => {
    mockUpdateEntry.mockRejectedValue(new Error('Server error'))
    render$()
    await screen.findByDisplayValue('Toyota')
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('navigates to list with error state when PUT returns 404 (entry not found)', async () => {
    mockUpdateEntry.mockRejectedValue(new Error('Entry not found'))
    render$()
    await screen.findByDisplayValue('Toyota')
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await vi.waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/car/entries', { state: { error: 'Entry not found.' } })
    )
  })

  it('navigates to list with error state when entry not found on load', async () => {
    mockGetEntry.mockRejectedValue(new Error('Entry not found'))
    render$()
    await vi.waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/car/entries', { state: { error: 'Entry not found.' } })
    )
  })

  it('navigates to / with error state when content type not found on load', async () => {
    mockGetCT.mockRejectedValue(new Error('Content type not found'))
    render$()
    await vi.waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { state: { error: 'Content type not found.' } })
    )
  })

  it('renders reference field as a select with entries from target type', async () => {
    mockGetCT.mockResolvedValue(fakeCTWithRef)
    mockGetEntry.mockResolvedValue({ id: 1, data: { Brand: 'Toyota', Owner: 2 }, isValid: true })
    render$()
    const select = await screen.findByRole('combobox', { name: /owner/i })
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Alice Souza' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Bob Lima' })).toBeInTheDocument()
  })

  it('pre-selects the current reference value on edit', async () => {
    mockGetCT.mockResolvedValue(fakeCTWithRef)
    mockGetEntry.mockResolvedValue({ id: 1, data: { Brand: 'Toyota', Owner: 2 }, isValid: true })
    render$()
    const select = await screen.findByRole('combobox', { name: /owner/i }) as HTMLSelectElement
    await vi.waitFor(() => expect(select.value).toBe('2'))
  })

  it('shows "Entry no longer exists" when referenced entry was deleted', async () => {
    mockGetCT.mockResolvedValue(fakeCTWithRef)
    mockGetEntry.mockResolvedValue({ id: 1, data: { Brand: 'Toyota', Owner: 99 }, isValid: false })
    mockGetEntries.mockResolvedValue({ ...fakePersonEntries, entries: [] })
    render$()
    await screen.findByDisplayValue('Toyota')
    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument()
  })
})
