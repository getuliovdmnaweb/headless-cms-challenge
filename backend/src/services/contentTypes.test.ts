import { pool } from '../db'
import { createContentType, listContentTypes, type FieldInput } from './contentTypes'

function field(overrides: Partial<FieldInput> & Pick<FieldInput, 'name' | 'type'>): FieldInput {
  return { required: false, position: 0, ...overrides }
}

beforeEach(async () => {
  await pool.query('DELETE FROM fields')
  await pool.query('DELETE FROM content_types')
})

afterAll(async () => {
  await pool.end()
})

describe('createContentType', () => {
  it('saves a content type with fields and returns it', async () => {
    const result = await createContentType({
      name: 'Article',
      fields: [
        field({ name: 'Title', type: 'text', required: true, position: 0 }),
        field({ name: 'Published', type: 'boolean', position: 1 }),
      ],
    })

    expect(result.name).toBe('Article')
    expect(result.slug).toBe('article')
    expect(result.fields).toHaveLength(2)
    expect(result.fields[0].name).toBe('Title')
    expect(result.fields[0].type).toBe('text')
    expect(result.fields[0].required).toBe(true)
  })

  it('derives the slug from the name', async () => {
    const result = await createContentType({
      name: 'Blog Post',
      fields: [field({ name: 'Body', type: 'text' })],
    })
    expect(result.slug).toBe('blog-post')
  })

  it('throws when name already exists', async () => {
    const input = {
      name: 'Car',
      fields: [field({ name: 'Brand', type: 'text', required: true })],
    }
    await createContentType(input)
    await expect(createContentType(input)).rejects.toThrow('already exists')
  })
})

describe('listContentTypes', () => {
  it('returns all content types with their field count', async () => {
    await createContentType({
      name: 'Author',
      fields: [
        field({ name: 'Name', type: 'text', required: true, position: 0 }),
        field({ name: 'Bio', type: 'text', position: 1 }),
      ],
    })
    await createContentType({
      name: 'Tag',
      fields: [field({ name: 'Label', type: 'text', required: true })],
    })

    const list = await listContentTypes()
    expect(list).toHaveLength(2)
    const author = list.find(t => t.slug === 'author')!
    expect(author.fieldCount).toBe(2)
    const tag = list.find(t => t.slug === 'tag')!
    expect(tag.fieldCount).toBe(1)
  })

  it('returns empty array when no types exist', async () => {
    const list = await listContentTypes()
    expect(list).toEqual([])
  })
})
