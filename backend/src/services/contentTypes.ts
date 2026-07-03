import { pool } from '../db'

export interface FieldInput {
  name: string
  type: 'text' | 'number' | 'boolean' | 'date' | 'reference'
  required: boolean
  position: number
}

export interface Field extends FieldInput {
  id: number
  content_type_id: number
}

export interface ContentType {
  id: number
  name: string
  slug: string
  version: number
  fields: Field[]
}

export interface ContentTypeSummary {
  id: number
  name: string
  slug: string
  version: number
  fieldCount: number
}

function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function createContentType(input: {
  name: string
  fields: FieldInput[]
}): Promise<ContentType> {
  const slug = toSlug(input.name)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: existing } = await client.query(
      'SELECT id FROM content_types WHERE slug = $1',
      [slug]
    )
    if (existing.length > 0) {
      throw new Error(`A content type with this name already exists`)
    }

    const { rows: [ct] } = await client.query(
      `INSERT INTO content_types (name, slug) VALUES ($1, $2) RETURNING *`,
      [input.name, slug]
    )

    const fields: Field[] = []
    for (const f of input.fields) {
      const { rows: [field] } = await client.query(
        `INSERT INTO fields (content_type_id, name, type, required, position)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [ct.id, f.name, f.type, f.required, f.position]
      )
      fields.push(field)
    }

    await client.query('COMMIT')
    return { ...ct, fields }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function listContentTypes(): Promise<ContentTypeSummary[]> {
  const { rows } = await pool.query(`
    SELECT ct.id, ct.name, ct.slug, ct.version,
           COUNT(f.id)::int AS "fieldCount"
    FROM content_types ct
    LEFT JOIN fields f ON f.content_type_id = ct.id
    GROUP BY ct.id
    ORDER BY ct.created_at ASC
  `)
  return rows
}
