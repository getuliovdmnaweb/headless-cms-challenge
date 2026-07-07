import { createEntry, listEntries } from './entriesService'
import * as ctRepo from '../repositories/contentTypesRepository'
import * as entriesRepo from '../repositories/entriesRepository'

jest.mock('../repositories/contentTypesRepository')
jest.mock('../repositories/entriesRepository')

const mockFindBySlugWithFields = ctRepo.findBySlugWithFields as jest.MockedFunction<typeof ctRepo.findBySlugWithFields>
const mockCreate = entriesRepo.createEntry as jest.MockedFunction<typeof entriesRepo.createEntry>
const mockList = entriesRepo.listByContentTypeId as jest.MockedFunction<typeof entriesRepo.listByContentTypeId>

const fakeCt = (overrides = {}) => ({
  id: 1, name: 'Car', slug: 'car', version: 1,
  createdAt: new Date(), updatedAt: new Date(),
  fields: [
    { id: 1, contentTypeId: 1, name: 'Brand', type: 'text', required: true, position: 0, options: {}, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, contentTypeId: 1, name: 'Year', type: 'number', required: false, position: 1, options: {}, createdAt: new Date(), updatedAt: new Date() },
  ],
  ...overrides,
})

const fakeEntryRow = (data: Record<string, unknown> = {}) =>
  ({ id: 1, contentTypeId: 1, data, createdAt: new Date(), updatedAt: new Date() }) as Awaited<ReturnType<typeof entriesRepo.createEntry>>

beforeEach(() => jest.clearAllMocks())

describe('listEntries', () => {
  it('throws when content type not found', async () => {
    mockFindBySlugWithFields.mockResolvedValue(null)
    await expect(listEntries('ghost')).rejects.toThrow('not found')
  })

  it('returns contentType shape and empty entries array', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt())
    mockList.mockResolvedValue([])
    const result = await listEntries('car')
    expect(result.contentType.name).toBe('Car')
    expect(result.contentType.fields).toHaveLength(2)
    expect(result.entries).toEqual([])
  })

  it('marks entry as valid when all required fields are present', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt())
    mockList.mockResolvedValue([fakeEntryRow({ Brand: 'Toyota', Year: 2020 })])
    const result = await listEntries('car')
    expect(result.entries[0].isValid).toBe(true)
  })

  it('marks entry as invalid when a required field is missing', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt())
    mockList.mockResolvedValue([fakeEntryRow({ Year: 2020 })])
    const result = await listEntries('car')
    expect(result.entries[0].isValid).toBe(false)
  })

  it('marks entry as invalid when a required field is empty string', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt())
    mockList.mockResolvedValue([fakeEntryRow({ Brand: '', Year: 2020 })])
    const result = await listEntries('car')
    expect(result.entries[0].isValid).toBe(false)
  })

  it('treats boolean required fields as always valid', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt({
      fields: [
        { id: 1, contentTypeId: 1, name: 'Active', type: 'boolean', required: true, position: 0, options: {}, createdAt: new Date(), updatedAt: new Date() },
      ],
    }))
    mockList.mockResolvedValue([fakeEntryRow({ Active: false })])
    const result = await listEntries('car')
    expect(result.entries[0].isValid).toBe(true)
  })

  it('marks entry invalid when required reference field has no value (presence check)', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt({
      fields: [
        { id: 1, contentTypeId: 1, name: 'Author', type: 'reference', required: true, position: 0, options: { targetSlug: 'person' }, createdAt: new Date(), updatedAt: new Date() },
      ],
    }))
    mockList.mockResolvedValue([fakeEntryRow({})])
    const result = await listEntries('car')
    expect(result.entries[0].isValid).toBe(false)
  })

  it('marks entry valid when required reference field has a numeric id value', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt({
      fields: [
        { id: 1, contentTypeId: 1, name: 'Author', type: 'reference', required: true, position: 0, options: { targetSlug: 'person' }, createdAt: new Date(), updatedAt: new Date() },
      ],
    }))
    mockList.mockResolvedValue([fakeEntryRow({ Author: 3 })])
    const result = await listEntries('car')
    expect(result.entries[0].isValid).toBe(true)
  })

  it('marks entry valid when optional reference field has no value', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt({
      fields: [
        { id: 1, contentTypeId: 1, name: 'Author', type: 'reference', required: false, position: 0, options: { targetSlug: 'person' }, createdAt: new Date(), updatedAt: new Date() },
      ],
    }))
    mockList.mockResolvedValue([fakeEntryRow({})])
    const result = await listEntries('car')
    expect(result.entries[0].isValid).toBe(true)
  })
})

describe('createEntry', () => {
  it('throws when content type not found', async () => {
    mockFindBySlugWithFields.mockResolvedValue(null)
    await expect(createEntry('ghost', {})).rejects.toThrow('not found')
  })

  it('calls repo.createEntry with the content type id', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt())
    mockCreate.mockResolvedValue(fakeEntryRow({ Brand: 'Toyota' }))
    await createEntry('car', { Brand: 'Toyota' })
    expect(mockCreate).toHaveBeenCalledWith(1, { Brand: 'Toyota' })
  })

  it('returns entry summary with isValid computed', async () => {
    mockFindBySlugWithFields.mockResolvedValue(fakeCt())
    mockCreate.mockResolvedValue(fakeEntryRow({ Brand: 'Toyota', Year: 2020 }))
    const result = await createEntry('car', { Brand: 'Toyota', Year: 2020 })
    expect(result.id).toBe(1)
    expect(result.isValid).toBe(true)
  })
})
