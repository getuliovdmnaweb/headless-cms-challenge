import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNewEntry } from './useNewEntry'
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
const mockCreateEntry = vi.mocked(entryService.createEntry)

const fakeCt = {
  id: 1, name: 'Article', slug: 'article', version: 1,
  fields: [
    { id: 1, content_type_id: 1, name: 'Title', type: 'text' as const, required: true, position: 0 },
    { id: 2, content_type_id: 1, name: 'Published', type: 'boolean' as const, required: false, position: 1 },
  ],
}

describe('useNewEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetEntries.mockResolvedValue({
      contentType: { id: 1, name: 'X', slug: 'x', version: 1, fields: [] },
      entries: [],
    })
    mockCreateEntry.mockResolvedValue({ id: 1, data: {}, isValid: true })
  })

  it('loads content type and initializes boolean fields to false', async () => {
    mockGetContentType.mockResolvedValue(fakeCt)
    const { result } = renderHook(() => useNewEntry('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.ct?.name).toBe('Article')
    expect(result.current.data.Published).toBe(false)
  })

  it('navigates to root when content type is not found', async () => {
    mockGetContentType.mockRejectedValue(new Error('not found'))
    renderHook(() => useNewEntry('article'))
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { state: { error: 'Content type not found.' } })
    )
  })

  it('handleChange updates data and clears field error', async () => {
    mockGetContentType.mockResolvedValue(fakeCt)
    const { result } = renderHook(() => useNewEntry('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.handleChange('Title', 'Hello'))
    expect(result.current.data.Title).toBe('Hello')
  })

  it('submit sets field error when required field is empty', async () => {
    mockGetContentType.mockResolvedValue(fakeCt)
    const { result } = renderHook(() => useNewEntry('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.submit() })
    expect(result.current.errors.Title).toBe('Title is required')
    expect(mockCreateEntry).not.toHaveBeenCalled()
  })

  it('submit calls createEntry and navigates on success', async () => {
    mockGetContentType.mockResolvedValue(fakeCt)
    const { result } = renderHook(() => useNewEntry('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.handleChange('Title', 'My Post'))
    await act(async () => { await result.current.submit() })
    expect(mockCreateEntry).toHaveBeenCalledWith('article', expect.objectContaining({ Title: 'My Post' }))
    expect(mockNavigate).toHaveBeenCalledWith('/article/entries')
  })

  it('submit sets apiError when createEntry fails', async () => {
    mockGetContentType.mockResolvedValue(fakeCt)
    mockCreateEntry.mockRejectedValue(new Error('Server error'))
    const { result } = renderHook(() => useNewEntry('article'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.handleChange('Title', 'My Post'))
    await act(async () => { await result.current.submit() })
    expect(result.current.apiError).toBe('Something went wrong')
  })
})
