import { apiFetch } from './apiClient'
import {
  commitContentTypeChange,
  createContentType,
  deleteContentType,
  getContentType,
  getContentTypes,
  previewContentTypeChange,
  updateContentTypeFields,
} from './contentTypes'

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

  it('previews a content type change', async () => {
    await previewContentTypeChange('1', [])
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/1/preview-change', {
      method: 'POST',
      body: JSON.stringify({ fields: [] }),
    })
  })

  it('commits a content type change with backfills', async () => {
    await commitContentTypeChange('1', [], { f1: 1999 })
    expect(apiFetch).toHaveBeenCalledWith('/api/content-types/1/commit-change', {
      method: 'POST',
      body: JSON.stringify({ fields: [], backfills: { f1: 1999 } }),
    })
  })
})
