import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getContentType, updateContentTypeFields } from '../services/contentTypes'
import type { FieldDefinition } from '../types/contentType'

export function useContentType(id: string | undefined) {
  return useQuery({
    queryKey: ['contentTypes', id],
    queryFn: () => getContentType(id!),
    enabled: !!id,
  })
}

export function useUpdateContentTypeFields(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: FieldDefinition[]) => updateContentTypeFields(id, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentTypes', id] })
      queryClient.invalidateQueries({ queryKey: ['contentTypes'] })
    },
  })
}
