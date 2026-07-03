import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createContentType } from '../../services/contentTypes'
import type { FieldInput, FieldType } from '../../types/contentType'

interface FieldRow extends FieldInput {
  _key: number
  error?: string
}

function toSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

let keyCounter = 0

export default function NewContentType() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fields, setFields] = useState<FieldRow[]>([])

  const slug = toSlug(name)

  function addField() {
    setFields(prev => [...prev, { _key: keyCounter++, name: '', type: 'text', required: false, position: prev.length }])
  }

  function updateField(key: number, patch: Partial<FieldRow>) {
    setFields(prev => prev.map(f => f._key === key ? { ...f, ...patch, error: undefined } : f))
  }

  function removeField(key: number) {
    setFields(prev => prev.filter(f => f._key !== key).map((f, i) => ({ ...f, position: i })))
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
        fields: fields.map(({ name, type, required, position }) => ({ name, type, required, position })),
      })
      navigate('/')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = fields.length > 0

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
            <label className="block text-sm font-medium text-gray-600 mb-1.5" htmlFor="ct-name">Name</label>
            <input
              id="ct-name"
              type="text"
              placeholder="e.g. Blog post"
              value={name}
              onChange={e => { setName(e.target.value); setNameError(null) }}
              className={`w-full border rounded-md px-3 py-2 text-sm ${nameError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            />
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            {apiError && <p className="text-xs text-red-600 mt-1">{apiError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Slug <span className="text-xs font-normal text-gray-400">auto-derived</span>
            </label>
            <input
              type="text"
              value={slug}
              readOnly
              disabled
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-medium text-gray-900 mb-4">Fields</p>

          {fields.map(f => (
            <div key={f._key} className="flex items-center gap-2 mb-2 p-2 border border-gray-200 rounded-md bg-white">
              <input
                type="text"
                placeholder="Field name"
                value={f.name}
                onChange={e => updateField(f._key, { name: e.target.value })}
                className={`flex-1 border rounded px-2 py-1.5 text-sm ${f.error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                aria-label="Field name"
              />
              {f.error && <span className="text-xs text-red-600 whitespace-nowrap">{f.error}</span>}
              <select
                value={f.type}
                onChange={e => updateField(f._key, { type: e.target.value as FieldType })}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-28"
              >
                <option value="text">text</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="date">date</option>
                <option value="reference">reference</option>
              </select>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                <input type="checkbox" checked={f.required} onChange={e => updateField(f._key, { required: e.target.checked })} />
                Required
              </label>
              <button type="button" onClick={() => removeField(f._key)} className="text-gray-400 hover:text-red-500 px-1">✕</button>
            </div>
          ))}

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
            {submitting ? 'Saving…' : 'Create content type'}
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
