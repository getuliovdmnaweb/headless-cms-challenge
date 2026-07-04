import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EntryList from './EntryList'
import * as service from '../../services/entries'
import type { EntryListResponse } from '../../types/entry'

vi.mock('../../services/entries')
const mockGet = vi.mocked(service.getEntries)
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const fakeResponse: EntryListResponse = {
  contentType: {
    id: 1, name: 'Car', slug: 'car', version: 1,
    fields: [
      { id: 1, name: 'Brand', type: 'text', required: true, position: 0 },
      { id: 2, name: 'Year', type: 'number', required: false, position: 1 },
    ],
  },
  entries: [
    { id: 1, data: { Brand: 'Toyota', Year: 2020 }, isValid: true },
    { id: 2, data: { Year: 2019 }, isValid: false },
  ],
}

function render$(slug = 'car') {
  return render(
    <MemoryRouter initialEntries={[`/${slug}/entries`]}>
      <Routes>
        <Route path="/:slug/entries" element={<EntryList />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EntryList', () => {
  beforeEach(() => { vi.clearAllMocks(); mockGet.mockResolvedValue(fakeResponse) })

  it('shows the content type name as heading', async () => {
    render$()
    expect(await screen.findByRole('heading', { name: /car/i })).toBeInTheDocument()
  })

  it('shows entry count', async () => {
    render$()
    expect(await screen.findByText(/2 entries/i)).toBeInTheDocument()
  })

  it('renders table columns from field names', async () => {
    render$()
    expect(await screen.findByText('Brand')).toBeInTheDocument()
    expect(screen.getByText('Year')).toBeInTheDocument()
  })

  it('renders valid entry data in a row', async () => {
    render$()
    expect(await screen.findByText('Toyota')).toBeInTheDocument()
    expect(screen.getByText('2020')).toBeInTheDocument()
  })

  it('shows "— missing" for missing required field', async () => {
    render$()
    await screen.findByText('Toyota')
    expect(screen.getByText('— missing')).toBeInTheDocument()
  })

  it('shows green Valid badge for valid entry', async () => {
    render$()
    expect(await screen.findByText('Valid')).toBeInTheDocument()
  })

  it('shows red Invalid badge for invalid entry', async () => {
    render$()
    expect(await screen.findByText('Invalid')).toBeInTheDocument()
  })

  it('shows empty state when no entries', async () => {
    mockGet.mockResolvedValue({ ...fakeResponse, entries: [] })
    render$()
    expect(await screen.findByText(/no entries yet/i)).toBeInTheDocument()
  })

  it('shows error when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('fail'))
    render$()
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('redirects to / when content type not found', async () => {
    mockGet.mockRejectedValue(new Error('Content type not found'))
    render$('ghost')
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('"New entry" link navigates to /:slug/entries/new', async () => {
    render$()
    await screen.findByRole('heading', { name: /car/i })
    expect(screen.getByRole('link', { name: /new entry/i })).toHaveAttribute('href', '/car/entries/new')
  })

  it('"Edit fields" link navigates to /edit/:slug', async () => {
    render$()
    await screen.findByRole('heading', { name: /car/i })
    expect(screen.getByRole('link', { name: /edit fields/i })).toHaveAttribute('href', '/edit/car')
  })
})
