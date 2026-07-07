import { useState } from 'react'
import type { ImpactPreview, FieldChange } from '../../services/contentTypes'

interface Props {
  impact: ImpactPreview
  onConfirm: (fallback: Record<string, unknown>) => void
  onCancel: () => void
}

function changeDescription(c: FieldChange): string {
  if (c.kind === 'type_change') return `${c.fieldName}: ${c.from} → ${c.to}`
  if (c.kind === 'field_deleted') return `${c.fieldName} will be deleted from all entries`
  if (c.kind === 'required_tightened') return `${c.fieldName} is now required`
  return `${c.fieldName} is new and required`
}

export default function ReviewModal({ impact, onConfirm, onCancel }: Props) {
  const typeChanges = impact.changes.filter(c => c.kind === 'type_change')
  const showFallback = impact.unconvertible > 0 && typeChanges.length > 0
  const [fallback, setFallback] = useState<Record<string, string>>({})

  function handleConfirm() {
    onConfirm(fallback)
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Review schema changes</h2>
        <p className="text-sm text-gray-500 mb-4">
          {impact.totalAffected} existing {impact.totalAffected === 1 ? 'entry' : 'entries'} will be affected.
          {impact.unconvertible > 0 && ` ${impact.unconvertible} cannot be converted automatically.`}
        </p>

        {impact.changes.length > 0 && (
          <ul className="mb-4 space-y-1">
            {impact.changes.map((c, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-amber-500 mt-px">⚠</span>
                <span>{changeDescription(c)}</span>
              </li>
            ))}
          </ul>
        )}

        {showFallback && (
          <div className="mb-4 space-y-2 border border-amber-200 rounded-lg p-3 bg-amber-50">
            <p className="text-xs font-medium text-amber-800 mb-1">
              Provide a fallback value for unconvertible entries (leave blank to set null):
            </p>
            {typeChanges.map(c => (
              <div key={c.fieldName} className="flex items-center gap-2">
                <label
                  htmlFor={`fallback-${c.fieldName}`}
                  className="text-sm text-gray-700 w-24 shrink-0"
                >
                  {`Fallback for ${c.fieldName}`}
                </label>
                <input
                  id={`fallback-${c.fieldName}`}
                  type="text"
                  placeholder={`e.g. 0`}
                  value={fallback[c.fieldName] ?? ''}
                  onChange={e => setFallback(prev => ({ ...prev, [c.fieldName]: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  aria-label={`Fallback for ${c.fieldName}`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-md transition-colors"
          >
            Apply changes
          </button>
        </div>
      </div>
    </div>
  )
}
