import type { FieldDefinition } from '../repositories/contentTypes';
import { validateEntry } from './validateEntry';

describe('validateEntry', () => {
  it('passes when all required fields are present and typed correctly', () => {
    const fields: FieldDefinition[] = [
      { id: 'f1', name: 'brand', type: 'text', required: true },
      { id: 'f2', name: 'year', type: 'number', required: false },
    ];
    expect(validateEntry(fields, { brand: 'Toyota', year: 2022 })).toEqual([]);
  });

  it('reports a missing required field', () => {
    const fields: FieldDefinition[] = [{ id: 'f1', name: 'brand', type: 'text', required: true }];
    expect(validateEntry(fields, {})).toEqual([
      { field: 'brand', reason: 'required' },
    ]);
  });

  it('treats an empty string as missing for a required field', () => {
    const fields: FieldDefinition[] = [{ id: 'f1', name: 'brand', type: 'text', required: true }];
    expect(validateEntry(fields, { brand: '  ' })).toEqual([{ field: 'brand', reason: 'required' }]);
  });

  it('does not require an optional field', () => {
    const fields: FieldDefinition[] = [{ id: 'f1', name: 'year', type: 'number', required: false }];
    expect(validateEntry(fields, {})).toEqual([]);
  });

  it.each([
    ['number', 'not-a-number'],
    ['boolean', 'not-a-boolean'],
    ['date', 'not-a-date'],
  ] as const)('reports a type mismatch for %s fields', (type, value) => {
    const fields: FieldDefinition[] = [{ id: 'f1', name: 'value', type, required: false }];
    expect(validateEntry(fields, { value })).toEqual([{ field: 'value', reason: 'type' }]);
  });

  it('accepts valid values for each primitive type', () => {
    const fields: FieldDefinition[] = [
      { id: 'f1', name: 'count', type: 'number', required: false },
      { id: 'f2', name: 'active', type: 'boolean', required: false },
      { id: 'f3', name: 'releasedOn', type: 'date', required: false },
    ];
    expect(validateEntry(fields, { count: 42, active: true, releasedOn: '2024-01-01' })).toEqual([]);
  });

  it('accepts a string id for a reference field', () => {
    const fields: FieldDefinition[] = [
      { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'ct1' },
    ];
    expect(validateEntry(fields, { owner: 'some-entry-id' })).toEqual([]);
  });

  it('reports multiple errors at once', () => {
    const fields: FieldDefinition[] = [
      { id: 'f1', name: 'brand', type: 'text', required: true },
      { id: 'f2', name: 'year', type: 'number', required: true },
    ];
    expect(validateEntry(fields, { year: 'not-a-number' })).toEqual([
      { field: 'brand', reason: 'required' },
      { field: 'year', reason: 'type' },
    ]);
  });
});
