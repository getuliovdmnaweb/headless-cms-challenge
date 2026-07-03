import type { ContentType, ContentTypeSummary, FieldInput } from '../types/contentType'

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
