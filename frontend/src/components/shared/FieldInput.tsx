import Input from '../ui/Input'
import Select from '../ui/Select'
import type { FieldType, FieldOptions } from '../../types/contentType'
import type { EntryData, EntryListResponse } from '../../types/entry'

export interface FieldInputProps {
  name: string
  type: FieldType
  required: boolean
  value: EntryData[string]
  error?: string
  onChange: (val: EntryData[string]) => void
  options?: FieldOptions
  refData?: EntryListResponse
}

export default function FieldInput({ name, type, required, value, error, onChange, refData }: FieldInputProps) {
  const labelId = `field-${name}`

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
      <Select
        id={labelId}
        value={currentId !== null ? String(currentId) : ''}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        error={!!error}
      >
        <option value="">— select —</option>
        {entries.map(e => (
          <option key={e.id} value={String(e.id)}>{getLabel(e)}</option>
        ))}
      </Select>
    )
  }

  return (
    <div>
      <label htmlFor={labelId} className="block text-sm font-medium text-gray-600 mb-1.5">
        {name}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {type === 'text' && (
        <Input
          id={labelId}
          type="text"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          error={!!error}
        />
      )}
      {type === 'number' && (
        <Input
          id={labelId}
          type="number"
          value={(value as number) ?? ''}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          error={!!error}
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
        <Input
          id={labelId}
          type="date"
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          error={!!error}
        />
      )}
      {type === 'reference' && renderReference()}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
