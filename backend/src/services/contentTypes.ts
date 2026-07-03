import { prisma } from '../db'

export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'reference'

export interface FieldInput {
  name: string
  type: FieldType
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

  const existing = await prisma.contentType.findUnique({ where: { slug } })
  if (existing) {
    throw new Error('A content type with this name already exists')
  }

  const ct = await prisma.contentType.create({
    data: {
      name: input.name,
      slug,
      fields: {
        create: input.fields.map(f => ({
          name: f.name,
          type: f.type,
          required: f.required,
          position: f.position,
        })),
      },
    },
    include: { fields: { orderBy: { position: 'asc' } } },
  })

  return {
    id: ct.id,
    name: ct.name,
    slug: ct.slug,
    version: ct.version,
    fields: ct.fields.map(f => ({
      id: f.id,
      content_type_id: f.contentTypeId,
      name: f.name,
      type: f.type as FieldType,
      required: f.required,
      position: f.position,
    })),
  }
}

export async function listContentTypes(): Promise<ContentTypeSummary[]> {
  const types = await prisma.contentType.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { fields: true } } },
  })

  return types.map(ct => ({
    id: ct.id,
    name: ct.name,
    slug: ct.slug,
    version: ct.version,
    fieldCount: ct._count.fields,
  }))
}
