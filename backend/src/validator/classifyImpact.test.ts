import type { FieldDefinition } from '../repositories/contentTypes';
import { classifyImpact } from './classifyImpact';
import type { FieldDiff } from './diffFields';

function entry(id: string, data: Record<string, unknown>) {
  return { id, data };
}

describe('classifyImpact', () => {
  it('skips fields that are added or unchanged', () => {
    const diffs: FieldDiff[] = [{ fieldId: 'f1', changes: [] }, { fieldId: 'f2', changes: ['added'] }];
    expect(classifyImpact(diffs, [])).toEqual([]);
  });

  it('counts entries with a present value for a deleted field, with nothing needing attention', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'notes', type: 'text', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField: undefined, changes: ['deleted'] }];
    const entries = [entry('e1', { notes: 'hello' }), entry('e2', {})];

    const [impact] = classifyImpact(diffs, entries);

    expect(impact.affectedCount).toBe(1);
    expect(impact.needsAttention).toEqual([]);
  });

  it('treats a pure rename as fully auto-migrated', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'make', type: 'text', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['renamed'] }];
    const entries = [entry('e1', { brand: 'Toyota' }), entry('e2', { brand: 'Honda' })];

    const [impact] = classifyImpact(diffs, entries);

    expect(impact.autoMigratedCount).toBe(2);
    expect(impact.needsAttention).toEqual([]);
  });

  it('flags entries whose value fails the new type as needing attention', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['type-changed'] }];
    const entries = [entry('e1', { year: 2022 }), entry('e2', { year: 'early 2000s' })];

    const [impact] = classifyImpact(diffs, entries);

    expect(impact.autoMigratedCount).toBe(1);
    expect(impact.needsAttention).toEqual([{ entryId: 'e2', currentValue: 'early 2000s' }]);
  });

  it('flags entries missing a value when a field becomes required', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: true };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['required-changed'] }];
    const entries = [entry('e1', { owner: 'Jane' }), entry('e2', {})];

    const [impact] = classifyImpact(diffs, entries);

    expect(impact.autoMigratedCount).toBe(1);
    expect(impact.needsAttention).toEqual([{ entryId: 'e2', currentValue: undefined }]);
  });

  it('reads the value from the old field name when rename and type change happen together', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'releaseYear', type: 'number', required: false };
    const diffs: FieldDiff[] = [{ fieldId: 'f1', oldField, newField, changes: ['renamed', 'type-changed'] }];
    const entries = [entry('e1', { year: 2022 })];

    const [impact] = classifyImpact(diffs, entries);

    expect(impact.autoMigratedCount).toBe(1);
    expect(impact.fieldName).toBe('releaseYear');
  });
});
