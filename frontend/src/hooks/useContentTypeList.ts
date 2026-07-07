import { useCallback, useEffect, useState } from 'react'
import { deleteContentType, listContentTypes } from '../services/contentTypes'
import { socket } from '../services/socket'
import type { ContentTypeSummary } from '../types/contentType'

export function useContentTypeList() {
  const [types, setTypes] = useState<ContentTypeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTypes = useCallback(() => {
    listContentTypes()
      .then(setTypes)
      .catch(() => setError('Something went wrong'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  useEffect(() => {
    socket.on('content-type:created', fetchTypes)
    socket.on('content-type:updated', fetchTypes)
    socket.on('content-type:deleted', fetchTypes)
    return () => {
      socket.off('content-type:created', fetchTypes)
      socket.off('content-type:updated', fetchTypes)
      socket.off('content-type:deleted', fetchTypes)
    }
  }, [fetchTypes])

  async function handleDelete(slug: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteContentType(slug)
    setTypes(prev => prev.filter(t => t.slug !== slug))
  }

  return { types, loading, error, handleDelete }
}
