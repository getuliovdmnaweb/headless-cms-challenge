import { useQueries } from '@tanstack/react-query'
import { getEntries } from '../services/entries'
import type { EntryWithValidity } from '../types/entry'

function labelForEntry(entry: EntryWithValidity): string {
  const firstValue = Object.values(entry.data)[0]
  return firstValue !== undefined && firstValue !== null && firstValue !== '' ? String(firstValue) : entry.id
}

export function useReferenceOptions(contentTypeIds: string[]) {
  const results = useQueries({
    queries: contentTypeIds.map((id) => ({ queryKey: ['entries', id], queryFn: () => getEntries(id) })),
  })

  const optionsByContentTypeId: Record<string, { value: string; label: string }[]> = {}
  contentTypeIds.forEach((id, index) => {
    optionsByContentTypeId[id] = (results[index].data ?? []).map((entry) => ({
      value: entry.id,
      label: labelForEntry(entry),
    }))
  })

  return optionsByContentTypeId
}
