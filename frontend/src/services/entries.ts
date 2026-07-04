import type { EntryData, EntrySummary, EntryListResponse } from '../types/entry'

const BASE = 'http://localhost:4000/api'

export async function getEntries(slug: string): Promise<EntryListResponse> {
  const res = await fetch(`${BASE}/content-types/${slug}/entries`)
  if (!res.ok) throw new Error('Content type not found')
  return res.json()
}

export async function createEntry(slug: string, data: EntryData): Promise<EntrySummary> {
  const res = await fetch(`${BASE}/content-types/${slug}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Failed to create entry')
  return body
}

export async function getEntry(slug: string, id: number): Promise<EntrySummary> {
  const res = await fetch(`${BASE}/content-types/${slug}/entries/${id}`)
  if (res.status === 404) throw new Error('Entry not found')
  if (!res.ok) throw new Error('Something went wrong')
  return res.json()
}

export async function updateEntry(slug: string, id: number, data: EntryData): Promise<EntrySummary> {
  const res = await fetch(`${BASE}/content-types/${slug}/entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Failed to update entry')
  return body
}

export async function deleteEntry(slug: string, id: number): Promise<void> {
  const res = await fetch(`${BASE}/content-types/${slug}/entries/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Failed to delete entry')
  }
}
