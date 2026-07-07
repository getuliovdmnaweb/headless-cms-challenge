import { Link, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ErrorBanner from '../../components/shared/ErrorBanner'
import { useEntryList } from '../../hooks/useEntryList'

export default function EntryList() {
  const { slug } = useParams<{ slug: string }>()
  const { data, loading, fetchError, bannerError, handleDelete } = useEntryList(slug)

  if (loading) return <p className="p-8 text-sm text-gray-400">Loading…</p>
  if (fetchError) return <p className="p-8 text-sm text-red-500">{fetchError}</p>
  if (!data) return null

  const { contentType, entries } = data

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-500">CMS admin</span>
        <nav className="text-xs text-gray-400">
          <Link to="/" className="text-indigo-600 hover:underline">Content types</Link>
          <span className="mx-1.5">›</span>
          <span>{contentType.name}</span>
        </nav>
      </div>

      <ErrorBanner message={bannerError} />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-medium text-gray-900">{contentType.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/edit/${slug}`}
            className="border border-gray-300 text-gray-700 text-sm px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            Edit fields
          </Link>
          <Link
            to={`/${slug}/entries/new`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors"
          >
            + New entry
          </Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">
          No entries yet — create your first one.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {contentType.fields.map(f => (
                  <th key={f.id} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                    {f.name}
                  </th>
                ))}
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`hover:bg-gray-50 ${!entry.isValid ? 'bg-red-50' : ''} ${i < entries.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  {contentType.fields.map(f => {
                    const val = entry.data[f.name]
                    const missing = val === undefined || val === null || val === ''
                    return (
                      <td key={f.id} className="px-4 py-3 text-sm">
                        {missing
                          ? <span className="text-gray-400 italic">— missing</span>
                          : <span className="text-gray-900">{String(val)}</span>
                        }
                      </td>
                    )
                  })}
                  <td className="px-4 py-3">
                    {entry.isValid
                      ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Valid</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Invalid</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link
                      to={`/${slug}/entries/${entry.id}/edit`}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <Button variant="danger" aria-label="Delete" onClick={() => handleDelete(entry.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
