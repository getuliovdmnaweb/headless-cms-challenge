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

export function validateField(field: FieldDefinition, value: unknown): ValidationError | null {
  if (isEmpty(value)) {
    return field.required ? { field: field.name, reason: 'required' } : null;
  }
  if (!matchesType(field, value)) {
    return { field: field.name, reason: 'type' };
  }
  return null;
}

export function validateEntry(fields: FieldDefinition[], data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const error = validateField(field, data[field.name]);
    if (error) errors.push(error);
  }

  return errors;
}
