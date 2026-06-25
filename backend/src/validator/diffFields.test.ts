import type { FieldDefinition } from '../repositories/contentTypes';
import { diffFields, isRiskyChange } from './diffFields';

describe('diffFields', () => {
  it('marks a brand-new field as added', () => {
    const diffs = diffFields([], [{ id: 'f1', name: 'brand', type: 'text', required: false }]);
    expect(diffs).toEqual([
      { fieldId: 'f1', oldField: undefined, newField: { id: 'f1', name: 'brand', type: 'text', required: false }, changes: ['added'] },
    ]);
  });

  it('marks a removed field as deleted', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: false };
    const diffs = diffFields([oldField], []);
    expect(diffs).toEqual([{ fieldId: 'f1', oldField, newField: undefined, changes: ['deleted'] }]);
  });

  it('matches fields by id and reports no changes when nothing differs', () => {
    const field: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: false };
    const diffs = diffFields([field], [field]);
    expect(diffs).toEqual([{ fieldId: 'f1', oldField: field, newField: field, changes: [] }]);
  });

  it('detects a rename (same id, different name)', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'make', type: 'text', required: false };
    const diffs = diffFields([oldField], [newField]);
    expect(diffs[0].changes).toEqual(['renamed']);
  });

  it('detects a type change', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    const diffs = diffFields([oldField], [newField]);
    expect(diffs[0].changes).toEqual(['type-changed']);
  });

  it('detects becoming required', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: true };
    const diffs = diffFields([oldField], [newField]);
    expect(diffs[0].changes).toEqual(['required-changed']);
  });

  it('does not flag becoming optional as a required change', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: true };
    const newField: FieldDefinition = { id: 'f1', name: 'owner', type: 'text', required: false };
    const diffs = diffFields([oldField], [newField]);
    expect(diffs[0].changes).toEqual([]);
  });

  it('reports compound changes (rename and type change together)', () => {
    const oldField: FieldDefinition = { id: 'f1', name: 'year', type: 'text', required: false };
    const newField: FieldDefinition = { id: 'f1', name: 'releaseYear', type: 'number', required: false };
    const diffs = diffFields([oldField], [newField]);
    expect(diffs[0].changes).toEqual(['renamed', 'type-changed']);
  });

  it('preserves field order, with deleted fields ordered before any newly added fields', () => {
    const a: FieldDefinition = { id: 'a', name: 'a', type: 'text', required: false };
    const b: FieldDefinition = { id: 'b', name: 'b', type: 'text', required: false };
    const c: FieldDefinition = { id: 'c', name: 'c', type: 'text', required: false };
    const diffs = diffFields([a, b], [b, c]);
    expect(diffs.map((d) => d.fieldId)).toEqual(['a', 'b', 'c']);
  });
});

describe('isRiskyChange', () => {
  it.each([['deleted'], ['renamed'], ['type-changed'], ['required-changed']] as const)(
    'is risky when a field has a %s change',
    (change) => {
      expect(isRiskyChange([{ fieldId: 'f1', changes: [change] }])).toBe(true);
    }
  );

  it('is not risky for added or unchanged fields', () => {
    expect(isRiskyChange([{ fieldId: 'f1', changes: ['added'] }, { fieldId: 'f2', changes: [] }])).toBe(false);
  });
});
