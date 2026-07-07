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
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import ReviewModal from './ReviewModal'
import { useEditContentType } from '../../hooks/useEditContentType'
import type { FieldRow } from '../../hooks/useEditContentType'
import type { FieldType, ContentTypeSummary } from '../../types/contentType'

interface SortableFieldRowProps {
  field: FieldRow
  currentSlug: string
  allTypes: ContentTypeSummary[]
  isRisky: boolean
  onChange: (key: number, patch: Partial<FieldRow>) => void
  onRemove: (key: number) => void
}

function SortableFieldRow({ field: f, currentSlug, allTypes, isRisky, onChange, onRemove }: SortableFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: f._key })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const targetTypes = allTypes.filter(t => t.slug !== currentSlug)
  const borderClass = isRisky ? 'border-amber-400 bg-amber-50' : f.error ? 'border-red-200 bg-white' : 'border-gray-200 bg-white'

  return (
    <div ref={setNodeRef} style={style} data-risky={isRisky ? 'true' : undefined} className={`flex items-center gap-2 mb-2 p-2 border rounded-md ${borderClass}`}>
      <span
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing px-1 select-none"
        aria-label="Drag to reorder"
      >
        ⠿
      </span>
      <Input
        placeholder="Field name"
        value={f.name}
        onChange={e => onChange(f._key, { name: e.target.value })}
        error={!!f.error}
        className="flex-1"
        aria-label="Field name"
      />
      {f.error && <span className="text-xs text-red-600 whitespace-nowrap">{f.error}</span>}
      <Select
        value={f.type}
        onChange={e => onChange(f._key, { type: e.target.value as FieldType, options: {} })}
        className="w-28"
      >
        <option value="text">text</option>
        <option value="number">number</option>
        <option value="boolean">boolean</option>
        <option value="date">date</option>
        <option value="reference">reference</option>
      </Select>
      {f.type === 'reference' && (
        <Select
          aria-label="References"
          value={f.options?.targetSlug ?? ''}
          onChange={e => onChange(f._key, { options: { targetSlug: e.target.value } })}
          className="w-32"
          disabled={targetTypes.length === 0}
        >
          <option value="">{targetTypes.length === 0 ? 'No types available' : '— pick a type —'}</option>
          {targetTypes.map(t => (
            <option key={t.slug} value={t.slug}>{t.name}</option>
          ))}
        </Select>
      )}
      <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
        <input type="checkbox" checked={f.required} onChange={e => onChange(f._key, { required: e.target.checked })} />
        Required
      </label>
      <Button
        variant="ghost"
        className="text-gray-400 hover:text-red-500 px-1 hover:no-underline"
        aria-label="Delete field"
        onClick={() => onRemove(f._key)}
      >
        ✕
      </Button>
    </div>
  )
}

export default function EditContentType() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const sensors = useSensors(useSensor(PointerSensor))

  const {
    name, setName, nameError, apiError, submitting,
    fields, addField, updateField, removeField, reorderFields,
    isFieldRisky, canSubmit, allTypes, loading,
    reviewModal, setReviewModal, confirmModal, submit,
  } = useEditContentType(slug)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = fields.findIndex(f => f._key === active.id)
    const newIndex = fields.findIndex(f => f._key === over.id)
    reorderFields(oldIndex, newIndex)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit()
  }

  if (loading) return null

  return (
    <>
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
              <FormField label="Name" htmlFor="ct-name" error={nameError ?? apiError ?? undefined}>
                <Input
                  id="ct-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  error={!!(nameError ?? apiError)}
                />
              </FormField>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Slug</label>
              <Input value={slug} readOnly />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-medium text-gray-900 mb-4">Fields</p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f._key)} strategy={verticalListSortingStrategy}>
              {fields.map(f => (
                <SortableFieldRow
                  key={f._key}
                  field={f}
                  currentSlug={slug!}
                  allTypes={allTypes}
                  isRisky={isFieldRisky(f)}
                  onChange={updateField}
                  onRemove={removeField}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button variant="dashed" onClick={addField} className="mt-2">
            + Add field
          </Button>

          {!canSubmit && (
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              ⓘ Add at least one field to continue
            </p>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <Button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>

    {reviewModal && (
      <ReviewModal
        impact={reviewModal}
        onConfirm={confirmModal}
        onCancel={() => setReviewModal(null)}
      />
    )}
    </>
  )
}
