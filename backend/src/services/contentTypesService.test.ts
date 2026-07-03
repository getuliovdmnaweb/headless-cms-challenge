import { createContentType, listContentTypes, toSlug } from './contentTypesService'
import * as repo from '../repositories/contentTypesRepository'

jest.mock('../repositories/contentTypesRepository')

const mockFindBySlug = repo.findBySlug as jest.MockedFunction<typeof repo.findBySlug>
const mockCreateWithFields = repo.createWithFields as jest.MockedFunction<typeof repo.createWithFields>
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

describe('listContentTypes', () => {
  it('maps _count.fields to fieldCount', async () => {
    mockListWithFieldCount.mockResolvedValue([
      { id: 1, name: 'Car', slug: 'car', version: 1, createdAt: new Date(), updatedAt: new Date(), _count: { fields: 3 } },
    ])

    const list = await listContentTypes()
    expect(list[0].fieldCount).toBe(3)
  })
})
