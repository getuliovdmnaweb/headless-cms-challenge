import type { FieldDefinition } from '../repositories/contentTypes';

export interface ValidationError {
  field: string;
  reason: 'required' | 'type' | 'reference';
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function matchesType(field: FieldDefinition, value: unknown): boolean {
  switch (field.type) {
    case 'text':
    case 'reference':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value));
    default:
      return true;
  }
}

export function validateEntry(fields: FieldDefinition[], data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const value = data[field.name];

    if (isEmpty(value)) {
      if (field.required) {
        errors.push({ field: field.name, reason: 'required' });
      }
      continue;
    }

    if (!matchesType(field, value)) {
      errors.push({ field: field.name, reason: 'type' });
    }
  }

  return errors;
}
