import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { useNewContentType } from '../../hooks/useNewContentType'
import type { FieldRow } from '../../hooks/useNewContentType'
import type { FieldType, ContentTypeSummary } from '../../types/contentType'

interface FieldRowProps {
  field: FieldRow
  allTypes: ContentTypeSummary[]
  onChange: (key: number, patch: Partial<FieldRow>) => void
  onRemove: (key: number) => void
}

function FieldRowItem({ field: f, allTypes, onChange, onRemove }: FieldRowProps) {
  return (
    <div className="flex items-center gap-2 mb-2 p-2 border border-gray-200 rounded-md bg-white">
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
          disabled={allTypes.length === 0}
        >
          <option value="">{allTypes.length === 0 ? 'No types available' : '— pick a type —'}</option>
          {allTypes.map(t => (
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

export default function NewContentType() {
  const navigate = useNavigate()
  const {
    name, setName, slug, nameError, apiError, submitting,
    fields, addField, updateField, removeField, canSubmit, allTypes, submit,
  } = useNewContentType()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit()
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-500">CMS admin</span>
        <nav className="text-xs text-gray-400">
          <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline">Content types</button>
          <span className="mx-1.5">›</span>
          <span>New content type</span>
        </nav>
      </div>
      <h1 className="text-xl font-medium text-gray-900 mb-6">New content type</h1>

      <form aria-label="New content type" onSubmit={handleSubmit} noValidate>
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <div className="mb-4">
            <FormField label="Name" htmlFor="ct-name" error={nameError ?? apiError ?? undefined}>
              <Input
                id="ct-name"
                placeholder="e.g. Blog post"
                value={name}
                onChange={e => setName(e.target.value)}
                error={!!(nameError ?? apiError)}
              />
            </FormField>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Slug <span className="text-xs font-normal text-gray-400">auto-derived</span>
            </label>
            <Input value={slug} readOnly disabled />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-medium text-gray-900 mb-4">Fields</p>

          {fields.map(f => (
            <FieldRowItem
              key={f._key}
              field={f}
              allTypes={allTypes}
              onChange={updateField}
              onRemove={removeField}
            />
          ))}

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
            {submitting ? 'Saving…' : 'Create content type'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
