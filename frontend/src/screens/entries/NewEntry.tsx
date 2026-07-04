import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getContentType } from '../../services/contentTypes'
import { createEntry } from '../../services/entries'
import type { ContentType, FieldType } from '../../types/contentType'
import type { EntryData } from '../../types/entry'

interface FieldError { [fieldName: string]: string }

export default function NewEntry() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [ct, setCt] = useState<ContentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<EntryData>({})
  const [errors, setErrors] = useState<FieldError>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slug) return
    getContentType(slug)
      .then(ct => {
        setCt(ct)
        const initial: EntryData = {}
        ct.fields.forEach(f => {
          if (f.type === 'boolean') initial[f.name] = false
        })
        setData(initial)
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [slug, navigate])

  function handleChange(name: string, value: EntryData[string]) {
    setData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[name]; return next })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ct) return

    const newErrors: FieldError = {}
    ct.fields.forEach(f => {
      if (f.required && f.type !== 'boolean' && f.type !== 'reference') {
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
      await createEntry(slug!, data)
      navigate(`/${slug}/entries`)
    } catch {
      setApiError('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null
  if (!ct) return null

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-500">CMS admin</span>
        <nav className="text-xs text-gray-400">
          <Link to="/" className="text-indigo-600 hover:underline">Content types</Link>
          <span className="mx-1.5">›</span>
          <Link to={`/${slug}/entries`} className="text-indigo-600 hover:underline">{ct.name}</Link>
          <span className="mx-1.5">›</span>
          <span>New entry</span>
        </nav>
      </div>
      <h1 className="text-xl font-medium text-gray-900 mb-6">New {ct.name} entry</h1>

      <form aria-label="New entry" onSubmit={handleSubmit} noValidate>
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 max-w-xl space-y-4">
          {ct.fields.map(f => (
            <FieldInput
              key={f.id}
              name={f.name}
              type={f.type}
              required={f.required}
              value={data[f.name]}
              error={errors[f.name]}
              onChange={val => handleChange(f.name, val)}
            />
          ))}
        </div>

        {apiError && <p className="text-sm text-red-600 mb-3 max-w-xl">{apiError}</p>}

        <div className="flex gap-2 max-w-xl">
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-md transition-colors"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/${slug}/entries`)}
            className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

interface FieldInputProps {
  name: string
  type: FieldType
  required: boolean
  value: EntryData[string]
  error?: string
  onChange: (val: EntryData[string]) => void
}

function FieldInput({ name, type, required, value, error, onChange }: FieldInputProps) {
  const labelId = `field-${name}`
  const baseInput = `w-full border rounded-md px-3 py-2 text-sm ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`

  return (
    <div>
      <label htmlFor={labelId} className="block text-sm font-medium text-gray-600 mb-1.5">
        {name}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {type === 'text' && (
        <input
          id={labelId}
          type="text"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
        />
      )}
      {type === 'number' && (
        <input
          id={labelId}
          type="number"
          value={(value as number) ?? ''}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className={baseInput}
        />
      )}
      {type === 'boolean' && (
        <input
          id={labelId}
          type="checkbox"
          checked={Boolean(value)}
          onChange={e => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
        />
      )}
      {type === 'date' && (
        <input
          id={labelId}
          type="date"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
        />
      )}
      {type === 'reference' && (
        <div className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-400 bg-gray-50">
          Reference coming soon
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
