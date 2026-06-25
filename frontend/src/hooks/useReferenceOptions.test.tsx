import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import * as entriesService from '../services/entries'
import { useReferenceOptions } from './useReferenceOptions'

vi.mock('../services/entries')

function withQueryClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useReferenceOptions', () => {
  afterEach(() => vi.clearAllMocks())

  it('fetches entries for each content type id and maps them to options', async () => {
    vi.mocked(entriesService.getEntries).mockImplementation((contentTypeId: string) =>
      Promise.resolve(
        contentTypeId === 'person'
          ? [{ id: 'p1', contentTypeId: 'person', contentTypeVersion: 1, data: { name: 'Jane' }, isValid: true, errors: [], createdAt: '', updatedAt: '' }]
          : []
      )
    )
    const { wrapper } = withQueryClient()

    const { result } = renderHook(() => useReferenceOptions(['person']), { wrapper })

    await waitFor(() => expect(result.current.person).toEqual([{ value: 'p1', label: 'Jane' }]))
  })

  it('returns an empty array for content types with no entries yet', () => {
    vi.mocked(entriesService.getEntries).mockResolvedValue([])
    const { wrapper } = withQueryClient()

    const { result } = renderHook(() => useReferenceOptions(['person']), { wrapper })

    expect(result.current.person).toEqual([])
  })
})
