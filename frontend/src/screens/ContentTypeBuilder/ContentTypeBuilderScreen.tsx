import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import ContentTypeChangePreview from '../../components/shared/ContentTypeChangePreview'
import { ApiError } from '../../services/apiClient'
import {
  useCommitContentTypeChange,
  useContentType,
  usePreviewContentTypeChange,
} from '../../hooks/useContentType'
import { useContentTypes, useCreateContentType } from '../../hooks/useContentTypes'
import type { FieldDefinition } from '../../types/contentType'
import type { ChangePreview } from '../../types/evolution'
import { createEmptyField, slugify } from './ContentTypeBuilderScreen.utils'
import FieldRow from './FieldRow'

interface Conflict {
  message: string
  currentVersion: number
  currentFields: FieldDefinition[]
}

export default function ContentTypeBuilderScreen() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing, refetch: refetchExisting } = useContentType(id)
  const { data: allContentTypes } = useContentTypes()
  const createMutation = useCreateContentType()
  const previewMutation = usePreviewContentTypeChange(id ?? '')
  const commitMutation = useCommitContentTypeChange(id ?? '')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})
  const [pendingPreview, setPendingPreview] = useState<ChangePreview | null>(null)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [loadedVersion, setLoadedVersion] = useState<number | undefined>()
  // Only sync form state from `existing` once. After that, this screen owns the fields —
  // background refetches (e.g. real-time invalidation from someone else's edit) must not
  // silently overwrite an in-progress edit or move the conflict-detection baseline out from
  // under the user. "Reload latest version" explicitly opts back into a fresh sync.
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    if (existing && !hasSyncedRef.current) {
      hasSyncedRef.current = true
      setName(existing.name)
      setSlug(existing.slug)
      setFields(existing.fields)
      setSlugTouched(true)
      setLoadedVersion(existing.version)
    }
  }, [existing])

  const contentTypeOptions = (allContentTypes ?? []).map((ct) => ({ value: ct.id, label: ct.name }))

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) {
      setSlug(slugify(value))
    }
  }

  function updateField(index: number, field: FieldDefinition) {
    setFields(fields.map((f, i) => (i === index ? field : f)))
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index))
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[index], next[target]] = [next[target], next[index]]
    setFields(next)
  }

  async function commitAndNavigate(baseVersion: number, backfills: Record<string, unknown>) {
    try {
      await commitMutation.mutateAsync({ baseVersion, fields, backfills })
      setPendingPreview(null)
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.currentVersion !== undefined) {
        setPendingPreview(null)
        setConflict({
          message: err.message,
          currentVersion: err.currentVersion,
          currentFields: (err.currentFields as FieldDefinition[] | undefined) ?? [],
        })
        return
      }
      throw err
    }
  }

  async function handleReloadLatest() {
    setConflict(null)
    const result = await refetchExisting()
    // Read straight from the refetch result rather than relying on the sync effect: if a
    // background refetch (e.g. realtime invalidation) already wrote this exact data into the
    // cache before this reload ran, TanStack Query's structural sharing keeps the same `data`
    // reference, so an effect keyed on `[existing]` would never re-fire.
    if (result.data) {
      hasSyncedRef.current = true
      setName(result.data.name)
      setSlug(result.data.slug)
      setFields(result.data.fields)
      setSlugTouched(true)
      setLoadedVersion(result.data.version)
    }
  }

  async function handleSubmit() {
    setErrors({})
    try {
      if (isEdit) {
        const preview = await previewMutation.mutateAsync(fields)

        if (loadedVersion !== undefined && preview.baseVersion !== loadedVersion) {
          setConflict({
            message: 'This content type changed since you started editing — review the latest version and try again.',
            currentVersion: preview.baseVersion,
            currentFields: preview.currentFields,
          })
          return
        }

        if (preview.risky) {
          setPendingPreview(preview)
          return
        }
        await commitAndNavigate(preview.baseVersion, {})
      } else {
        await createMutation.mutateAsync({ name, slug, fields })
        navigate('/')
      }
    } catch (err) {
      if (err instanceof ApiError && err.field) {
        setErrors({ [err.field]: err.message })
      }
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-medium text-gray-900 mb-4">{isEdit ? 'Edit content type' : 'New content type'}</h1>

      {conflict && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">{conflict.message}</p>
          <Button label="Reload latest version" size="sm" className="mt-2" onClick={handleReloadLatest} />
        </div>
      )}

      <div className="flex gap-4 mb-1">
        <div className="flex-1">
          <Input value={name} onChange={handleNameChange} placeholder="Name" />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
        </div>
        <div className="flex-1">
          <Input
            value={slug}
            onChange={(value) => {
              setSlug(value)
              setSlugTouched(true)
            }}
            placeholder="Slug"
          />
          {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug}</p>}
        </div>
      </div>

      <p className="text-sm text-gray-500 mt-4 mb-2">Fields</p>
      {fields.map((field, index) => (
        <FieldRow
          key={field.id}
          field={field}
          contentTypeOptions={contentTypeOptions}
          onChange={(updated) => updateField(index, updated)}
          onRemove={() => removeField(index)}
          onMoveUp={() => moveField(index, -1)}
          onMoveDown={() => moveField(index, 1)}
          canMoveUp={index > 0}
          canMoveDown={index < fields.length - 1}
        />
      ))}

      <div className="mt-3 flex gap-2">
        <Button label="Add field" variant="secondary" onClick={() => setFields([...fields, createEmptyField()])} />
      </div>

      <div className="mt-6 flex gap-2">
        <Button label={isEdit ? 'Save changes' : 'Create content type'} onClick={handleSubmit} />
        <Button label="Cancel" variant="secondary" onClick={() => navigate('/')} />
      </div>

      {pendingPreview && (
        <ContentTypeChangePreview
          impacts={pendingPreview.impacts}
          onCommit={(backfills) => commitAndNavigate(pendingPreview.baseVersion, backfills)}
          onCancel={() => setPendingPreview(null)}
        />
      )}
    </div>
  )
}
