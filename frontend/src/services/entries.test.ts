import { apiFetch } from './apiClient'
import { createEntry, deleteEntry, getEntries, getEntry, updateEntry } from './entries'

vi.mock('./apiClient', () => ({ apiFetch: vi.fn() }))

describe('entries service', () => {
  afterEach(() => vi.clearAllMocks())

  it('lists entries for a content type', async () => {
    await getEntries('ct1')
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/ct1/entries')
  })

  it('gets a single entry', async () => {
    await getEntry('ct1', 'e1')
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/ct1/entries/e1')
  })

  it('creates an entry', async () => {
    await createEntry('ct1', { brand: 'Toyota' })
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/ct1/entries', {
      method: 'POST',
      body: JSON.stringify({ data: { brand: 'Toyota' } }),
    })
  })

  it('updates an entry', async () => {
    await updateEntry('ct1', 'e1', { brand: 'Honda' })
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/ct1/entries/e1', {
      method: 'PATCH',
      body: JSON.stringify({ data: { brand: 'Honda' } }),
    })
  })

  it('deletes an entry', async () => {
    await deleteEntry('ct1', 'e1')
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/ct1/entries/e1', { method: 'DELETE' })
  })
})
