import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import DynamicField from '../../components/shared/DynamicField'
import { useContentType } from '../../hooks/useContentType'
import { useEntry, useUpdateEntry } from '../../hooks/useEntry'
import { useCreateEntry } from '../../hooks/useEntries'
import { useReferenceOptions } from '../../hooks/useReferenceOptions'
import { ApiError } from '../../services/apiClient'
import { messageForReason } from './EntryEditorScreen.utils'

export default function EntryEditorScreen() {
  const { contentTypeId, entryId } = useParams<{ contentTypeId: string; entryId?: string }>()
  const isEdit = !!entryId
  const navigate = useNavigate()

  const { data: contentType } = useContentType(contentTypeId)
  const { data: existing } = useEntry(contentTypeId!, entryId)
  const createMutation = useCreateEntry(contentTypeId!)
  const updateMutation = useUpdateEntry(contentTypeId!, entryId ?? '')

  const referenceContentTypeIds = useMemo(
    () =>
      Array.from(
        new Set(
          (contentType?.fields ?? [])
            .filter((field) => field.type === 'reference' && field.referenceContentTypeId)
            .map((field) => field.referenceContentTypeId as string)
        )
      ),
    [contentType]
  )
  const referenceOptionsByContentTypeId = useReferenceOptions(referenceContentTypeIds)

  const [data, setData] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (existing) {
      setData(existing.data)
    }
  }, [existing])

  function updateField(name: string, value: unknown) {
    setData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit() {
    setErrors({})
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(data)
      } else {
        await createMutation.mutateAsync(data)
      }
      navigate(`/content-types/${contentTypeId}/entries`)
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors: Record<string, string> = {}
        for (const fieldError of err.errors) {
          fieldErrors[fieldError.field] = messageForReason(fieldError.reason)
        }
        setErrors(fieldErrors)
      }
    }
  }

  if (!contentType) {
    return <div className="p-6 text-gray-500">Loading…</div>
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-lg font-medium text-gray-900 mb-4">
        {isEdit ? `Edit entry — ${contentType.name}` : `New entry — ${contentType.name}`}
      </h1>

      <div className="flex flex-col gap-3">
        {contentType.fields.map((field) => (
          <div key={field.id}>
            {field.type !== 'boolean' && (
              <label className="text-sm text-gray-500 block mb-1">
                {field.name}
                {field.required ? ' *' : ''}
              </label>
            )}
            <DynamicField
              field={field}
              value={data[field.name]}
              onChange={(value) => updateField(field.name, value)}
              referenceOptions={
                field.referenceContentTypeId ? referenceOptionsByContentTypeId[field.referenceContentTypeId] : undefined
              }
            />
            {errors[field.name] && <p className="text-sm text-red-600 mt-1">{errors[field.name]}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <Button label={isEdit ? 'Save entry' : 'Create entry'} onClick={handleSubmit} />
        <Button
          label="Cancel"
          variant="secondary"
          onClick={() => navigate(`/content-types/${contentTypeId}/entries`)}
        />
      </div>
    </div>
  )
}
