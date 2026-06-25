import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getEntry, updateEntry } from '../services/entries'

export function useEntry(contentTypeId: string, id: string | undefined) {
  return useQuery({
    queryKey: ['entries', contentTypeId, id],
    queryFn: () => getEntry(contentTypeId, id!),
    enabled: !!id,
  })
}

export function useUpdateEntry(contentTypeId: string, id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => updateEntry(contentTypeId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', contentTypeId, id] })
      queryClient.invalidateQueries({ queryKey: ['entries', contentTypeId] })
    },
  })
}
