import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEntryList } from './useEntryList'
import * as service from '../services/entries'
import { socket } from '../services/socket'

vi.mock('../services/entries')
vi.mock('../services/socket', () => ({
  socket: { on: vi.fn(), off: vi.fn() },
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate, useLocation: () => ({ state: null }) }
})

const mockNavigate = vi.fn()
const mockGetEntries = vi.mocked(service.getEntries)
const mockDeleteEntry = vi.mocked(service.deleteEntry)
const mockOn = vi.mocked(socket.on)
const mockOff = vi.mocked(socket.off)

const fakeData = {
  contentType: { id: 1, name: 'Article', slug: 'article', version: 1, fields: [] },
  entries: [
    { id: 1, data: { title: 'Post A' }, isValid: true },
    { id: 2, data: { title: 'Post B' }, isValid: true },
  ],
}

describe('useEntryList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts in loading state', () => {
    mockGetEntries.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useEntryList('article'))
    expect(result.current.loading).toBe(true)
  })

  it('returns data after fetch resolves', async () => {
    mockGetEntries.mockResolvedValue(fakeData)
    const { result } = renderHook(() => useEntryList('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual(fakeData)
    expect(result.current.fetchError).toBeNull()
  })

  it('sets fetchError on non-not-found error', async () => {
    mockGetEntries.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useEntryList('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fetchError).toBe('Something went wrong')
  })

  it('navigates to root on "not found" error', async () => {
    mockGetEntries.mockRejectedValue(new Error('Content type not found'))
    renderHook(() => useEntryList('article'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('removes entry from list after confirming delete', async () => {
    mockGetEntries.mockResolvedValue(fakeData)
    mockDeleteEntry.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { result } = renderHook(() => useEntryList('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.handleDelete(1) })
    expect(result.current.data?.entries).toHaveLength(1)
    expect(result.current.data?.entries[0].id).toBe(2)
  })

  it('does not delete when confirm returns false', async () => {
    mockGetEntries.mockResolvedValue(fakeData)
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { result } = renderHook(() => useEntryList('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.handleDelete(1) })
    expect(mockDeleteEntry).not.toHaveBeenCalled()
  })

  it('registers socket handlers for entry events on mount', async () => {
    mockGetEntries.mockResolvedValue(fakeData)
    renderHook(() => useEntryList('article'))
    await waitFor(() =>
      expect(mockOn).toHaveBeenCalledWith('entry:created', expect.any(Function))
    )
    expect(mockOn).toHaveBeenCalledWith('entry:updated', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('entry:deleted', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('content-type:deleted', expect.any(Function))
  })

  it('deregisters socket handlers on unmount', async () => {
    mockGetEntries.mockResolvedValue(fakeData)
    const { result, unmount } = renderHook(() => useEntryList('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    unmount()
    expect(mockOff).toHaveBeenCalledWith('entry:created', expect.any(Function))
    expect(mockOff).toHaveBeenCalledWith('entry:updated', expect.any(Function))
    expect(mockOff).toHaveBeenCalledWith('entry:deleted', expect.any(Function))
    expect(mockOff).toHaveBeenCalledWith('content-type:deleted', expect.any(Function))
  })
})
