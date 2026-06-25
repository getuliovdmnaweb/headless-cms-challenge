import { apiFetch } from './apiClient'
import { createContentType, deleteContentType, getContentType, getContentTypes, updateContentTypeFields } from './contentTypes'

vi.mock('./apiClient', () => ({ apiFetch: vi.fn() }))

describe('contentTypes service', () => {
  afterEach(() => vi.clearAllMocks())

  it('lists content types', async () => {
    await getContentTypes()
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types')
  })

  it('gets a single content type', async () => {
    await getContentType('1')
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/1')
  })

  it('creates a content type', async () => {
    await createContentType({ name: 'Car', fields: [] })
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types', {
      method: 'POST',
      body: JSON.stringify({ name: 'Car', fields: [] }),
    })
  })

  it('updates content type fields', async () => {
    await updateContentTypeFields('1', [])
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/1', {
      method: 'PATCH',
      body: JSON.stringify({ fields: [] }),
    })
  })

  it('deletes a content type', async () => {
    await deleteContentType('1')
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/1', { method: 'DELETE' })
  })
})
