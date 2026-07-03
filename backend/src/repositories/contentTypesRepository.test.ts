import { prisma } from '../db'
import { findBySlug, createWithFields, listWithFieldCount } from './contentTypesRepository'
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
