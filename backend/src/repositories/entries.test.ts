import { createContentType } from './contentTypes';
import { createEntry, deleteEntry, entryExists, getEntry, listEntries, updateEntry } from './entries';
import { pool } from '../db';
import { resetDb } from '../testUtils/resetDb';

beforeEach(resetDb);
afterAll(() => pool.end());

async function carContentType() {
  return createContentType({
    name: 'Car',
    fields: [
      { id: 'f1', name: 'brand', type: 'text', required: true },
      { id: 'f2', name: 'year', type: 'number', required: false },
    ],
  });
}

describe('createEntry', () => {
  it('creates an entry with the content type current version', async () => {
    const car = await createContentType({ name: 'Car', fields: [] });
    const entry = await createEntry(car.id, car.version, { brand: 'Toyota' });

    expect(entry.contentTypeId).toBe(car.id);
    expect(entry.contentTypeVersion).toBe(car.version);
    expect(entry.data).toEqual({ brand: 'Toyota' });
  });
});

describe('listEntries', () => {
  it('lists entries for a content type annotated with validity', async () => {
    const car = await carContentType();
    await createEntry(car.id, car.version, { brand: 'Toyota', year: 2022 });
    await createEntry(car.id, car.version, { year: 2019 });

    const entries = await listEntries(car.id, car.fields);

    expect(entries).toHaveLength(2);
    const valid = entries.find((e) => e.data.brand === 'Toyota');
    const invalid = entries.find((e) => e.data.year === 2019);
    expect(valid?.isValid).toBe(true);
    expect(valid?.errors).toEqual([]);
    expect(invalid?.isValid).toBe(false);
    expect(invalid?.errors).toEqual([{ field: 'brand', reason: 'required' }]);
  });

  it('only lists entries for the given content type', async () => {
    const car = await carContentType();
    const recipe = await createContentType({ name: 'Recipe', fields: [] });
    await createEntry(car.id, car.version, { brand: 'Toyota' });
    await createEntry(recipe.id, recipe.version, {});

    expect(await listEntries(car.id, car.fields)).toHaveLength(1);
  });
});

describe('getEntry', () => {
  it('returns null for an unknown id', async () => {
    const car = await carContentType();
    expect(await getEntry(car.id, '00000000-0000-0000-0000-000000000000', car.fields)).toBeNull();
  });

  it('returns the entry annotated with validity', async () => {
    const car = await carContentType();
    const created = await createEntry(car.id, car.version, { brand: 'Toyota' });
    const found = await getEntry(car.id, created.id, car.fields);
    expect(found?.isValid).toBe(true);
  });
});

describe('updateEntry', () => {
  it('replaces the entry data', async () => {
    const car = await carContentType();
    const created = await createEntry(car.id, car.version, { brand: 'Toyota' });
    const updated = await updateEntry(car.id, created.id, { brand: 'Honda' });
    expect(updated?.data).toEqual({ brand: 'Honda' });
  });

  it('returns null for an unknown id', async () => {
    const car = await carContentType();
    expect(await updateEntry(car.id, '00000000-0000-0000-0000-000000000000', {})).toBeNull();
  });
});

describe('deleteEntry', () => {
  it('deletes an existing entry and reports success', async () => {
    const car = await carContentType();
    const created = await createEntry(car.id, car.version, { brand: 'Toyota' });
    expect(await deleteEntry(car.id, created.id)).toBe(true);
    expect(await getEntry(car.id, created.id, car.fields)).toBeNull();
  });

  it('reports false for an unknown id', async () => {
    const car = await carContentType();
    expect(await deleteEntry(car.id, '00000000-0000-0000-0000-000000000000')).toBe(false);
  });
});

describe('entryExists', () => {
  it('returns true only for an entry that belongs to the given content type', async () => {
    const car = await carContentType();
    const created = await createEntry(car.id, car.version, { brand: 'Toyota' });

    expect(await entryExists(car.id, created.id)).toBe(true);
    expect(await entryExists(car.id, '00000000-0000-0000-0000-000000000000')).toBe(false);
  });
});
