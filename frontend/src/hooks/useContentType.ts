import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commitContentTypeChange, getContentType, previewContentTypeChange, updateContentTypeFields } from '../services/contentTypes'
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

export function usePreviewContentTypeChange(id: string) {
  return useMutation({
    mutationFn: (fields: FieldDefinition[]) => previewContentTypeChange(id, fields),
  })
}

export function useCommitContentTypeChange(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      baseVersion,
      fields,
      backfills,
    }: {
      baseVersion: number
      fields: FieldDefinition[]
      backfills: Record<string, unknown>
    }) => commitContentTypeChange(id, baseVersion, fields, backfills),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentTypes', id] })
      queryClient.invalidateQueries({ queryKey: ['contentTypes'] })
      queryClient.invalidateQueries({ queryKey: ['entries', id] })
    },
  })
}
