import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createContentType, listContentTypes } from '../services/contentTypes'
import type { FieldInput, FieldType, ContentTypeSummary } from '../types/contentType'

export interface FieldRow extends FieldInput {
  _key: number
  error?: string
}

let keyCounter = 0

function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function useNewContentType() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fields, setFields] = useState<FieldRow[]>([])
  const [allTypes, setAllTypes] = useState<ContentTypeSummary[]>([])

  const slug = toSlug(name)

  useEffect(() => {
    listContentTypes().then(setAllTypes).catch(() => {})
  }, [])

  function addField() {
    setFields(prev => [...prev, { _key: keyCounter++, name: '', type: 'text', required: false, position: prev.length }])
  }

  function updateField(key: number, patch: Partial<FieldRow>) {
    setFields(prev => prev.map(f => f._key === key ? { ...f, ...patch, error: undefined } : f))
  }

  function removeField(key: number) {
    setFields(prev => prev.filter(f => f._key !== key).map((f, i) => ({ ...f, position: i })))
  }

  async function submit() {
    let valid = true

    if (!name.trim()) {
      setNameError('Name is required')
      valid = false
    } else {
      setNameError(null)
    }

    const updatedFields = fields.map(f => ({
      ...f,
      error: !f.name.trim() ? 'Field name is required' : undefined,
    }))
    if (updatedFields.some(f => f.error)) {
      setFields(updatedFields)
      valid = false
    }

    if (!valid) return

    setSubmitting(true)
    setApiError(null)
    try {
      await createContentType({
        name: name.trim(),
        fields: fields.map(({ name, type, required, position, options }) => ({ name, type, required, position, options })),
      })
      navigate('/')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    name,
    setName: (v: string) => { setName(v); setNameError(null) },
    slug,
    nameError,
    apiError,
    submitting,
    fields,
    addField,
    updateField,
    removeField,
    canSubmit: fields.length > 0,
    allTypes,
    submit,
  }
}
