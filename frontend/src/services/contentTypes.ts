import { apiFetch } from './apiClient'
import type { ContentType, ContentTypeSummary, FieldDefinition } from '../types/contentType'

export function getContentTypes(): Promise<ContentTypeSummary[]> {
  return apiFetch('/api/content-types')
}

export function getContentType(id: string): Promise<ContentType> {
  return apiFetch(`/api/content-types/${id}`)
}

export function createContentType(input: { name: string; slug?: string; fields: FieldDefinition[] }): Promise<ContentType> {
  return apiFetch('/api/content-types', { method: 'POST', body: JSON.stringify(input) })
}

export function updateContentTypeFields(id: string, fields: FieldDefinition[]): Promise<ContentType> {
  return apiFetch(`/api/content-types/${id}`, { method: 'PATCH', body: JSON.stringify({ fields }) })
}

export function deleteContentType(id: string): Promise<void> {
  return apiFetch(`/api/content-types/${id}`, { method: 'DELETE' })
}
