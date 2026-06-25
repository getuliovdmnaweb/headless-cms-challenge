import { pool } from '../db';

export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'reference';

export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  referenceContentTypeId?: string;
}

export interface ContentType {
  id: string;
  name: string;
  slug: string;
  version: number;
  fields: FieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentTypeSummary extends ContentType {
  fieldCount: number;
  entryCount: number;
}

export class ContentTypeError extends Error {
  code: 'INVALID_NAME' | 'DUPLICATE_SLUG';
  constructor(code: 'INVALID_NAME' | 'DUPLICATE_SLUG', message: string) {
    super(message);
    this.code = code;
  }
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toContentType(row: any): ContentType {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    version: row.version,
    fields: row.fields,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createContentType(input: {
  name: string;
  slug?: string;
  fields: FieldDefinition[];
}): Promise<ContentType> {
  const name = input.name.trim();
  if (!name) {
    throw new ContentTypeError('INVALID_NAME', 'Name is required');
  }
  const slug = input.slug?.trim() || slugify(name);

  try {
    const result = await pool.query(
      `INSERT INTO content_types (name, slug, fields) VALUES ($1, $2, $3)
       RETURNING id, name, slug, version, fields, created_at, updated_at`,
      [name, slug, JSON.stringify(input.fields)]
    );
    return toContentType(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      throw new ContentTypeError('DUPLICATE_SLUG', `A content type with slug "${slug}" already exists`);
    }
    throw err;
  }
}

export async function listContentTypes(): Promise<ContentTypeSummary[]> {
  const result = await pool.query(
    `SELECT ct.id, ct.name, ct.slug, ct.version, ct.fields, ct.created_at, ct.updated_at,
            COUNT(e.id) AS entry_count
     FROM content_types ct
     LEFT JOIN entries e ON e.content_type_id = ct.id
     GROUP BY ct.id
     ORDER BY ct.updated_at DESC`
  );
  return result.rows.map((row) => ({
    ...toContentType(row),
    fieldCount: row.fields.length,
    entryCount: Number(row.entry_count),
  }));
}

export async function getContentType(id: string): Promise<ContentType | null> {
  const result = await pool.query(
    `SELECT id, name, slug, version, fields, created_at, updated_at FROM content_types WHERE id = $1`,
    [id]
  );
  return result.rows[0] ? toContentType(result.rows[0]) : null;
}

export async function updateContentTypeFields(
  id: string,
  fields: FieldDefinition[]
): Promise<ContentType | null> {
  const result = await pool.query(
    `UPDATE content_types SET fields = $2, version = version + 1, updated_at = now()
     WHERE id = $1
     RETURNING id, name, slug, version, fields, created_at, updated_at`,
    [id, JSON.stringify(fields)]
  );
  return result.rows[0] ? toContentType(result.rows[0]) : null;
}

export async function deleteContentType(id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM content_types WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
