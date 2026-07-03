import { createContentType, getContentType, listContentTypes, toSlug, updateContentType } from './contentTypesService'
import * as repo from '../repositories/contentTypesRepository'

jest.mock('../repositories/contentTypesRepository')

const mockFindBySlug = repo.findBySlug as jest.MockedFunction<typeof repo.findBySlug>
const mockFindBySlugWithFields = repo.findBySlugWithFields as jest.MockedFunction<typeof repo.findBySlugWithFields>
const mockCreateWithFields = repo.createWithFields as jest.MockedFunction<typeof repo.createWithFields>
const mockUpdateWithFields = repo.updateWithFields as jest.MockedFunction<typeof repo.updateWithFields>
const mockListWithFieldCount = repo.listWithFieldCount as jest.MockedFunction<typeof repo.listWithFieldCount>

const fakeCtRow = (overrides = {}) => ({
  id: 1, name: 'Article', slug: 'article', version: 1,
  createdAt: new Date(), updatedAt: new Date(),
  fields: [{ id: 1, contentTypeId: 1, name: 'Title', type: 'text', required: true, position: 0, options: {}, createdAt: new Date(), updatedAt: new Date() }],
  ...overrides,
})

beforeEach(() => jest.clearAllMocks())

describe('toSlug', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(toSlug('Blog Post')).toBe('blog-post')
  })

  it('strips special characters', () => {
    expect(toSlug('Hello, World!')).toBe('hello-world')
  })
})

describe('createContentType', () => {
  it('throws when slug already exists', async () => {
    mockFindBySlug.mockResolvedValue(fakeCtRow())
    await expect(
      createContentType({ name: 'Article', fields: [{ name: 'Title', type: 'text', required: true, position: 0 }] })
    ).rejects.toThrow('already exists')
  })

  it('calls repo.createWithFields with derived slug', async () => {
    mockFindBySlug.mockResolvedValue(null)
    mockCreateWithFields.mockResolvedValue(fakeCtRow())

    await createContentType({ name: 'Article', fields: [{ name: 'Title', type: 'text', required: true, position: 0 }] })

    expect(mockCreateWithFields).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'article', name: 'Article' })
    )
  })

  it('returns mapped ContentType shape', async () => {
    mockFindBySlug.mockResolvedValue(null)
    mockCreateWithFields.mockResolvedValue(fakeCtRow())

    const result = await createContentType({ name: 'Article', fields: [{ name: 'Title', type: 'text', required: true, position: 0 }] })

    expect(result.slug).toBe('article')
    expect(result.fields[0].content_type_id).toBe(1)
  })
})

describe('getContentType', () => {
  it('returns null when slug not found', async () => {
    mockFindBySlugWithFields.mockResolvedValue(null)
    expect(await getContentType('ghost')).toBeNull()
  })

  it('returns mapped ContentType with fields', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCtRow())
    const result = await getContentType('article')
    expect(result?.slug).toBe('article')
    expect(result?.fields[0].content_type_id).toBe(1)
  })
})

describe('updateContentType', () => {
  it('throws when slug not found', async () => {
    mockFindBySlug.mockResolvedValue(null)
    await expect(
      updateContentType('ghost', { name: 'Ghost', fields: [{ name: 'Title', type: 'text', required: false, position: 0 }] })
    ).rejects.toThrow('not found')
  })

  it('throws when renamed name conflicts with another type', async () => {
    mockFindBySlug.mockImplementation(async (slug) =>
      slug === 'car' ? fakeCtRow({ slug: 'car', name: 'Car' }) : fakeCtRow({ slug: 'automobile', name: 'Automobile' })
    )
    await expect(
      updateContentType('car', { name: 'Automobile', fields: [{ name: 'Brand', type: 'text', required: false, position: 0 }] })
    ).rejects.toThrow('already exists')
  })

  it('calls repo.updateWithFields and returns mapped ContentType', async () => {
    mockFindBySlug.mockImplementation(async (slug) =>
      slug === 'car' ? fakeCtRow({ slug: 'car', name: 'Car' }) : null
    )
    mockUpdateWithFields.mockResolvedValue(fakeCtRow({ name: 'Renamed Car', slug: 'car' }))

    const result = await updateContentType('car', {
      name: 'Renamed Car',
      fields: [{ name: 'Brand', type: 'text', required: true, position: 0 }],
    })

    expect(mockUpdateWithFields).toHaveBeenCalledWith('car', expect.objectContaining({ name: 'Renamed Car' }))
    expect(result.name).toBe('Renamed Car')
  })
})

describe('listContentTypes', () => {
  it('maps _count.fields to fieldCount', async () => {
    mockListWithFieldCount.mockResolvedValue([
      { id: 1, name: 'Car', slug: 'car', version: 1, createdAt: new Date(), updatedAt: new Date(), _count: { fields: 3 } },
    ])

    const list = await listContentTypes()
    expect(list[0].fieldCount).toBe(3)
  })
})
