import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import * as entriesService from '../services/entries'
import { useEntry, useUpdateEntry } from './useEntry'

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

describe('useEntry', () => {
  afterEach(() => vi.clearAllMocks())

  it('fetches a single entry', async () => {
    vi.mocked(entriesService.getEntry).mockResolvedValue({
      id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1, data: { brand: 'Toyota' }, isValid: true, errors: [], createdAt: '', updatedAt: '',
    })
    const { wrapper } = withQueryClient()

    const { result } = renderHook(() => useEntry('ct1', 'e1'), { wrapper })

    await waitFor(() => expect(result.current.data?.data.brand).toBe('Toyota'))
  })
})

describe('useUpdateEntry', () => {
  afterEach(() => vi.clearAllMocks())

  it('invalidates the entry and list queries on success', async () => {
    vi.mocked(entriesService.updateEntry).mockResolvedValue({
      id: 'e1', contentTypeId: 'ct1', contentTypeVersion: 1, data: {}, createdAt: '', updatedAt: '',
    })
    const { wrapper, queryClient } = withQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateEntry('ct1', 'e1'), { wrapper })
    await result.current.mutateAsync({ brand: 'Honda' })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['entries', 'ct1', 'e1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['entries', 'ct1'] })
  })
})
