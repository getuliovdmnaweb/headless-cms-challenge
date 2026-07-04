import { prisma } from '../db'
import { createEntry, listByContentTypeId } from './entriesRepository'
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
