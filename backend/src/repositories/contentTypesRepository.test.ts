import { prisma } from '../db'
import { findBySlug, findBySlugWithFields, createWithFields, listWithFieldCount, updateWithFields, deleteBySlug } from './contentTypesRepository'
import type { FieldInput } from '../types/contentTypes'

function field(overrides: Partial<FieldInput> & Pick<FieldInput, 'name' | 'type'>): FieldInput {
  return { required: false, position: 0, ...overrides }
}

beforeEach(async () => {
  await prisma.field.deleteMany()
  await prisma.contentType.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('findBySlug', () => {
  it('returns null when no match', async () => {
    expect(await findBySlug('ghost')).toBeNull()
  })

  it('returns the content type when found', async () => {
    await createWithFields({ name: 'Car', slug: 'car', fields: [field({ name: 'Brand', type: 'text' })] })
    const result = await findBySlug('car')
    expect(result?.name).toBe('Car')
  })
})

describe('createWithFields', () => {
  it('persists content type and fields in one transaction', async () => {
    const ct = await createWithFields({
      name: 'Article',
      slug: 'article',
      fields: [
        field({ name: 'Title', type: 'text', required: true, position: 0 }),
        field({ name: 'Published', type: 'boolean', position: 1 }),
      ],
    })
    expect(ct.name).toBe('Article')
    expect(ct.slug).toBe('article')
    expect(ct.fields).toHaveLength(2)
    expect(ct.fields[0].name).toBe('Title')
    expect(ct.fields[0].required).toBe(true)
  })
})

describe('findBySlugWithFields', () => {
  it('returns null when no match', async () => {
    expect(await findBySlugWithFields('ghost')).toBeNull()
  })

  it('returns content type with fields ordered by position', async () => {
    await createWithFields({
      name: 'Car',
      slug: 'car',
      fields: [
        field({ name: 'Brand', type: 'text', position: 0 }),
        field({ name: 'Year', type: 'number', position: 1 }),
      ],
    })
    const result = await findBySlugWithFields('car')
    expect(result?.name).toBe('Car')
    expect(result?.fields).toHaveLength(2)
    expect(result?.fields[0].name).toBe('Brand')
    expect(result?.fields[1].name).toBe('Year')
  })
})

describe('updateWithFields', () => {
  it('updates the name and replaces all fields', async () => {
    await createWithFields({
      name: 'Car',
      slug: 'car',
      fields: [field({ name: 'Brand', type: 'text', position: 0 })],
    })

    const updated = await updateWithFields('car', {
      name: 'Automobile',
      fields: [
        field({ name: 'Make', type: 'text', position: 0 }),
        field({ name: 'Year', type: 'number', position: 1 }),
      ],
    })

    expect(updated.name).toBe('Automobile')
    expect(updated.slug).toBe('car')
    expect(updated.fields).toHaveLength(2)
    expect(updated.fields[0].name).toBe('Make')
    expect(updated.fields[1].name).toBe('Year')
  })

  it('removes fields that are no longer in the list', async () => {
    await createWithFields({
      name: 'Car',
      slug: 'car',
      fields: [
        field({ name: 'Brand', type: 'text', position: 0 }),
        field({ name: 'Model', type: 'text', position: 1 }),
      ],
    })

    const updated = await updateWithFields('car', {
      name: 'Car',
      fields: [field({ name: 'Brand', type: 'text', position: 0 })],
    })

    expect(updated.fields).toHaveLength(1)
  })
})

describe('deleteBySlug', () => {
  it('removes the content type and its fields', async () => {
    await createWithFields({
      name: 'Car',
      slug: 'car',
      fields: [field({ name: 'Brand', type: 'text', position: 0 })],
    })
    await deleteBySlug('car')
    expect(await findBySlug('car')).toBeNull()
  })

  it('is a no-op when the slug does not exist', async () => {
    await expect(deleteBySlug('ghost')).resolves.not.toThrow()
  })
})

describe('listWithFieldCount', () => {
  it('returns all types with their field counts', async () => {
    await createWithFields({
      name: 'Author',
      slug: 'author',
      fields: [field({ name: 'Name', type: 'text', position: 0 }), field({ name: 'Bio', type: 'text', position: 1 })],
    })
    await createWithFields({
      name: 'Tag',
      slug: 'tag',
      fields: [field({ name: 'Label', type: 'text' })],
    })

    const list = await listWithFieldCount()
    expect(list).toHaveLength(2)
    expect(list.find(t => t.slug === 'author')?._count.fields).toBe(2)
    expect(list.find(t => t.slug === 'tag')?._count.fields).toBe(1)
  })
})
