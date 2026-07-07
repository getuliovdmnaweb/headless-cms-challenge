import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { arrayMove } from '@dnd-kit/sortable'
import {
  getContentType,
  listContentTypes,
  previewChanges,
  commitChanges,
} from '../services/contentTypes'
import type { ImpactPreview } from '../services/contentTypes'
import type { FieldInput, FieldType, ContentTypeSummary } from '../types/contentType'

export interface FieldRow extends FieldInput {
  _key: number
  error?: string
}

interface OriginalField {
  type: string
  required: boolean
}

let keyCounter = 0

export function useEditContentType(slug: string | undefined) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fields, setFields] = useState<FieldRow[]>([])
  const [loading, setLoading] = useState(true)
  const [allTypes, setAllTypes] = useState<ContentTypeSummary[]>([])
  const [originalFields, setOriginalFields] = useState<Map<string, OriginalField>>(new Map())
  const [version, setVersion] = useState(1)
  const [reviewModal, setReviewModal] = useState<ImpactPreview | null>(null)

  useEffect(() => {
    if (!slug) return
    Promise.all([getContentType(slug), listContentTypes()])
      .then(([ct, types]) => {
        setName(ct.name)
        setVersion(ct.version)
        setFields(ct.fields.map(f => ({ ...f, _key: keyCounter++ })))
        setOriginalFields(new Map(ct.fields.map(f => [f.name, { type: f.type, required: f.required }])))
        setAllTypes(types)
      })
      .catch(() => navigate('/', { state: { error: 'Content type not found.' } }))
      .finally(() => setLoading(false))
  }, [slug, navigate])

  function addField() {
    setFields(prev => [...prev, { _key: keyCounter++, name: '', type: 'text', required: false, position: prev.length }])
  }

  function updateField(key: number, patch: Partial<FieldRow>) {
    setFields(prev => prev.map(f => f._key === key ? { ...f, ...patch, error: undefined } : f))
  }

  function removeField(key: number) {
    setFields(prev => prev.filter(f => f._key !== key).map((f, i) => ({ ...f, position: i })))
  }

  function reorderFields(oldIndex: number, newIndex: number) {
    setFields(prev => arrayMove(prev, oldIndex, newIndex).map((f, i) => ({ ...f, position: i })))
  }

  function isFieldRisky(row: FieldRow): boolean {
    const orig = originalFields.get(row.name)
    if (orig) {
      if (orig.type !== row.type) return true
      if (!orig.required && row.required) return true
      return false
    }
    return row.required
  }

  async function submit() {
    let valid = true

    if (!name.trim()) {
      setNameError('Name is required')
      valid = false
    } else {
      setNameError(null)
    }

    const names = fields.map(f => f.name.trim())
    const updatedFields = fields.map(f => {
      if (!f.name.trim()) return { ...f, error: 'Field name is required' }
      if (names.filter(n => n === f.name.trim()).length > 1) return { ...f, error: 'Field names must be unique' }
      return { ...f, error: undefined }
    })
    if (updatedFields.some(f => f.error)) {
      setFields(updatedFields)
      valid = false
    }

    if (!valid) return

    const normalizedFields = fields.map(({ name, type, required, position, options }) => ({ name, type, required, position, options }))

    setSubmitting(true)
    setApiError(null)
    try {
      const impact = await previewChanges(slug!, normalizedFields)
      if (impact.changes.length === 0) {
        await commitChanges(slug!, normalizedFields, version, {})
        navigate('/')
      } else {
        setReviewModal(impact)
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmModal(fallback: Record<string, unknown>) {
    const normalizedFields = fields.map(({ name, type, required, position, options }) => ({ name, type, required, position, options }))
    setSubmitting(true)
    setApiError(null)
    try {
      await commitChanges(slug!, normalizedFields, version, fallback)
      navigate('/')
    } catch (err) {
      setReviewModal(null)
      setApiError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    name,
    setName: (v: string) => { setName(v); setNameError(null) },
    nameError,
    apiError,
    submitting,
    fields,
    addField,
    updateField,
    removeField,
    reorderFields,
    isFieldRisky,
    canSubmit: fields.length > 0,
    allTypes,
    loading,
    version,
    reviewModal,
    setReviewModal,
    confirmModal,
    submit,
  }
}
