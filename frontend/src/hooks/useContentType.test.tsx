import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import * as contentTypesService from '../services/contentTypes'
import { useContentType, useUpdateContentTypeFields } from './useContentType'

vi.mock('../services/contentTypes')

function withQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { queryClient, wrapper: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  ) }
}

describe('useContentType', () => {
  afterEach(() => vi.clearAllMocks())

  it('fetches a single content type by id', async () => {
    vi.mocked(contentTypesService.getContentType).mockResolvedValue({
      id: '1', name: 'Car', slug: 'car', version: 1, fields: [], createdAt: '', updatedAt: '',
    })
    const { wrapper } = withQueryClient()

    const { result } = renderHook(() => useContentType('1'), { wrapper })

    await waitFor(() => expect(result.current.data?.name).toBe('Car'))
  })

  it('does not fetch when id is undefined', () => {
    const { wrapper } = withQueryClient()
    const { result } = renderHook(() => useContentType(undefined), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(contentTypesService.getContentType).not.toHaveBeenCalled()
  })
})

describe('useUpdateContentTypeFields', () => {
  afterEach(() => vi.clearAllMocks())

  it('invalidates the content type and list queries on success', async () => {
    vi.mocked(contentTypesService.updateContentTypeFields).mockResolvedValue({
      id: '1', name: 'Car', slug: 'car', version: 2, fields: [], createdAt: '', updatedAt: '',
    })
    const { wrapper, queryClient } = withQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateContentTypeFields('1'), { wrapper })
    await result.current.mutateAsync([])

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contentTypes', '1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contentTypes'] })
  })
})
