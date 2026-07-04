import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NewEntry from './NewEntry'
import * as ctService from '../../services/contentTypes'
import * as entriesService from '../../services/entries'
import type { ContentType } from '../../types/contentType'
import type { EntrySummary } from '../../types/entry'

vi.mock('../../services/contentTypes')
vi.mock('../../services/entries')

const mockGetCt = vi.mocked(ctService.getContentType)
const mockCreate = vi.mocked(entriesService.createEntry)
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const fakeCt: ContentType = {
  id: 1, name: 'Car', slug: 'car', version: 1,
  fields: [
    { id: 1, content_type_id: 1, name: 'Brand', type: 'text', required: true, position: 0 },
    { id: 2, content_type_id: 1, name: 'Year', type: 'number', required: false, position: 1 },
    { id: 3, content_type_id: 1, name: 'Active', type: 'boolean', required: false, position: 2 },
    { id: 4, content_type_id: 1, name: 'Built', type: 'date', required: false, position: 3 },
    { id: 5, content_type_id: 1, name: 'Owner', type: 'reference', required: false, position: 4 },
  ],
}

const fakeEntry: EntrySummary = { id: 1, data: { Brand: 'Toyota' }, isValid: true }

function render$() {
  return render(
    <MemoryRouter initialEntries={['/car/entries/new']}>
      <Routes>
        <Route path="/:slug/entries/new" element={<NewEntry />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('NewEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCt.mockResolvedValue(fakeCt)
    mockCreate.mockResolvedValue(fakeEntry)
  })

  it('shows the content type name in the heading', async () => {
    render$()
    expect(await screen.findByText(/new car entry/i)).toBeInTheDocument()
  })

  it('renders a text input for a text field', async () => {
    render$()
    expect(await screen.findByLabelText(/brand/i)).toBeInTheDocument()
  })

  it('renders a number input for a number field', async () => {
    render$()
    await screen.findByLabelText(/brand/i)
    expect(screen.getByLabelText(/year/i)).toHaveAttribute('type', 'number')
  })

  it('renders a checkbox for a boolean field', async () => {
    render$()
    await screen.findByLabelText(/brand/i)
    expect(screen.getByLabelText(/active/i)).toHaveAttribute('type', 'checkbox')
  })

  it('renders a date input for a date field', async () => {
    render$()
    await screen.findByLabelText(/brand/i)
    expect(screen.getByLabelText(/built/i)).toHaveAttribute('type', 'date')
  })

  it('renders reference field as disabled with "Reference coming soon"', async () => {
    render$()
    await screen.findByLabelText(/brand/i)
    expect(screen.getByText(/reference coming soon/i)).toBeInTheDocument()
  })

  it('marks required fields with *', async () => {
    render$()
    await screen.findByLabelText(/brand/i)
    const label = screen.getByText(/brand/i, { selector: 'label' })
    expect(label.textContent).toContain('*')
  })

  it('shows "Brand is required" when submitting with empty required field', async () => {
    render$()
    await screen.findByLabelText(/brand/i)
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByText('Brand is required')).toBeInTheDocument()
  })

  it('calls createEntry and navigates to entries list on success', async () => {
    render$()
    const input = await screen.findByLabelText(/brand/i)
    await userEvent.type(input, 'Toyota')
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('car', expect.objectContaining({ Brand: 'Toyota' })))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/car/entries'))
  })

  it('shows "Something went wrong" when save fails', async () => {
    mockCreate.mockRejectedValue(new Error('Network error'))
    render$()
    const input = await screen.findByLabelText(/brand/i)
    await userEvent.type(input, 'Toyota')
    fireEvent.submit(screen.getByRole('form'))
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('Cancel navigates back to entries list', async () => {
    render$()
    await screen.findByLabelText(/brand/i)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/car/entries')
  })

  it('redirects to / with error state when content type not found', async () => {
    mockGetCt.mockRejectedValue(new Error('Content type not found'))
    render$()
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { state: { error: 'Content type not found.' } })
    )
  })
})
