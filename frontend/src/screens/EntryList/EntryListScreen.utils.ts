import type { FieldType } from '../../types/contentType'

export function formatFieldValue(value: unknown, type: FieldType): string {
  if (value === undefined || value === null || value === '') return '—'
  if (type === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}
