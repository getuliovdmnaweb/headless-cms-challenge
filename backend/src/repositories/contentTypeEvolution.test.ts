import { pool } from '../db';
import { resetDb } from '../testUtils/resetDb';
import { createContentType } from './contentTypes';
import { createEntry, getEntry } from './entries';
import { commitContentTypeChange } from './contentTypeEvolution';

beforeEach(resetDb);
afterAll(() => pool.end());

describe('commitContentTypeChange', () => {
  it('updates the content type fields and bumps the version', async () => {
    const car = await createContentType({
      name: 'Car',
      fields: [{ id: 'f1', name: 'brand', type: 'text', required: true }],
    });

    const newFields = [{ id: 'f1', name: 'make', type: 'text' as const, required: true }];
    const result = (await commitContentTypeChange(car.id, newFields, {}))!;

    expect(result.contentType.fields).toEqual(newFields);
    expect(result.contentType.version).toBe(2);
  });

  it('migrates entry data on rename and reports the migrated entry ids', async () => {
    const car = await createContentType({
      name: 'Car',
      fields: [{ id: 'f1', name: 'brand', type: 'text', required: false }],
    });
    const entry = await createEntry(car.id, car.version, { brand: 'Toyota' });

    const newFields = [{ id: 'f1', name: 'make', type: 'text' as const, required: false }];
    const result = (await commitContentTypeChange(car.id, newFields, {}))!;

    expect(result.migratedEntryIds).toEqual([entry.id]);
    const migrated = await getEntry(car.id, entry.id, newFields);
    expect(migrated?.data).toEqual({ make: 'Toyota' });
    expect(migrated?.contentTypeVersion).toBe(2);
  });

  it('applies a backfill default to entries that fail the new type', async () => {
    const car = await createContentType({
      name: 'Car',
      fields: [{ id: 'f1', name: 'year', type: 'text', required: false }],
    });
    const badEntry = await createEntry(car.id, car.version, { year: 'early 2000s' });

    const newFields = [{ id: 'f1', name: 'year', type: 'number' as const, required: false }];
    await commitContentTypeChange(car.id, newFields, { f1: 1999 });

    const migrated = await getEntry(car.id, badEntry.id, newFields);
    expect(migrated?.data).toEqual({ year: 1999 });
    expect(migrated?.isValid).toBe(true);
  });

  it('leaves an entry without a backfill invalid but does not block the commit', async () => {
    const car = await createContentType({
      name: 'Car',
      fields: [{ id: 'f1', name: 'year', type: 'text', required: false }],
    });
    const badEntry = await createEntry(car.id, car.version, { year: 'early 2000s' });

    const newFields = [{ id: 'f1', name: 'year', type: 'number' as const, required: false }];
    const result = (await commitContentTypeChange(car.id, newFields, {}))!;

    expect(result.contentType.version).toBe(2);
    const migrated = await getEntry(car.id, badEntry.id, newFields);
    expect(migrated?.isValid).toBe(false);
    expect(migrated?.contentTypeVersion).toBe(2);
  });

  it('does not migrate entries belonging to a different content type', async () => {
    const car = await createContentType({ name: 'Car', fields: [{ id: 'f1', name: 'brand', type: 'text', required: false }] });
    const recipe = await createContentType({ name: 'Recipe', fields: [] });
    const recipeEntry = await createEntry(recipe.id, recipe.version, {});

    await commitContentTypeChange(car.id, [{ id: 'f1', name: 'make', type: 'text', required: false }], {});

    const untouched = await getEntry(recipe.id, recipeEntry.id, []);
    expect(untouched?.contentTypeVersion).toBe(1);
  });
});
