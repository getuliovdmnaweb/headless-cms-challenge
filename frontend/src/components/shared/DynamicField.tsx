import Checkbox from '../ui/Checkbox'
import Input from '../ui/Input'
import Select from '../ui/Select'
import type { FieldDefinition } from '../../types/contentType'

interface Props {
  field: FieldDefinition
  value: unknown
  onChange: (value: unknown) => void
  referenceOptions?: { value: string; label: string }[]
}

export default function DynamicField({ field, value, onChange, referenceOptions }: Props) {
  switch (field.type) {
    case 'number':
      return (
        <Input
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(v) => onChange(v === '' ? undefined : Number(v))}
          placeholder={field.name}
        />
      )
    case 'boolean':
      return <Checkbox checked={Boolean(value)} onChange={onChange} label={field.name} />
    case 'date':
      return (
        <Input
          type="date"
          value={value === undefined || value === null ? '' : String(value)}
          onChange={onChange}
          placeholder={field.name}
        />
      )
    case 'reference':
      return (
        <Select
          value={value === undefined || value === null ? '' : String(value)}
          onChange={onChange}
          options={[{ value: '', label: `Select ${field.name}` }, ...(referenceOptions ?? [])]}
        />
      )
    default:
      return (
        <Input
          value={value === undefined || value === null ? '' : String(value)}
          onChange={onChange}
          placeholder={field.name}
        />
      )
  }
}
