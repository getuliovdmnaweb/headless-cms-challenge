import type { ContentType, ContentTypeSummary, FieldInput } from '../types/contentType'

export type ChangeKind = 'type_change' | 'field_deleted' | 'required_tightened' | 'required_field_added'

export interface FieldChange {
  kind: ChangeKind
  fieldName: string
  from?: string
  to?: string
}

export interface ImpactPreview {
  changes: FieldChange[]
  totalAffected: number
  unconvertible: number
}

const BASE = 'http://localhost:4000/api'

export async function listContentTypes(): Promise<ContentTypeSummary[]> {
  const res = await fetch(`${BASE}/content-types`)
  if (!res.ok) throw new Error('Failed to fetch content types')
  return res.json()
}

export async function createContentType(payload: {
  name: string
  fields: FieldInput[]
}): Promise<ContentType> {
  const res = await fetch(`${BASE}/content-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to create content type')
  return data
}

export async function getContentType(slug: string): Promise<ContentType> {
  const res = await fetch(`${BASE}/content-types/${slug}`)
  if (!res.ok) throw new Error('Content type not found')
  return res.json()
}

export async function updateContentType(slug: string, payload: { name: string; fields: FieldInput[] }): Promise<ContentType> {
  const res = await fetch(`${BASE}/content-types/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to update content type')
  return data
}

export async function previewChanges(slug: string, fields: FieldInput[]): Promise<ImpactPreview> {
  const res = await fetch(`${BASE}/content-types/${slug}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to preview changes')
  return data
}

export async function commitChanges(
  slug: string,
  fields: FieldInput[],
  version: number,
  fallback: Record<string, unknown>
): Promise<ContentType> {
  const res = await fetch(`${BASE}/content-types/${slug}/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, version, fallback }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to commit changes')
  return data
}

export async function deleteContentType(slug: string): Promise<void> {
  const res = await fetch(`${BASE}/content-types/${slug}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete content type')
}
