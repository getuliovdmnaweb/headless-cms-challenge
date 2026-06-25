import { apiFetch, ApiError } from './apiClient'

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: '1' }) })
    )

    const result = await apiFetch<{ id: string }>('/api/content-types')

    expect(result).toEqual({ id: '1' })
  })

  it('returns undefined for a 204 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))

    expect(await apiFetch('/api/content-types/1', { method: 'DELETE' })).toBeUndefined()
  })

  it('throws an ApiError with the field and message from the response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { field: 'name', message: 'Name is required' } }),
      })
    )

    await expect(apiFetch('/api/content-types')).rejects.toMatchObject(
      new ApiError(400, { field: 'name', message: 'Name is required' })
    )
  })
})
