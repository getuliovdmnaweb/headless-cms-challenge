import Button from '../../components/ui/Button'
import Checkbox from '../../components/ui/Checkbox'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import type { FieldDefinition, FieldType } from '../../types/contentType'

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'reference', label: 'Reference' },
]

interface Props {
  field: FieldDefinition
  contentTypeOptions: { value: string; label: string }[]
  onChange: (field: FieldDefinition) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

export default function FieldRow({
  field,
  contentTypeOptions,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: Props) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100">
      <Input value={field.name} onChange={(name) => onChange({ ...field, name })} placeholder="Field name" />
      <Select
        value={field.type}
        onChange={(type) => onChange({ ...field, type: type as FieldType })}
        options={FIELD_TYPE_OPTIONS}
      />
      {field.type === 'reference' && (
        <Select
          value={field.referenceContentTypeId ?? ''}
          onChange={(referenceContentTypeId) => onChange({ ...field, referenceContentTypeId })}
          options={[{ value: '', label: 'Select a content type' }, ...contentTypeOptions]}
        />
      )}
      <Checkbox checked={field.required} onChange={(required) => onChange({ ...field, required })} label="Required" />
      <Button label="↑" variant="secondary" size="sm" onClick={onMoveUp} disabled={!canMoveUp} />
      <Button label="↓" variant="secondary" size="sm" onClick={onMoveDown} disabled={!canMoveDown} />
      <Button label="Remove" variant="danger" size="sm" onClick={onRemove} />
    </div>
  )
}
