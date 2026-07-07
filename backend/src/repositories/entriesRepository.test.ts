import { prisma } from '../db'
import { createEntry, listByContentTypeId, findById, updateById, deleteById } from './entriesRepository'
import { createWithFields } from './contentTypesRepository'

async function seedContentType() {
  return createWithFields({
    name: 'Car',
    slug: 'car',
    fields: [
      { name: 'Brand', type: 'text', required: true, position: 0 },
      { name: 'Year', type: 'number', required: false, position: 1 },
    ],
  })
}

beforeEach(async () => {
  await prisma.entry.deleteMany()
  await prisma.field.deleteMany()
  await prisma.contentType.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('createEntry', () => {
  it('persists an entry for a content type', async () => {
    const ct = await seedContentType()
    const entry = await createEntry(ct.id, { Brand: 'Toyota', Year: 2020 })
    expect(entry.contentTypeId).toBe(ct.id)
    expect(entry.data).toEqual({ Brand: 'Toyota', Year: 2020 })
  })

  it('persists an entry with partial data', async () => {
    const ct = await seedContentType()
    const entry = await createEntry(ct.id, { Brand: 'Honda' })
    expect(entry.data).toEqual({ Brand: 'Honda' })
  })
})

describe('listByContentTypeId', () => {
  it('returns empty array when no entries exist', async () => {
    const ct = await seedContentType()
    expect(await listByContentTypeId(ct.id)).toEqual([])
  })

  it('returns entries ordered by createdAt asc', async () => {
    const ct = await seedContentType()
    await createEntry(ct.id, { Brand: 'Toyota' })
    await createEntry(ct.id, { Brand: 'Ford' })
    const entries = await listByContentTypeId(ct.id)
    expect(entries).toHaveLength(2)
    expect((entries[0].data as Record<string, unknown>).Brand).toBe('Toyota')
    expect((entries[1].data as Record<string, unknown>).Brand).toBe('Ford')
  })
})

describe('findById', () => {
  it('returns the entry when it exists', async () => {
    const ct = await seedContentType()
    const created = await createEntry(ct.id, { Brand: 'Toyota' })
    const found = await findById(created.id)
    expect(found?.id).toBe(created.id)
    expect((found?.data as Record<string, unknown>).Brand).toBe('Toyota')
  })

  it('returns null when entry does not exist', async () => {
    expect(await findById(99999)).toBeNull()
  })
})

describe('updateById', () => {
  it('updates the entry data', async () => {
    const ct = await seedContentType()
    const created = await createEntry(ct.id, { Brand: 'Toyota' })
    const updated = await updateById(created.id, { Brand: 'Honda', Year: 2022 })
    expect((updated.data as Record<string, unknown>).Brand).toBe('Honda')
    expect((updated.data as Record<string, unknown>).Year).toBe(2022)
  })
})

describe('deleteById', () => {
  it('removes the entry from the database', async () => {
    const ct = await seedContentType()
    const created = await createEntry(ct.id, { Brand: 'Toyota' })
    await deleteById(created.id)
    expect(await findById(created.id)).toBeNull()
  })
})
