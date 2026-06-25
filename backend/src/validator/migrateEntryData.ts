import { validateField } from './validateEntry';
import type { FieldDiff } from './diffFields';
import type { FieldDefinition } from '../repositories/contentTypes';

function coerceToFieldType(field: FieldDefinition, value: unknown): unknown {
  if (typeof value !== 'string') return value;

  switch (field.type) {
    case 'number': {
      const coerced = Number(value);
      return Number.isNaN(coerced) ? value : coerced;
    }
    case 'boolean':
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      return value;
    default:
      return value;
  }
}

export function migrateEntryData(
  diffs: FieldDiff[],
  data: Record<string, unknown>,
  backfillByFieldId: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...data };

  for (const diff of diffs) {
    if (diff.changes.length === 0 || diff.changes.includes('added')) continue;

    const readKey = diff.oldField!.name;
    const value = result[readKey];
    delete result[readKey];

    if (diff.changes.includes('deleted')) continue;

    const writeKey = diff.newField!.name;
    const needsCheck = diff.changes.includes('type-changed') || diff.changes.includes('required-changed');

    if (needsCheck && validateField(diff.newField!, value) && diff.fieldId in backfillByFieldId) {
      result[writeKey] = coerceToFieldType(diff.newField!, backfillByFieldId[diff.fieldId]);
    } else {
      result[writeKey] = value;
    }
  }

  return result;
}
