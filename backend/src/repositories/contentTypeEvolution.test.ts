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

  it('flags an entry whose reference no longer exists when the reference field changes target', async () => {
    const person = await createContentType({ name: 'Person', fields: [] });
    const personEntry = await createEntry(person.id, person.version, {});
    const company = await createContentType({ name: 'Company', fields: [] });

    const car = await createContentType({
      name: 'Car',
      fields: [{ id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: person.id }],
    });
    const carEntry = await createEntry(car.id, car.version, { owner: personEntry.id });

    const beforeChange = await getEntry(car.id, carEntry.id, car.fields);
    expect(beforeChange?.isValid).toBe(true); // sanity check: valid before the evolution

    const newFields = [
      { id: 'f1', name: 'owner', type: 'reference' as const, required: false, referenceContentTypeId: company.id },
    ];
    await commitContentTypeChange(car.id, newFields, {});

    const flagged = await getEntry(car.id, carEntry.id, newFields);
    expect(flagged?.isValid).toBe(false);
    expect(flagged?.errors).toEqual([{ field: 'owner', reason: 'reference' }]);
    expect(flagged?.data).toEqual({ owner: personEntry.id }); // not silently dropped — left for the entry editor to fix
  });

  it('applies a reference backfill at commit time when one is provided up front', async () => {
    const person = await createContentType({ name: 'Person', fields: [] });
    const personEntry = await createEntry(person.id, person.version, {});
    const company = await createContentType({ name: 'Company', fields: [] });
    const companyEntry = await createEntry(company.id, company.version, {});

    const car = await createContentType({
      name: 'Car',
      fields: [{ id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: person.id }],
    });
    const carEntry = await createEntry(car.id, car.version, { owner: personEntry.id });

    const newFields = [
      { id: 'f1', name: 'owner', type: 'reference' as const, required: false, referenceContentTypeId: company.id },
    ];
    await commitContentTypeChange(car.id, newFields, { f1: companyEntry.id });

    const fixed = await getEntry(car.id, carEntry.id, newFields);
    expect(fixed?.isValid).toBe(true);
    expect(fixed?.data).toEqual({ owner: companyEntry.id });
  });
});
