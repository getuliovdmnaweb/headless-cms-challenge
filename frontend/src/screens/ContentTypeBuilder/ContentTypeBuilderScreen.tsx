import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { ApiError } from '../../services/apiClient'
import { useContentType, useUpdateContentTypeFields } from '../../hooks/useContentType'
import { useContentTypes, useCreateContentType } from '../../hooks/useContentTypes'
import type { FieldDefinition } from '../../types/contentType'
import { createEmptyField, slugify } from './ContentTypeBuilderScreen.utils'
import FieldRow from './FieldRow'

export default function ContentTypeBuilderScreen() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing } = useContentType(id)
  const { data: allContentTypes } = useContentTypes()
  const createMutation = useCreateContentType()
  const updateMutation = useUpdateContentTypeFields(id ?? '')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({})

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setSlug(existing.slug)
      setFields(existing.fields)
      setSlugTouched(true)
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

  async function handleSubmit() {
    setErrors({})
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(fields)
      } else {
        await createMutation.mutateAsync({ name, slug, fields })
      }
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError && err.field) {
        setErrors({ [err.field]: err.message })
      }
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-medium text-gray-900 mb-4">{isEdit ? 'Edit content type' : 'New content type'}</h1>

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
    </div>
  )
}
