import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FieldInput from '../../components/shared/FieldInput'
import { useNewEntry } from '../../hooks/useNewEntry'

export default function NewEntry() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { ct, loading, data, errors, apiError, submitting, refEntries, handleChange, submit } = useNewEntry(slug)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit()
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
              options={f.options}
              refData={f.options?.targetSlug ? refEntries[f.options.targetSlug] : undefined}
            />
          ))}
        </div>

        {apiError && <p className="text-sm text-red-600 mb-3 max-w-xl">{apiError}</p>}

        <div className="flex gap-2 max-w-xl">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/${slug}/entries`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
