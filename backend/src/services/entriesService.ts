import * as ContentTypesRepository from '../repositories/contentTypesRepository'
import * as EntriesRepository from '../repositories/entriesRepository'
import type { EntryData, EntrySummary, EntryListResponse } from '../types/entries'

function computeIsValid(
  data: EntryData,
  fields: Array<{ name: string; type: string; required: boolean }>,
): boolean {
  return fields
    .filter(f => f.required && f.type !== 'boolean' && f.type !== 'reference')
    .every(f => {
      const val = data[f.name]
      return val !== undefined && val !== null && val !== ''
    })
}

export async function listEntries(slug: string): Promise<EntryListResponse> {
  const ct = await ContentTypesRepository.findBySlugWithFields(slug)
  if (!ct) throw new Error('Content type not found')

  const entries = await EntriesRepository.listByContentTypeId(ct.id)

  return {
    contentType: {
      id: ct.id,
      name: ct.name,
      slug: ct.slug,
      version: ct.version,
      fields: ct.fields.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        required: f.required,
        position: f.position,
      })),
    },
    entries: entries.map(e => ({
      id: e.id,
      data: e.data as EntryData,
      isValid: computeIsValid(e.data as EntryData, ct.fields),
    })),
  }
}

export async function createEntry(slug: string, data: EntryData): Promise<EntrySummary> {
  const ct = await ContentTypesRepository.findBySlugWithFields(slug)
  if (!ct) throw new Error('Content type not found')

  const entry = await EntriesRepository.createEntry(ct.id, data)
  return {
    id: entry.id,
    data: entry.data as EntryData,
    isValid: computeIsValid(entry.data as EntryData, ct.fields),
  }
}
