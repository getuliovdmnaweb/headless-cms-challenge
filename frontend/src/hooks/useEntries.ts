import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createEntry, deleteEntry, getEntries } from '../services/entries'

export function useEntries(contentTypeId: string) {
  return useQuery({ queryKey: ['entries', contentTypeId], queryFn: () => getEntries(contentTypeId) })
}

export function useCreateEntry(contentTypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createEntry(contentTypeId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entries', contentTypeId] }),
  })
}

export function useDeleteEntry(contentTypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEntry(contentTypeId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entries', contentTypeId] }),
  })
}
