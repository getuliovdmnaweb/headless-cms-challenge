import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEditEntry } from './useEditEntry'
import * as entryService from '../services/entries'
import * as ctService from '../services/contentTypes'

vi.mock('../services/entries')
vi.mock('../services/contentTypes')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockNavigate = vi.fn()
const mockGetContentType = vi.mocked(ctService.getContentType)
const mockGetEntries = vi.mocked(entryService.getEntries)
const mockGetEntry = vi.mocked(entryService.getEntry)
const mockUpdateEntry = vi.mocked(entryService.updateEntry)

const fakeCt = {
  id: 1, name: 'Article', slug: 'article', version: 1,
  fields: [
    { id: 1, content_type_id: 1, name: 'Title', type: 'text' as const, required: true, position: 0 },
  ],
}
const fakeEntry = { id: 5, data: { Title: 'Existing Title' }, isValid: true }

describe('useEditEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContentType.mockResolvedValue(fakeCt)
    mockGetEntry.mockResolvedValue(fakeEntry)
    mockGetEntries.mockResolvedValue({
      contentType: { id: 1, name: 'X', slug: 'x', version: 1, fields: [] },
      entries: [],
    })
    mockUpdateEntry.mockResolvedValue(fakeEntry)
  })

  it('loads content type and entry data', async () => {
    const { result } = renderHook(() => useEditEntry('article', '5'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.ct?.name).toBe('Article')
    expect(result.current.data.Title).toBe('Existing Title')
  })

  it('navigates to entries list when entry is not found', async () => {
    mockGetEntry.mockRejectedValue(new Error('Entry not found'))
    renderHook(() => useEditEntry('article', '999'))
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/article/entries', { state: { error: 'Entry not found.' } })
    )
  })

  it('navigates to root when content type is not found', async () => {
    mockGetContentType.mockRejectedValue(new Error('not found'))
    renderHook(() => useEditEntry('article', '5'))
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { state: { error: 'Content type not found.' } })
    )
  })

  it('handleChange updates data', async () => {
    const { result } = renderHook(() => useEditEntry('article', '5'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.handleChange('Title', 'New Title'))
    expect(result.current.data.Title).toBe('New Title')
  })

  it('submit sets field error when required field is empty', async () => {
    const { result } = renderHook(() => useEditEntry('article', '5'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.handleChange('Title', ''))
    await act(async () => { await result.current.submit() })
    expect(result.current.errors.Title).toBe('Title is required')
    expect(mockUpdateEntry).not.toHaveBeenCalled()
  })

  it('submit calls updateEntry and navigates on success', async () => {
    const { result } = renderHook(() => useEditEntry('article', '5'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.submit() })
    expect(mockUpdateEntry).toHaveBeenCalledWith('article', 5, expect.objectContaining({ Title: 'Existing Title' }))
    expect(mockNavigate).toHaveBeenCalledWith('/article/entries')
  })

  it('navigates to entries list when updateEntry returns "Entry not found"', async () => {
    mockUpdateEntry.mockRejectedValue(new Error('Entry not found'))
    const { result } = renderHook(() => useEditEntry('article', '5'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.submit() })
    expect(mockNavigate).toHaveBeenCalledWith('/article/entries', { state: { error: 'Entry not found.' } })
  })

  it('sets apiError on other update failures', async () => {
    mockUpdateEntry.mockRejectedValue(new Error('Server error'))
    const { result } = renderHook(() => useEditEntry('article', '5'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.submit() })
    expect(result.current.apiError).toBe('Something went wrong')
  })
})
