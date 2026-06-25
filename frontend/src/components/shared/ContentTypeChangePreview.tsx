import { useState } from 'react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Input from '../ui/Input'
import type { FieldImpact } from '../../types/evolution'

interface Props {
  impacts: FieldImpact[]
  onCommit: (backfills: Record<string, unknown>) => void
  onCancel: () => void
}

export default function ContentTypeChangePreview({ impacts, onCommit, onCancel }: Props) {
  const [backfills, setBackfills] = useState<Record<string, string>>({})

  function handleCommit() {
    const provided: Record<string, unknown> = {}
    for (const [fieldId, value] of Object.entries(backfills)) {
      if (value !== '') provided[fieldId] = value
    }
    onCommit(provided)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Review content type change</h2>

        <div className="flex flex-col gap-3 mb-4">
          {impacts.map((impact) => (
            <div key={impact.fieldId} className="border border-gray-200 rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {impact.needsAttention.length === 0
                    ? `${impact.affectedCount} entries — ${impact.fieldName}`
                    : `${impact.needsAttention.length} entries need attention — ${impact.fieldName}`}
                </span>
                {impact.needsAttention.length === 0 ? (
                  <Badge label="Auto-migrated" variant="success" />
                ) : (
                  <Badge label="Needs attention" variant="danger" />
                )}
              </div>

              {impact.needsAttention.length > 0 && (
                <>
                  <ul className="text-sm text-gray-500 mb-2">
                    {impact.needsAttention.slice(0, 3).map((entry) => (
                      <li key={entry.entryId}>{entry.currentValue === undefined ? 'empty' : String(entry.currentValue)}</li>
                    ))}
                  </ul>
                  <Input
                    placeholder="Backfill value"
                    value={backfills[impact.fieldId] ?? ''}
                    onChange={(value) => setBackfills({ ...backfills, [impact.fieldId]: value })}
                  />
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button label="Commit changes" onClick={handleCommit} />
          <Button label="Cancel" variant="secondary" onClick={onCancel} />
        </div>
      </div>
    </div>
  )
}
