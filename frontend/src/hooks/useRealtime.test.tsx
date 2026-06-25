import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { getSocket } from '../services/socket'
import { useRealtime } from './useRealtime'

vi.mock('../services/socket')

function fakeSocket() {
  const handlers: Record<string, (payload: unknown) => void> = {}
  return {
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers[event] = handler
    }),
    off: vi.fn(),
    trigger: (event: string, payload: unknown) => handlers[event]?.(payload),
  }
}

function withQueryClient() {
  const queryClient = new QueryClient()
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useRealtime', () => {
  afterEach(() => vi.clearAllMocks())

  it('registers handlers for every realtime event on mount', () => {
    const socket = fakeSocket()
    vi.mocked(getSocket).mockReturnValue(socket as never)
    const { wrapper } = withQueryClient()

    renderHook(() => useRealtime(), { wrapper })

    expect(socket.on).toHaveBeenCalledWith('contentType:updated', expect.any(Function))
    expect(socket.on).toHaveBeenCalledWith('contentType:deleted', expect.any(Function))
    expect(socket.on).toHaveBeenCalledWith('entry:created', expect.any(Function))
    expect(socket.on).toHaveBeenCalledWith('entry:updated', expect.any(Function))
    expect(socket.on).toHaveBeenCalledWith('entry:deleted', expect.any(Function))
  })

  it('invalidates the content types list and the affected content type and entries on any event', () => {
    const socket = fakeSocket()
    vi.mocked(getSocket).mockReturnValue(socket as never)
    const { wrapper, queryClient } = withQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    renderHook(() => useRealtime(), { wrapper })
    socket.trigger('entry:updated', { contentTypeId: 'ct1', entryId: 'e1' })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contentTypes'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['contentTypes', 'ct1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['entries', 'ct1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['entries', 'ct1', 'e1'] })
  })

  it('removes its handlers on unmount', () => {
    const socket = fakeSocket()
    vi.mocked(getSocket).mockReturnValue(socket as never)
    const { wrapper } = withQueryClient()

    const { unmount } = renderHook(() => useRealtime(), { wrapper })
    unmount()

    expect(socket.off).toHaveBeenCalledWith('contentType:updated', expect.any(Function))
  })
})
