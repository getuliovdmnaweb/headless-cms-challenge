import type { FieldDefinition } from '../repositories/contentTypes';
import type { FieldDiff } from './diffFields';
import { migrateEntryData } from './migrateEntryData';

describe('migrateEntryData', () => {
  it('removes the key for a deleted field', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'notes', type: 'text', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField: undefined, changes: ['deleted'] }];
    expect(migrateEntryData(diffs, { notes: 'hello', brand: 'Toyota' }, {})).toEqual({ brand: 'Toyota' });
  });

  it('moves the value from the old key to the new key on rename', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'make', type: 'text', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['renamed'] }];
    expect(migrateEntryData(diffs, { brand: 'Toyota' }, {})).toEqual({ make: 'Toyota' });
  });

  it('leaves a value that already satisfies the new type unchanged', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['type-changed'] }];
    expect(migrateEntryData(diffs, { year: 2022 }, {})).toEqual({ year: 2022 });
  });

  it('applies the backfill value when the existing value fails the new type and a backfill is provided', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['type-changed'] }];
    expect(migrateEntryData(diffs, { year: 'early 2000s' }, { f1: 1999 })).toEqual({ year: 1999 });
  });

  it('leaves an invalid value as-is when no backfill is provided (flag and allow)', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['type-changed'] }];
    expect(migrateEntryData(diffs, { year: 'early 2000s' }, {})).toEqual({ year: 'early 2000s' });
  });

  it('applies a backfill for a missing value when the field becomes required', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: true };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['required-changed'] }];
    expect(migrateEntryData(diffs, {}, { f1: 'Unassigned' })).toEqual({ owner: 'Unassigned' });
  });

  it('reads from the old key and writes the backfill under the new key for compound rename + type change', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'releaseYear', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['renamed', 'type-changed'] }];
    expect(migrateEntryData(diffs, { year: 'early 2000s' }, { f1: 1999 })).toEqual({ releaseYear: 1999 });
  });

  it('leaves fields untouched by any diff as-is', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'make', type: 'text', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['renamed'] }];
    expect(migrateEntryData(diffs, { brand: 'Toyota', year: 2022 }, {})).toEqual({ make: 'Toyota', year: 2022 });
  });
});
