import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getEntry, updateEntry, getEntries } from '../../services/entries'
import { getContentType } from '../../services/contentTypes'
import type { ContentType, FieldType, FieldOptions } from '../../types/contentType'
import type { EntryData, EntryListResponse } from '../../types/entry'

interface FieldError { [fieldName: string]: string }

export default function EditEntry() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const navigate = useNavigate()

  const [ct, setCt] = useState<ContentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<EntryData>({})
  const [errors, setErrors] = useState<FieldError>({})
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ct) return

    const newErrors: FieldError = {}
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
          <span>Edit entry</span>
        </nav>
      </div>
      <h1 className="text-xl font-medium text-gray-900 mb-6">Edit {ct.name} entry</h1>

      <form aria-label="Edit entry" onSubmit={handleSubmit} noValidate>
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
              options={f.options}
              refData={f.options?.targetSlug ? refEntries[f.options.targetSlug] : undefined}
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
  options?: FieldOptions
  refData?: EntryListResponse
}

function FieldInput({ name, type, required, value, error, onChange, refData }: FieldInputProps) {
  const labelId = `field-${name}`
  const baseInput = `w-full border rounded-md px-3 py-2 text-sm ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`

  function renderReference() {
    if (!refData) return null
    const { entries, contentType: targetCt } = refData
    const textField = targetCt.fields.find(f => f.type === 'text')
    const getLabel = (e: { id: number; data: EntryData }) =>
      textField ? String(e.data[textField.name] ?? `Entry #${e.id}`) : `Entry #${e.id}`
    const currentId = value !== undefined && value !== null && value !== '' ? Number(value) : null
    const dangles = currentId !== null && !entries.some(e => e.id === currentId)
    if (dangles || (entries.length === 0 && currentId !== null)) {
      return <p className="text-sm text-red-600">Entry no longer exists</p>
    }
    if (entries.length === 0) {
      return <p className="text-sm text-gray-500">No {targetCt.name} entries yet</p>
    }
    return (
      <select
        id={labelId}
        value={currentId !== null ? String(currentId) : ''}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={baseInput}
      >
        <option value="">— select —</option>
        {entries.map(e => (
          <option key={e.id} value={String(e.id)}>{getLabel(e)}</option>
        ))}
      </select>
    )
  }

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
      {type === 'reference' && renderReference()}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
