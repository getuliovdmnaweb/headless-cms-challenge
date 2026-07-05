import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { deleteContentType, listContentTypes } from '../../services/contentTypes'
import { socket } from '../../services/socket'
import ErrorBanner from '../../components/shared/ErrorBanner'
import type { ContentTypeSummary } from '../../types/contentType'

export default function ContentTypeList() {
  const location = useLocation()
  const locationError = (location.state as { error?: string } | null)?.error ?? ''

  const [types, setTypes] = useState<ContentTypeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTypes = useCallback(() => {
    listContentTypes()
      .then(setTypes)
      .catch(() => setError('Something went wrong'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  useEffect(() => {
    socket.on('content-type:created', fetchTypes)
    socket.on('content-type:updated', fetchTypes)
    socket.on('content-type:deleted', fetchTypes)
    return () => {
      socket.off('content-type:created', fetchTypes)
      socket.off('content-type:updated', fetchTypes)
      socket.off('content-type:deleted', fetchTypes)
    }
  }, [fetchTypes])

  async function handleDelete(slug: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteContentType(slug)
    setTypes(prev => prev.filter(t => t.slug !== slug))
  }

  if (loading) return <p className="p-8 text-sm text-gray-400">Loading…</p>
  if (error) return <p className="p-8 text-sm text-red-500">{error}</p>

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <ErrorBanner message={locationError} />
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-medium text-gray-900">Content types</h1>
        <Link
          to="/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors"
        >
          + New content type
        </Link>
      </div>

      {types.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">
          No content types yet — create your first one.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Fields</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((ct, i) => (
                <tr key={ct.id} className={`hover:bg-gray-50 ${i < types.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{ct.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{ct.fieldCount} {ct.fieldCount === 1 ? 'field' : 'fields'}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link to={`/${ct.slug}/entries`} className="text-sm text-indigo-600 hover:underline">View content</Link>
                    <Link to={`/edit/${ct.slug}`} className="text-sm text-gray-500 hover:underline">Edit fields</Link>
                    <button
                      type="button"
                      aria-label={`Delete ${ct.name}`}
                      onClick={() => handleDelete(ct.slug, ct.name)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Delete
                    </button>
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
