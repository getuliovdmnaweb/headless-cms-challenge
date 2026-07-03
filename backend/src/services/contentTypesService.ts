import * as ContentTypesRepository from '../repositories/contentTypesRepository'
import type { FieldType, FieldInput, Field, ContentType, ContentTypeSummary } from '../types/contentTypes'

export type { FieldType, FieldInput, Field, ContentType, ContentTypeSummary }

export function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function createContentType(input: {
  name: string
  fields: FieldInput[]
}): Promise<ContentType> {
  const slug = toSlug(input.name)

  const existing = await ContentTypesRepository.findBySlug(slug)
  if (existing) throw new Error('A content type with this name already exists')

  const ct = await ContentTypesRepository.createWithFields({ name: input.name, slug, fields: input.fields })
  return mapContentType(ct)
}

function mapContentType(ct: { id: number; name: string; slug: string; version: number; fields: { id: number; contentTypeId: number; name: string; type: string; required: boolean; position: number }[] }): ContentType {
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

export async function getContentType(slug: string): Promise<ContentType | null> {
  const ct = await ContentTypesRepository.findBySlugWithFields(slug)
  if (!ct) return null
  return mapContentType(ct)
}

export async function updateContentType(slug: string, input: { name: string; fields: FieldInput[] }): Promise<ContentType> {
  const existing = await ContentTypesRepository.findBySlug(slug)
  if (!existing) throw new Error('Content type not found')

  const newSlug = toSlug(input.name)
  if (newSlug !== slug) {
    const conflict = await ContentTypesRepository.findBySlug(newSlug)
    if (conflict) throw new Error('A content type with this name already exists')
  }

  const ct = await ContentTypesRepository.updateWithFields(slug, { name: input.name, fields: input.fields })
  return mapContentType(ct)
}

export async function listContentTypes(): Promise<ContentTypeSummary[]> {
  const types = await ContentTypesRepository.listWithFieldCount()
  return types.map(ct => ({
    id: ct.id,
    name: ct.name,
    slug: ct.slug,
    version: ct.version,
    fieldCount: ct._count.fields,
  }))
}
