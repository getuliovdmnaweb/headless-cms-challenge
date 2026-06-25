import { apiFetch } from './apiClient'
import type { Entry, EntryWithValidity } from '../types/entry'

export function getEntries(contentTypeId: string): Promise<EntryWithValidity[]> {
  return apiFetch(`/api/content-types/${contentTypeId}/entries`)
}

export function getEntry(contentTypeId: string, id: string): Promise<EntryWithValidity> {
  return apiFetch(`/api/content-types/${contentTypeId}/entries/${id}`)
}

export function createEntry(contentTypeId: string, data: Record<string, unknown>): Promise<Entry> {
  return apiFetch(`/api/content-types/${contentTypeId}/entries`, { method: 'POST', body: JSON.stringify({ data }) })
}

export function updateEntry(contentTypeId: string, id: string, data: Record<string, unknown>): Promise<Entry> {
  return apiFetch(`/api/content-types/${contentTypeId}/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  })
}

export function deleteEntry(contentTypeId: string, id: string): Promise<void> {
  return apiFetch(`/api/content-types/${contentTypeId}/entries/${id}`, { method: 'DELETE' })
}
