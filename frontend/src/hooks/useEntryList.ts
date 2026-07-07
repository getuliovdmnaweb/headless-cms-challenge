import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getEntries, deleteEntry } from '../services/entries'
import { socket } from '../services/socket'
import type { EntryListResponse } from '../types/entry'

export function useEntryList(slug: string | undefined) {
  const navigate = useNavigate()
  const location = useLocation()
  const locationError = (location.state as { error?: string } | null)?.error ?? ''

  const [data, setData] = useState<EntryListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [bannerError, setBannerError] = useState(locationError)

  const fetchEntries = useCallback(() => {
    if (!slug) return
    getEntries(slug)
      .then(setData)
      .catch((err: Error) => {
        if (err.message.includes('not found')) {
          navigate('/')
        } else {
          setFetchError('Something went wrong')
        }
      })
      .finally(() => setLoading(false))
  }, [slug, navigate])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    const onEntryEvent = (payload: { slug: string }) => {
      if (payload.slug === slug) fetchEntries()
    }
    const onCtDeleted = (payload: { slug: string }) => {
      if (payload.slug === slug) navigate('/', { state: { error: 'Content type was deleted.' } })
    }

    socket.on('entry:created', onEntryEvent)
    socket.on('entry:updated', onEntryEvent)
    socket.on('entry:deleted', onEntryEvent)
    socket.on('content-type:deleted', onCtDeleted)

    return () => {
      socket.off('entry:created', onEntryEvent)
      socket.off('entry:updated', onEntryEvent)
      socket.off('entry:deleted', onEntryEvent)
      socket.off('content-type:deleted', onCtDeleted)
    }
  }, [slug, navigate, fetchEntries])

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    try {
      await deleteEntry(slug!, id)
      setData(prev =>
        prev ? { ...prev, entries: prev.entries.filter(e => e.id !== id) } : prev
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setBannerError(msg.endsWith('.') ? msg : `${msg}.`)
    }
  }

  return { data, loading, fetchError, bannerError, handleDelete }
}
