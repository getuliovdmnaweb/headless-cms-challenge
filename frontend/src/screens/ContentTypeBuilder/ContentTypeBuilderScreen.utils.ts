import type { FieldDefinition } from '../../types/contentType'

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function createEmptyField(): FieldDefinition {
  return {
    id: crypto.randomUUID(),
    name: '',
    type: 'text',
    required: false,
  }
}
