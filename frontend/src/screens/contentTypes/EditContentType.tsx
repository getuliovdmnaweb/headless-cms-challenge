import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getContentType, updateContentType, listContentTypes } from '../../services/contentTypes'
import type { FieldInput, FieldType, ContentTypeSummary } from '../../types/contentType'

interface FieldRow extends FieldInput {
  _key: number
  error?: string
}

let keyCounter = 0

interface SortableFieldRowProps {
  field: FieldRow
  currentSlug: string
  allTypes: ContentTypeSummary[]
  onChange: (key: number, patch: Partial<FieldRow>) => void
  onRemove: (key: number) => void
}

function SortableFieldRow({ field: f, currentSlug, allTypes, onChange, onRemove }: SortableFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: f._key })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const targetTypes = allTypes.filter(t => t.slug !== currentSlug)

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 mb-2 p-2 border border-gray-200 rounded-md bg-white">
      <span
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing px-1 select-none"
        aria-label="Drag to reorder"
      >
        ⠿
      </span>
      <input
        type="text"
        placeholder="Field name"
        value={f.name}
        onChange={e => onChange(f._key, { name: e.target.value })}
        className={`flex-1 border rounded px-2 py-1.5 text-sm ${f.error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
        aria-label="Field name"
      />
      {f.error && <span className="text-xs text-red-600 whitespace-nowrap">{f.error}</span>}
      <select
        value={f.type}
        onChange={e => onChange(f._key, { type: e.target.value as FieldType, options: {} })}
        className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28"
      >
        <option value="text">text</option>
        <option value="number">number</option>
        <option value="boolean">boolean</option>
        <option value="date">date</option>
        <option value="reference">reference</option>
      </select>
      {f.type === 'reference' && (
        <select
          aria-label="References"
          value={f.options?.targetSlug ?? ''}
          onChange={e => onChange(f._key, { options: { targetSlug: e.target.value } })}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32"
          disabled={targetTypes.length === 0}
        >
          <option value="">{targetTypes.length === 0 ? 'No types available' : '— pick a type —'}</option>
          {targetTypes.map(t => (
            <option key={t.slug} value={t.slug}>{t.name}</option>
          ))}
        </select>
      )}
      <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
        <input type="checkbox" checked={f.required} onChange={e => onChange(f._key, { required: e.target.checked })} />
        Required
      </label>
      <button
        type="button"
        aria-label="Delete field"
        onClick={() => onRemove(f._key)}
        className="text-gray-400 hover:text-red-500 px-1"
      >
        ✕
      </button>
    </div>
  )
}

export default function EditContentType() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fields, setFields] = useState<FieldRow[]>([])
  const [loading, setLoading] = useState(true)
  const [allTypes, setAllTypes] = useState<ContentTypeSummary[]>([])

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    if (!slug) return
    Promise.all([getContentType(slug), listContentTypes()])
      .then(([ct, types]) => {
        setName(ct.name)
        setFields(ct.fields.map(f => ({ ...f, _key: keyCounter++ })))
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setFields(prev => {
      const oldIndex = prev.findIndex(f => f._key === active.id)
      const newIndex = prev.findIndex(f => f._key === over.id)
      return arrayMove(prev, oldIndex, newIndex).map((f, i) => ({ ...f, position: i }))
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

    setSubmitting(true)
    setApiError(null)
    try {
      await updateContentType(slug!, {
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

  const canSubmit = fields.length > 0

  if (loading) return null

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-500">CMS admin</span>
        <nav className="text-xs text-gray-400">
          <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline">Content types</button>
          <span className="mx-1.5">›</span>
          <span>{name}</span>
          <span className="mx-1.5">›</span>
          <span>Edit fields</span>
        </nav>
      </div>
      <h1 className="text-xl font-medium text-gray-900 mb-6">Edit content type — {name}</h1>

      <form aria-label="Edit content type" onSubmit={handleSubmit} noValidate>
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1.5" htmlFor="ct-name">Name</label>
              <input
                id="ct-name"
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setNameError(null) }}
                className={`w-full border rounded-md px-3 py-2 text-sm ${nameError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              />
              {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
              {apiError && <p className="text-xs text-red-600 mt-1">{apiError}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Slug</label>
              <input
                type="text"
                value={slug}
                readOnly
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-medium text-gray-900 mb-4">Fields</p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f._key)} strategy={verticalListSortingStrategy}>
              {fields.map(f => (
                <SortableFieldRow key={f._key} field={f} currentSlug={slug!} allTypes={allTypes} onChange={updateField} onRemove={removeField} />
              ))}
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={addField}
            className="w-full mt-2 border border-dashed border-indigo-300 rounded-md py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            + Add field
          </button>

          {!canSubmit && (
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              ⓘ Add at least one field to continue
            </p>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-md transition-colors"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
