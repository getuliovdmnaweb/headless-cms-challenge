import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEditContentType } from './useEditContentType'
import * as service from '../services/contentTypes'

vi.mock('../services/contentTypes')
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockNavigate = vi.fn()
const mockGet = vi.mocked(service.getContentType)
const mockList = vi.mocked(service.listContentTypes)
const mockPreview = vi.mocked(service.previewChanges)
const mockCommit = vi.mocked(service.commitChanges)

const fakeCT = {
  id: 1, name: 'Car', slug: 'car', version: 1,
  fields: [
    { id: 1, content_type_id: 1, name: 'Brand', type: 'text' as const, required: true, position: 0 },
    { id: 2, content_type_id: 1, name: 'Year', type: 'number' as const, required: false, position: 1 },
  ],
}

describe('useEditContentType', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue(fakeCT)
    mockList.mockResolvedValue([])
    mockPreview.mockResolvedValue({ changes: [], totalAffected: 0, unconvertible: 0 })
    mockCommit.mockResolvedValue(fakeCT)
  })

  it('loads the content type and pre-fills name and fields', async () => {
    const { result } = renderHook(() => useEditContentType('car'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.name).toBe('Car')
    expect(result.current.fields).toHaveLength(2)
  })

  it('navigates to list when content type is not found', async () => {
    mockGet.mockRejectedValue(new Error('not found'))
    renderHook(() => useEditContentType('unknown'))
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { state: { error: 'Content type not found.' } })
    )
  })

  it('marks a field as risky when its type changes from original', async () => {
    const { result } = renderHook(() => useEditContentType('car'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const yearField = result.current.fields.find(f => f.name === 'Year')!
    act(() => result.current.updateField(yearField._key, { type: 'text' }))
    const updatedYear = result.current.fields.find(f => f.name === 'Year')!
    expect(result.current.isFieldRisky(updatedYear)).toBe(true)
  })

  it('calls previewChanges on submit', async () => {
    const { result } = renderHook(() => useEditContentType('car'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.submit() })
    expect(mockPreview).toHaveBeenCalledWith('car', expect.any(Array))
  })

  it('commits directly and navigates when preview returns no risky changes', async () => {
    const { result } = renderHook(() => useEditContentType('car'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.submit() })
    expect(mockCommit).toHaveBeenCalledWith('car', expect.any(Array), 1, {})
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('opens reviewModal instead of committing when risky changes exist', async () => {
    mockPreview.mockResolvedValue({
      changes: [{ kind: 'type_change' as const, fieldName: 'Year', from: 'number', to: 'text' }],
      totalAffected: 2,
      unconvertible: 0,
    })
    const { result } = renderHook(() => useEditContentType('car'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.submit() })
    expect(result.current.reviewModal).not.toBeNull()
    expect(mockCommit).not.toHaveBeenCalled()
  })

  it('confirmModal calls commitChanges with fallback and navigates', async () => {
    mockPreview.mockResolvedValue({
      changes: [{ kind: 'type_change' as const, fieldName: 'Year', from: 'number', to: 'text' }],
      totalAffected: 2,
      unconvertible: 0,
    })
    const { result } = renderHook(() => useEditContentType('car'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.submit() })
    await act(async () => { await result.current.confirmModal({ Year: '0' }) })
    expect(mockCommit).toHaveBeenCalledWith('car', expect.any(Array), 1, { Year: '0' })
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
