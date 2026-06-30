import type { FieldDefinition } from '../repositories/contentTypes';
import { validateEntry, validateEntryAsync, validateField, validateFieldAsync } from './validateEntry';

const alwaysExists = async () => true;
const neverExists = async () => false;

describe('validateFieldAsync', () => {
  it('returns the sync validation error without checking existence', async () => {
    const field: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: true };
    const checker = jest.fn(alwaysExists);
    expect(await validateFieldAsync(field, undefined, checker)).toEqual({ field: 'brand', reason: 'required' });
    expect(checker).not.toHaveBeenCalled();
  });

  it('returns a reference error when the referenced entry does not exist in the target content type', async () => {
    const field: FieldDefinition = { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'person' };
    expect(await validateFieldAsync(field, 'p1', neverExists)).toEqual({ field: 'owner', reason: 'reference' });
  });

  it('returns null when the referenced entry exists in the target content type', async () => {
    const field: FieldDefinition = { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'person' };
    expect(await validateFieldAsync(field, 'p1', alwaysExists)).toBeNull();
  });

  it('does not check existence for non-reference fields', async () => {
    const field: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: false };
    const checker = jest.fn(alwaysExists);
    expect(await validateFieldAsync(field, 'Toyota', checker)).toBeNull();
    expect(checker).not.toHaveBeenCalled();
  });
});

describe('validateField', () => {
  it('returns a required error for a missing required field', () => {
    const field: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: true };
    expect(validateField(field, undefined)).toEqual({ field: 'brand', reason: 'required' });
  });

  it('returns a type error for a value that does not match', () => {
    const field: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    expect(validateField(field, 'not-a-number')).toEqual({ field: 'year', reason: 'type' });
  });

  it('returns null for a valid value', () => {
    const field: FieldDefinition = { id: 'f1', name: 'brand', type: 'text', required: true };
    expect(validateField(field, 'Toyota')).toBeNull();
  });

  it('returns null for a missing optional field', () => {
    const field: FieldDefinition = { id: 'f1', name: 'year', type: 'number', required: false };
    expect(validateField(field, undefined)).toBeNull();
  });
});

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

describe('validateEntryAsync', () => {
  it('reports a broken reference alongside other sync errors', async () => {
    const fields: FieldDefinition[] = [
      { id: 'f1', name: 'brand', type: 'text', required: true },
      { id: 'f2', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'person' },
    ];
    const errors = await validateEntryAsync(fields, { owner: 'p1' }, async () => false);
    expect(errors).toEqual([
      { field: 'brand', reason: 'required' },
      { field: 'owner', reason: 'reference' },
    ]);
  });

  it('returns no errors when the reference exists and everything else is valid', async () => {
    const fields: FieldDefinition[] = [
      { id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: 'person' },
    ];
    const errors = await validateEntryAsync(fields, { owner: 'p1' }, async () => true);
    expect(errors).toEqual([]);
  });
});
