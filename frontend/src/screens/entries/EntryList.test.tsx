import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EntryList from './EntryList'
import * as service from '../../services/entries'
import { socket } from '../../services/socket'
import type { EntryListResponse } from '../../types/entry'

vi.mock('../../services/entries')
vi.mock('../../services/socket', () => ({
  socket: { on: vi.fn(), off: vi.fn() },
}))

const mockGet = vi.mocked(service.getEntries)
const mockDelete = vi.mocked(service.deleteEntry)
const mockNavigate = vi.fn()
const mockOn = vi.mocked(socket.on)
const mockOff = vi.mocked(socket.off)

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

function render$(slug = 'car', locationState?: object) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/${slug}/entries`, state: locationState }]}>
      <Routes>
        <Route path="/:slug/entries" element={<EntryList />} />
      </Routes>
    </MemoryRouter>
  )
}

function getHandler(event: string): (...args: unknown[]) => void {
  const call = mockOn.mock.calls.find(([e]) => e === event)
  if (!call) throw new Error(`No socket.on handler registered for "${event}"`)
  return call[1] as (...args: unknown[]) => void
}

describe('EntryList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue(fakeResponse)
    mockDelete.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

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

  it('Edit button for entry is a link to /:slug/entries/:id/edit', async () => {
    render$()
    await screen.findByText('Toyota')
    const editLinks = screen.getAllByRole('link', { name: /^edit$/i })
    expect(editLinks[0]).toHaveAttribute('href', '/car/entries/1/edit')
  })

  it('Delete calls window.confirm and then deleteEntry', async () => {
    render$()
    await screen.findByText('Toyota')
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(window.confirm).toHaveBeenCalled()
    await vi.waitFor(() => expect(mockDelete).toHaveBeenCalledWith('car', 1))
  })

  it('Delete does nothing when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render$()
    await screen.findByText('Toyota')
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('Delete removes the row on success', async () => {
    render$()
    await screen.findByText('Toyota')
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    await vi.waitFor(() => expect(screen.queryByText('Toyota')).not.toBeInTheDocument())
  })

  it('Delete shows ErrorBanner when entry not found', async () => {
    mockDelete.mockRejectedValue(new Error('Entry not found'))
    render$()
    await screen.findByText('Toyota')
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(await screen.findByText('Entry not found.')).toBeInTheDocument()
  })

  it('Delete shows ErrorBanner on generic API error', async () => {
    mockDelete.mockRejectedValue(new Error('Something went wrong'))
    render$()
    await screen.findByText('Toyota')
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument()
  })

  it('shows ErrorBanner from location state on load', async () => {
    render$('car', { error: 'Entry not found.' })
    expect(await screen.findByText('Entry not found.')).toBeInTheDocument()
  })

  describe('real-time socket subscriptions', () => {
    it('registers handlers for entry and CT events on mount', async () => {
      render$()
      await screen.findByRole('heading', { name: /car/i })

      const events = mockOn.mock.calls.map(([e]) => e)
      expect(events).toContain('entry:created')
      expect(events).toContain('entry:updated')
      expect(events).toContain('entry:deleted')
      expect(events).toContain('content-type:deleted')
    })

    it('refetches entries when entry:created fires for this slug', async () => {
      render$()
      await screen.findByText('Toyota')

      const updatedResponse: EntryListResponse = {
        ...fakeResponse,
        entries: [...fakeResponse.entries, { id: 3, data: { Brand: 'Honda', Year: 2022 }, isValid: true }],
      }
      mockGet.mockResolvedValue(updatedResponse)
      getHandler('entry:created')({ slug: 'car' })

      expect(await screen.findByText('Honda')).toBeInTheDocument()
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('does not refetch when entry:created fires for a different slug', async () => {
      render$()
      await screen.findByText('Toyota')

      getHandler('entry:created')({ slug: 'other' })

      await vi.waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1))
    })

    it('refetches entries when entry:updated fires for this slug', async () => {
      render$()
      await screen.findByText('Toyota')

      const updatedResponse: EntryListResponse = {
        ...fakeResponse,
        entries: [{ id: 1, data: { Brand: 'Toyota Updated', Year: 2021 }, isValid: true }],
      }
      mockGet.mockResolvedValue(updatedResponse)
      getHandler('entry:updated')({ slug: 'car' })

      expect(await screen.findByText('Toyota Updated')).toBeInTheDocument()
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('refetches entries when entry:deleted fires for this slug', async () => {
      render$()
      await screen.findByText('Toyota')

      mockGet.mockResolvedValue({ ...fakeResponse, entries: [] })
      getHandler('entry:deleted')({ slug: 'car' })

      await vi.waitFor(() => expect(screen.queryByText('Toyota')).not.toBeInTheDocument())
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('navigates to / with error when content-type:deleted fires for this slug', async () => {
      render$()
      await screen.findByText('Toyota')

      getHandler('content-type:deleted')({ slug: 'car' })

      await vi.waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('/', { state: { error: 'Content type was deleted.' } })
      )
    })

    it('does not navigate when content-type:deleted fires for a different slug', async () => {
      render$()
      await screen.findByText('Toyota')

      getHandler('content-type:deleted')({ slug: 'other' })

      await vi.waitFor(() => expect(mockNavigate).not.toHaveBeenCalled())
    })

    it('deregisters all handlers on unmount', async () => {
      const { unmount } = render$()
      await screen.findByText('Toyota')

      unmount()

      const offEvents = mockOff.mock.calls.map(([e]) => e)
      expect(offEvents).toContain('entry:created')
      expect(offEvents).toContain('entry:updated')
      expect(offEvents).toContain('entry:deleted')
      expect(offEvents).toContain('content-type:deleted')
    })
  })
})
