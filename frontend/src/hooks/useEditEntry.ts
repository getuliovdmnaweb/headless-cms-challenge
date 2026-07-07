import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getContentType } from '../services/contentTypes'
import { getEntry, updateEntry, getEntries } from '../services/entries'
import type { ContentType } from '../types/contentType'
import type { EntryData, EntryListResponse } from '../types/entry'

export function useEditEntry(slug: string | undefined, id: string | undefined) {
  const navigate = useNavigate()
  const [ct, setCt] = useState<ContentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<EntryData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [refEntries, setRefEntries] = useState<Record<string, EntryListResponse>>({})

  useEffect(() => {
    if (!slug || !id) return
    Promise.all([getContentType(slug), getEntry(slug, Number(id))])
      .then(([contentType, entry]) => {
        setCt(contentType)
        setData(entry.data)
        const refFields = contentType.fields.filter(f => f.type === 'reference' && f.options?.targetSlug)
        Promise.all(
          refFields.map(f =>
            getEntries(f.options!.targetSlug!)
              .then(result => ({ slug: f.options!.targetSlug!, result }))
              .catch(() => null)
          )
        ).then(results => {
          const map: Record<string, EntryListResponse> = {}
          results.forEach(r => { if (r) map[r.slug] = r.result })
          setRefEntries(map)
        })
      })
      .catch((err: Error) => {
        if (err.message.includes('Entry not found')) {
          navigate(`/${slug}/entries`, { state: { error: 'Entry not found.' } })
        } else {
          navigate('/', { state: { error: 'Content type not found.' } })
        }
      })
      .finally(() => setLoading(false))
  }, [slug, id, navigate])

  function handleChange(name: string, value: EntryData[string]) {
    setData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[name]; return next })
  }

  async function submit() {
    if (!ct) return

    const newErrors: Record<string, string> = {}
    ct.fields.forEach(f => {
      if (f.required && f.type !== 'boolean') {
        const val = data[f.name]
        if (val === undefined || val === null || val === '') {
          newErrors[f.name] = `${f.name} is required`
        }
      }
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    setApiError(null)
    try {
      await updateEntry(slug!, Number(id), data)
      navigate(`/${slug}/entries`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'Entry not found') {
        navigate(`/${slug}/entries`, { state: { error: 'Entry not found.' } })
      } else {
        setApiError('Something went wrong')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return { ct, loading, data, errors, apiError, submitting, refEntries, handleChange, submit }
}
