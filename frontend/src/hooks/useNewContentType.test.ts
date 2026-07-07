import { renderHook, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNewContentType } from './useNewContentType'
import * as service from '../services/contentTypes'

vi.mock('../services/contentTypes')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockNavigate = vi.fn()
const mockCreate = vi.mocked(service.createContentType)
const mockList = vi.mocked(service.listContentTypes)

const wrapper = ({ children }: { children: React.ReactNode }) =>
  MemoryRouter({ children })

describe('useNewContentType', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockList.mockResolvedValue([])
    mockCreate.mockResolvedValue({
      id: 1, name: 'Article', slug: 'article', version: 1, fields: [],
    })
  })

  it('starts with empty name and no fields', () => {
    const { result } = renderHook(() => useNewContentType(), { wrapper })
    expect(result.current.name).toBe('')
    expect(result.current.fields).toEqual([])
    expect(result.current.canSubmit).toBe(false)
  })

  it('derives slug from name', () => {
    const { result } = renderHook(() => useNewContentType(), { wrapper })
    act(() => result.current.setName('Blog Post'))
    expect(result.current.slug).toBe('blog-post')
  })

  it('canSubmit becomes true after adding a field', () => {
    const { result } = renderHook(() => useNewContentType(), { wrapper })
    act(() => result.current.addField())
    expect(result.current.canSubmit).toBe(true)
  })

  it('submit sets nameError when name is empty', async () => {
    const { result } = renderHook(() => useNewContentType(), { wrapper })
    act(() => result.current.addField())
    await act(async () => { await result.current.submit() })
    expect(result.current.nameError).toBe('Name is required')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('submit sets field error when a field has no name', async () => {
    const { result } = renderHook(() => useNewContentType(), { wrapper })
    act(() => result.current.setName('Article'))
    act(() => result.current.addField())
    await act(async () => { await result.current.submit() })
    const fieldWithError = result.current.fields.find(f => f.error)
    expect(fieldWithError?.error).toBe('Field name is required')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('submit calls createContentType and navigates on success', async () => {
    const { result } = renderHook(() => useNewContentType(), { wrapper })
    act(() => result.current.setName('Article'))
    act(() => result.current.addField())
    act(() => result.current.updateField(result.current.fields[0]._key, { name: 'Title' }))
    await act(async () => { await result.current.submit() })
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Article' }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('submit sets apiError when createContentType rejects', async () => {
    mockCreate.mockRejectedValue(new Error('A content type with this name already exists'))
    const { result } = renderHook(() => useNewContentType(), { wrapper })
    act(() => result.current.setName('Article'))
    act(() => result.current.addField())
    act(() => result.current.updateField(result.current.fields[0]._key, { name: 'Title' }))
    await act(async () => { await result.current.submit() })
    expect(result.current.apiError).toMatch(/already exists/)
  })
})
