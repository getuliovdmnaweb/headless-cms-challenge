import { useNavigate, useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import { useContentType } from '../../hooks/useContentType'
import { useDeleteEntry, useEntries } from '../../hooks/useEntries'
import type { EntryWithValidity } from '../../types/entry'
import { formatFieldValue } from './EntryListScreen.utils'

export default function EntryListScreen() {
  const { contentTypeId } = useParams<{ contentTypeId: string }>()
  const navigate = useNavigate()

  const { data: contentType } = useContentType(contentTypeId)
  const { data: entries, isLoading } = useEntries(contentTypeId!)
  const deleteMutation = useDeleteEntry(contentTypeId!)

  if (isLoading || !contentType) {
    return <div className="p-6 text-gray-500">Loading…</div>
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium text-gray-900">{contentType.name} entries</h1>
        <Button label="New entry" onClick={() => navigate(`/content-types/${contentTypeId}/entries/new`)} />
      </div>

      {entries && entries.length === 0 ? (
        <p className="text-gray-500">No entries yet.</p>
      ) : (
        <Table<EntryWithValidity>
          rows={entries ?? []}
          rowKey={(row) => row.id}
          columns={[
            ...contentType.fields.map((field) => ({
              key: field.name,
              header: field.name,
              render: (entry: EntryWithValidity) => formatFieldValue(entry.data[field.name], field.type),
            })),
            {
              key: 'status',
              header: 'Status',
              render: (entry: EntryWithValidity) =>
                entry.isValid ? (
                  <Badge label="Valid" variant="success" />
                ) : (
                  <Badge label="Needs attention" variant="danger" />
                ),
            },
            {
              key: 'actions',
              header: '',
              render: (entry: EntryWithValidity) => (
                <div className="flex gap-2">
                  <Button
                    label="Edit"
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/content-types/${contentTypeId}/entries/${entry.id}`)}
                  />
                  <Button
                    label="Delete"
                    size="sm"
                    variant="danger"
                    onClick={() => deleteMutation.mutate(entry.id)}
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
