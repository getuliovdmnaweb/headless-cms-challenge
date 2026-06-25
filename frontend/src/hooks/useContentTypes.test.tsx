import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import * as contentTypesService from '../services/contentTypes'
import { useContentTypes, useCreateContentType, useDeleteContentType } from './useContentTypes'

vi.mock('../services/contentTypes')

function withQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { queryClient, wrapper: ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  ) }
}

describe('useContentTypes', () => {
  afterEach(() => vi.clearAllMocks())

  it('fetches the list of content types', async () => {
    vi.mocked(contentTypesService.getContentTypes).mockResolvedValue([
      { id: '1', name: 'Car', slug: 'car', version: 1, fields: [], fieldCount: 0, entryCount: 0, createdAt: '', updatedAt: '' },
    ])
    const { wrapper } = withQueryClient()

    const { result } = renderHook(() => useContentTypes(), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(result.current.data?.[0].name).toBe('Car')
  })
})

describe('useCreateContentType', () => {
  afterEach(() => vi.clearAllMocks())

  it('invalidates the content types list on success', async () => {
    vi.mocked(contentTypesService.createContentType).mockResolvedValue({
      id: '1', name: 'Car', slug: 'car', version: 1, fields: [], createdAt: '', updatedAt: '',
    })
    const { wrapper, queryClient } = withQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateContentType(), { wrapper })
    await result.current.mutateAsync({ name: 'Car', fields: [] })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contentTypes'] })
  })
})

describe('useDeleteContentType', () => {
  afterEach(() => vi.clearAllMocks())

  it('invalidates the content types list on success', async () => {
    vi.mocked(contentTypesService.deleteContentType).mockResolvedValue(undefined)
    const { wrapper, queryClient } = withQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteContentType(), { wrapper })
    await result.current.mutateAsync('1')

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contentTypes'] })
  })
})
