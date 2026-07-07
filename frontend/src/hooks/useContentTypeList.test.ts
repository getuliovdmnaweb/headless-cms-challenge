import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useContentTypeList } from './useContentTypeList'
import * as service from '../services/contentTypes'
import { socket } from '../services/socket'
import type { ContentTypeSummary } from '../types/contentType'

vi.mock('../services/contentTypes')
vi.mock('../services/socket', () => ({
  socket: { on: vi.fn(), off: vi.fn() },
}))

const mockList = vi.mocked(service.listContentTypes)
const mockDelete = vi.mocked(service.deleteContentType)
const mockOn = vi.mocked(socket.on)
const mockOff = vi.mocked(socket.off)

const twoTypes: ContentTypeSummary[] = [
  { id: 1, name: 'Article', slug: 'article', version: 1, fieldCount: 3 },
  { id: 2, name: 'Author', slug: 'author', version: 1, fieldCount: 2 },
]

describe('useContentTypeList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts in loading state', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useContentTypeList())
    expect(result.current.loading).toBe(true)
  })

  it('returns types after fetch resolves', async () => {
    mockList.mockResolvedValue(twoTypes)
    const { result } = renderHook(() => useContentTypeList())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.types).toEqual(twoTypes)
    expect(result.current.error).toBeNull()
  })

  it('sets error when fetch fails', async () => {
    mockList.mockRejectedValue(new Error('Network'))
    const { result } = renderHook(() => useContentTypeList())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Something went wrong')
    expect(result.current.types).toEqual([])
  })

  it('removes the type from the list after confirming delete', async () => {
    mockList.mockResolvedValue(twoTypes)
    mockDelete.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { result } = renderHook(() => useContentTypeList())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleDelete('article', 'Article')
    })

    expect(mockDelete).toHaveBeenCalledWith('article')
    expect(result.current.types).toHaveLength(1)
    expect(result.current.types[0].slug).toBe('author')
  })

  it('does not call delete when confirm returns false', async () => {
    mockList.mockResolvedValue(twoTypes)
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { result } = renderHook(() => useContentTypeList())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleDelete('article', 'Article')
    })

    expect(mockDelete).not.toHaveBeenCalled()
    expect(result.current.types).toHaveLength(2)
  })

  it('registers socket handlers for all three CT events on mount', async () => {
    mockList.mockResolvedValue([])
    renderHook(() => useContentTypeList())
    await waitFor(() =>
      expect(mockOn).toHaveBeenCalledWith('content-type:created', expect.any(Function))
    )
    expect(mockOn).toHaveBeenCalledWith('content-type:updated', expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('content-type:deleted', expect.any(Function))
  })

  it('deregisters socket handlers on unmount', async () => {
    mockList.mockResolvedValue([])
    const { result, unmount } = renderHook(() => useContentTypeList())
    await waitFor(() => expect(result.current.loading).toBe(false))
    unmount()
    expect(mockOff).toHaveBeenCalledWith('content-type:created', expect.any(Function))
    expect(mockOff).toHaveBeenCalledWith('content-type:updated', expect.any(Function))
    expect(mockOff).toHaveBeenCalledWith('content-type:deleted', expect.any(Function))
  })
})
