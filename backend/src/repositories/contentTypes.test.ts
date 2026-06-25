import { pool } from '../db';
import { resetDb } from '../testUtils/resetDb';
import {
  createContentType,
  deleteContentType,
  getContentType,
  getContentTypeBySlug,
  listContentTypes,
  updateContentTypeFields,
} from './contentTypes';

beforeEach(resetDb);
afterAll(() => pool.end());

describe('createContentType', () => {
  it('creates a content type with a derived slug', async () => {
    const created = await createContentType({
      name: 'Podcast episode',
      fields: [{ id: 'f1', name: 'title', type: 'text', required: true }],
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Podcast episode');
    expect(created.slug).toBe('podcast-episode');
    expect(created.version).toBe(1);
    expect(created.fields).toEqual([{ id: 'f1', name: 'title', type: 'text', required: true }]);
  });

  it('rejects a duplicate slug', async () => {
    await createContentType({ name: 'Car', fields: [] });

    await expect(createContentType({ name: 'Car', fields: [] })).rejects.toMatchObject({
      code: 'DUPLICATE_SLUG',
    });
  });

  it('rejects an empty name', async () => {
    await expect(createContentType({ name: '  ', fields: [] })).rejects.toMatchObject({
      code: 'INVALID_NAME',
    });
  });
});

describe('listContentTypes', () => {
  it('lists content types with field and entry counts', async () => {
    await createContentType({
      name: 'Car',
      fields: [
        { id: 'f1', name: 'brand', type: 'text', required: true },
        { id: 'f2', name: 'year', type: 'number', required: false },
      ],
    });

    const list = await listContentTypes();

    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Car');
    expect(list[0].fieldCount).toBe(2);
    expect(list[0].entryCount).toBe(0);
  });
});

describe('getContentType', () => {
  it('returns null for an unknown id', async () => {
    expect(await getContentType('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('returns the content type for a known id', async () => {
    const created = await createContentType({ name: 'Recipe', fields: [] });
    const found = await getContentType(created.id);
    expect(found?.name).toBe('Recipe');
  });
});

describe('getContentTypeBySlug', () => {
  it('returns null for an unknown slug', async () => {
    expect(await getContentTypeBySlug('unknown')).toBeNull();
  });

  it('returns the content type for a known slug', async () => {
    await createContentType({ name: 'Recipe', fields: [] });
    const found = await getContentTypeBySlug('recipe');
    expect(found?.name).toBe('Recipe');
  });
});

describe('updateContentTypeFields', () => {
  it('replaces fields and bumps the version', async () => {
    const created = await createContentType({ name: 'Recipe', fields: [] });

    const updated = await updateContentTypeFields(created.id, [
      { id: 'f1', name: 'ingredients', type: 'text', required: true },
    ]);

    expect(updated?.fields).toEqual([{ id: 'f1', name: 'ingredients', type: 'text', required: true }]);
    expect(updated?.version).toBe(2);
  });
});

describe('deleteContentType', () => {
  it('deletes an existing content type and reports success', async () => {
    const created = await createContentType({ name: 'Car', fields: [] });
    expect(await deleteContentType(created.id)).toBe(true);
    expect(await getContentType(created.id)).toBeNull();
  });

  it('reports false for an unknown id', async () => {
    expect(await deleteContentType('00000000-0000-0000-0000-000000000000')).toBe(false);
  });
});
