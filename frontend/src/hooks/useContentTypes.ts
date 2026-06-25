import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContentType, deleteContentType, getContentTypes } from '../services/contentTypes'
import type { FieldDefinition } from '../types/contentType'

export function useContentTypes() {
  return useQuery({ queryKey: ['contentTypes'], queryFn: getContentTypes })
}

export function useCreateContentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; slug?: string; fields: FieldDefinition[] }) => createContentType(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contentTypes'] }),
  })
}

export function useDeleteContentType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteContentType(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contentTypes'] }),
  })
}
