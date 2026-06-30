import type { FieldDefinition } from '../repositories/contentTypes';
import type { FieldDiff } from './diffFields';
import { migrateEntryData } from './migrateEntryData';

const alwaysExists = async () => true;
const neverExists = async () => false;

describe('migrateEntryData', () => {
  it('removes the key for a deleted field', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'notes', type: 'text', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField: undefined, changes: ['deleted'] }];
    expect(await migrateEntryData(diffs, { notes: 'hello', brand: 'Toyota' }, {}, alwaysExists)).toEqual({ brand: 'Toyota' });
  });

  it('moves the value from the old key to the new key on rename', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'make', type: 'text', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['renamed'] }];
    expect(await migrateEntryData(diffs, { brand: 'Toyota' }, {}, alwaysExists)).toEqual({ make: 'Toyota' });
  });

  it('leaves a value that already satisfies the new type unchanged', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['type-changed'] }];
    expect(await migrateEntryData(diffs, { year: 2022 }, {}, alwaysExists)).toEqual({ year: 2022 });
  });

  it('applies the backfill value when the existing value fails the new type and a backfill is provided', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['type-changed'] }];
    expect(await migrateEntryData(diffs, { year: 'early 2000s' }, { f1: 1999 }, alwaysExists)).toEqual({ year: 1999 });
  });

  it('coerces a backfill value submitted as a string (e.g. from a text input) to the field type', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['type-changed'] }];
    expect(await migrateEntryData(diffs, { year: 'early 2000s' }, { f1: '1999' }, alwaysExists)).toEqual({ year: 1999 });
  });

  it('coerces a string backfill of "true"/"false" to a boolean for a boolean field', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'active', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'active', type: 'boolean', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['type-changed'] }];
    expect(await migrateEntryData(diffs, { active: 'yes' }, { f1: 'true' }, alwaysExists)).toEqual({ active: true });
  });

  it('leaves an invalid value as-is when no backfill is provided (flag and allow)', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['type-changed'] }];
    expect(await migrateEntryData(diffs, { year: 'early 2000s' }, {}, alwaysExists)).toEqual({ year: 'early 2000s' });
  });

  it('applies a backfill for a missing value when the field becomes required', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: true };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['required-changed'] }];
    expect(await migrateEntryData(diffs, {}, { f1: 'Unassigned' }, alwaysExists)).toEqual({ owner: 'Unassigned' });
  });

  it('reads from the old key and writes the backfill under the new key for compound rename + type change', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'releaseYear', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['renamed', 'type-changed'] }];
    expect(await migrateEntryData(diffs, { year: 'early 2000s' }, { f1: 1999 }, alwaysExists)).toEqual({ releaseYear: 1999 });
  });

  it('leaves fields untouched by any diff as-is', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'make', type: 'text', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['renamed'] }];
    expect(await migrateEntryData(diffs, { brand: 'Toyota', year: 2022 }, {}, alwaysExists)).toEqual({ make: 'Toyota', year: 2022 });
  });

  it('leaves a reference value as-is when it still exists in the new target', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'person' };
    const newField: FieldDefinition = { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'company' };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['reference-target-changed'] }];
    expect(await migrateEntryData(diffs, { owner: 'c1' }, {}, alwaysExists)).toEqual({ owner: 'c1' });
  });

  it('applies a backfill reference id when the old reference does not exist in the new target', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'person' };
    const newField: FieldDefinition = { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'company' };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['reference-target-changed'] }];
    expect(await migrateEntryData(diffs, { owner: 'p1' }, { f1: 'c1' }, neverExists)).toEqual({ owner: 'c1' });
  });

  it('leaves a broken reference as-is when no backfill is provided (flag and allow)', async () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'person' };
    const newField: FieldDefinition = { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'company' };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['reference-target-changed'] }];
    expect(await migrateEntryData(diffs, { owner: 'p1' }, {}, neverExists)).toEqual({ owner: 'p1' });
  });
});
