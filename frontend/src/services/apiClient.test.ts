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

  it('throws an ApiError with the field and message from a singular error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { field: 'name', message: 'Name is required' } }),
      })
    )

    await expect(apiFetch('/api/content-types')).rejects.toMatchObject({
      status: 400,
      field: 'name',
      message: 'Name is required',
      errors: [{ field: 'name', message: 'Name is required' }],
    })
  })

  it('throws an ApiError exposing all entries from a plural errors body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          errors: [
            { field: 'brand', reason: 'required' },
            { field: 'year', reason: 'type' },
          ],
        }),
      })
    )

    await expect(apiFetch('/api/content-types/1/entries')).rejects.toMatchObject({
      status: 400,
      field: 'brand',
      errors: [
        { field: 'brand', reason: 'required' },
        { field: 'year', reason: 'type' },
      ],
    })
  })

  it('throws an ApiError exposing currentVersion and currentFields from a 409 conflict body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            message: 'This content type changed since you started editing.',
            currentVersion: 2,
            currentFields: [{ id: 'f1', name: 'make', type: 'text', required: false }],
          },
        }),
      })
    )

    await expect(apiFetch('/api/content-types/1/commit-change')).rejects.toMatchObject({
      status: 409,
      currentVersion: 2,
      currentFields: [{ id: 'f1', name: 'make', type: 'text', required: false }],
    })
  })
})
