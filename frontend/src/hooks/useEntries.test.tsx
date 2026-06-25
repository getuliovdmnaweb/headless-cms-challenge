import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import * as entriesService from '../services/entries'
import { useCreateEntry, useDeleteEntry, useEntries } from './useEntries'

vi.mock('../services/entries')

function withQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useEntries', () => {
  afterEach(() => vi.clearAllMocks())

  it('fetches entries for a content type', async () => {
    vi.mocked(entriesService.getEntries).mockResolvedValue([
      { id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1, data: {}, isValid: true, errors: [], createdAt: '', updatedAt: '' },
    ])
    const { wrapper } = withQueryClient()

    const { result } = renderHook(() => useEntries('ct1'), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(1))
  })
})

describe('useCreateEntry', () => {
  afterEach(() => vi.clearAllMocks())

  it('invalidates the entries list on success', async () => {
    vi.mocked(entriesService.createEntry).mockResolvedValue({
      id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1, data: {}, createdAt: '', updatedAt: '',
    })
    const { wrapper, queryClient } = withQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateEntry('ct1'), { wrapper })
    await result.current.mutateAsync({ brand: 'Toyota' })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['entries', 'ct1'] })
  })
})

describe('useDeleteEntry', () => {
  afterEach(() => vi.clearAllMocks())

  it('invalidates the entries list on success', async () => {
    vi.mocked(entriesService.deleteEntry).mockResolvedValue(undefined)
    const { wrapper, queryClient } = withQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteEntry('ct1'), { wrapper })
    await result.current.mutateAsync('e1')

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['entries', 'ct1'] })
  })
})
