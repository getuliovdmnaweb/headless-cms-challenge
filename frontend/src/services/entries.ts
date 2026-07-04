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
