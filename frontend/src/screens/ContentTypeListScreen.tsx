import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import { useContentTypes } from '../hooks/useContentTypes'
import type { ContentTypeSummary } from '../types/contentType'

export default function ContentTypeListScreen() {
  const { data, isLoading } = useContentTypes()
  const navigate = useNavigate()

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading…</div>
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium text-gray-900">Content types</h1>
        <Button label="New content type" onClick={() => navigate('/content-types/new')} />
      </div>

      {data && data.length === 0 ? (
        <p className="text-gray-500">No content types yet.</p>
      ) : (
        <Table<ContentTypeSummary>
          rows={data ?? []}
          rowKey={(row) => row.id}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'slug', header: 'Slug' },
            { key: 'fieldCount', header: 'Fields' },
            { key: 'entryCount', header: 'Entries' },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex gap-2">
                  <Button
                    label="View entries"
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/content-types/${row.id}/entries`)}
                  />
                  <Button
                    label="Edit fields"
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/content-types/${row.id}/edit`)}
                  />
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
