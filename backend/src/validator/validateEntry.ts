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

export type EntryExistsChecker = (contentTypeId: string, entryId: string) => Promise<boolean>;

export async function validateFieldAsync(
  field: FieldDefinition,
  value: unknown,
  entryExists: EntryExistsChecker
): Promise<ValidationError | null> {
  const syncError = validateField(field, value);
  if (syncError) return syncError;

  if (field.type === 'reference' && field.referenceContentTypeId && !isEmpty(value)) {
    const exists = await entryExists(field.referenceContentTypeId, String(value));
    if (!exists) return { field: field.name, reason: 'reference' };
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
