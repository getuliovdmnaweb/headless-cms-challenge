import request from 'supertest';
import { createApp } from '../app';
import { pool } from '../db';
import { bus } from '../realtime/bus';
import { resetDb } from '../testUtils/resetDb';

const app = createApp();

beforeEach(resetDb);
afterAll(() => pool.end());

function waitForEvent(event: string): Promise<any> {
  return new Promise((resolve) => bus.once(event, resolve));
}

describe('POST /api/content-types', () => {
  it('creates a content type', async () => {
    const res = await request(app)
      .post('/api/content-types')
      .send({ name: 'Car', fields: [{ id: 'f1', name: 'brand', type: 'text', required: true }] });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Car');
    expect(res.body.slug).toBe('car');
    expect(res.body.fields).toHaveLength(1);
  });

  it('emits a contentType:updated event', async () => {
    const eventPromise = waitForEvent('contentType:updated');
    const res = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    expect(await eventPromise).toEqual({ contentTypeId: res.body.id });
  });

  it('returns a field-level 400 for an empty name', async () => {
    const res = await request(app).post('/api/content-types').send({ name: '  ', fields: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('name');
  });

  it('returns a field-level 400 for a duplicate slug', async () => {
    await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    const res = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('slug');
  });
});

describe('GET /api/content-types', () => {
  it('lists content types', async () => {
    await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    const res = await request(app).get('/api/content-types');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Car');
  });
});

describe('GET /api/content-types/:id', () => {
  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/content-types/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns the content type for a known id', async () => {
    const created = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    const res = await request(app).get(`/api/content-types/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Car');
  });
});

describe('PATCH /api/content-types/:id', () => {
  it('updates fields and returns the new version', async () => {
    const created = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    const res = await request(app)
      .patch(`/api/content-types/${created.body.id}`)
      .send({ fields: [{ id: 'f1', name: 'brand', type: 'text', required: true }] });

    expect(res.status).toBe(200);
    expect(res.body.fields).toHaveLength(1);
    expect(res.body.version).toBe(2);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .patch('/api/content-types/00000000-0000-0000-0000-000000000000')
      .send({ fields: [] });
    expect(res.status).toBe(404);
  });

  it('emits a contentType:updated event', async () => {
    const created = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    const eventPromise = waitForEvent('contentType:updated');
    await request(app).patch(`/api/content-types/${created.body.id}`).send({ fields: [] });
    expect(await eventPromise).toEqual({ contentTypeId: created.body.id });
  });

  it('rejects a risky change (rename) and points to the evolution flow', async () => {
    const created = await request(app)
      .post('/api/content-types')
      .send({ name: 'Car', fields: [{ id: 'f1', name: 'brand', type: 'text', required: false }] });

    const res = await request(app)
      .patch(`/api/content-types/${created.body.id}`)
      .send({ fields: [{ id: 'f1', name: 'make', type: 'text', required: false }] });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/content-types/:id/preview-change', () => {
  it('returns risky: false and no impacts for a non-risky change', async () => {
    const created = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });

    const res = await request(app)
      .post(`/api/content-types/${created.body.id}/preview-change`)
      .send({ fields: [{ id: 'f1', name: 'brand', type: 'text', required: false }] });

    expect(res.status).toBe(200);
    expect(res.body.risky).toBe(false);
    expect(res.body.impacts).toEqual([]);
    expect(res.body.baseVersion).toBe(1);
  });

  it('returns risky: true with classified impacts for a risky change, without writing anything', async () => {
    const created = await request(app)
      .post('/api/content-types')
      .send({ name: 'Car', fields: [{ id: 'f1', name: 'year', type: 'text', required: false }] });
    await request(app).post(`/api/content-types/${created.body.id}/entries`).send({ data: { year: 'early 2000s' } });

    const res = await request(app)
      .post(`/api/content-types/${created.body.id}/preview-change`)
      .send({ fields: [{ id: 'f1', name: 'year', type: 'number', required: false }] });

    expect(res.status).toBe(200);
    expect(res.body.risky).toBe(true);
    expect(res.body.impacts[0].needsAttention).toEqual([{ entryId: expect.any(String), currentValue: 'early 2000s' }]);

    const unchanged = await request(app).get(`/api/content-types/${created.body.id}`);
    expect(unchanged.body.version).toBe(1);
  });

  it('returns 404 for an unknown content type', async () => {
    const res = await request(app)
      .post('/api/content-types/00000000-0000-0000-0000-000000000000/preview-change')
      .send({ fields: [] });
    expect(res.status).toBe(404);
  });

  it('flags entries whose reference no longer exists when a reference field changes target', async () => {
    const person = await request(app).post('/api/content-types').send({ name: 'Person', fields: [] });
    const personEntry = await request(app).post(`/api/content-types/${person.body.id}/entries`).send({ data: {} });
    const company = await request(app).post('/api/content-types').send({ name: 'Company', fields: [] });

    const car = await request(app)
      .post('/api/content-types')
      .send({
        name: 'Car',
        fields: [{ id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: person.body.id }],
      });
    await request(app).post(`/api/content-types/${car.body.id}/entries`).send({ data: { owner: personEntry.body.id } });

    const res = await request(app)
      .post(`/api/content-types/${car.body.id}/preview-change`)
      .send({ fields: [{ id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: company.body.id }] });

    expect(res.status).toBe(200);
    expect(res.body.risky).toBe(true);
    expect(res.body.impacts[0].changes).toEqual(['reference-target-changed']);
    expect(res.body.impacts[0].needsAttention).toEqual([{ entryId: expect.any(String), currentValue: personEntry.body.id }]);
  });
});

describe('POST /api/content-types/:id/commit-change', () => {
  it('applies the change, bumps the version, and migrates entries', async () => {
    const created = await request(app)
      .post('/api/content-types')
      .send({ name: 'Car', fields: [{ id: 'f1', name: 'brand', type: 'text', required: false }] });
    await request(app).post(`/api/content-types/${created.body.id}/entries`).send({ data: { brand: 'Toyota' } });

    const res = await request(app)
      .post(`/api/content-types/${created.body.id}/commit-change`)
      .send({ baseVersion: 1, fields: [{ id: 'f1', name: 'make', type: 'text', required: false }] });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
    expect(res.body.fields[0].name).toBe('make');
  });

  it('applies a provided backfill to entries needing attention', async () => {
    const created = await request(app)
      .post('/api/content-types')
      .send({ name: 'Car', fields: [{ id: 'f1', name: 'year', type: 'text', required: false }] });
    const entry = await request(app).post(`/api/content-types/${created.body.id}/entries`).send({ data: { year: 'early 2000s' } });

    await request(app)
      .post(`/api/content-types/${created.body.id}/commit-change`)
      .send({ baseVersion: 1, fields: [{ id: 'f1', name: 'year', type: 'number', required: false }], backfills: { f1: 1999 } });

    const migrated = await request(app).get(`/api/content-types/${created.body.id}/entries/${entry.body.id}`);
    expect(migrated.body.data).toEqual({ year: 1999 });
    expect(migrated.body.isValid).toBe(true);
  });

  it('emits realtime events for the content type and each migrated entry', async () => {
    const created = await request(app)
      .post('/api/content-types')
      .send({ name: 'Car', fields: [{ id: 'f1', name: 'brand', type: 'text', required: false }] });
    const entry = await request(app).post(`/api/content-types/${created.body.id}/entries`).send({ data: { brand: 'Toyota' } });

    const contentTypeEvent = waitForEvent('contentType:updated');
    const entryEvent = waitForEvent('entry:updated');
    await request(app)
      .post(`/api/content-types/${created.body.id}/commit-change`)
      .send({ baseVersion: 1, fields: [{ id: 'f1', name: 'make', type: 'text', required: false }] });

    expect(await contentTypeEvent).toEqual({ contentTypeId: created.body.id });
    expect(await entryEvent).toEqual({ contentTypeId: created.body.id, entryId: entry.body.id });
  });

  it('returns 404 for an unknown content type', async () => {
    const res = await request(app)
      .post('/api/content-types/00000000-0000-0000-0000-000000000000/commit-change')
      .send({ baseVersion: 1, fields: [] });
    expect(res.status).toBe(404);
  });

  it('returns 400 when baseVersion is missing', async () => {
    const created = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    const res = await request(app).post(`/api/content-types/${created.body.id}/commit-change`).send({ fields: [] });
    expect(res.status).toBe(400);
  });

  it('returns 409 with the current state when the content type changed since the client loaded it', async () => {
    const created = await request(app)
      .post('/api/content-types')
      .send({ name: 'Car', fields: [{ id: 'f1', name: 'brand', type: 'text', required: false }] });

    // Someone else commits first.
    await request(app)
      .post(`/api/content-types/${created.body.id}/commit-change`)
      .send({ baseVersion: 1, fields: [{ id: 'f1', name: 'make', type: 'text', required: false }] });

    // A client still holding the stale version 1 tries to commit on top of it.
    const res = await request(app)
      .post(`/api/content-types/${created.body.id}/commit-change`)
      .send({ baseVersion: 1, fields: [{ id: 'f1', name: 'brand', type: 'number', required: false }] });

    expect(res.status).toBe(409);
    expect(res.body.error.currentVersion).toBe(2);
    expect(res.body.error.currentFields).toEqual([{ id: 'f1', name: 'make', type: 'text', required: false }]);
  });
});

describe('DELETE /api/content-types/:id', () => {
  it('deletes a content type', async () => {
    const created = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    const res = await request(app).delete(`/api/content-types/${created.body.id}`);
    expect(res.status).toBe(204);
    expect((await request(app).get(`/api/content-types/${created.body.id}`)).status).toBe(404);
  });

  it('emits a contentType:deleted event', async () => {
    const created = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    const eventPromise = waitForEvent('contentType:deleted');
    await request(app).delete(`/api/content-types/${created.body.id}`);
    expect(await eventPromise).toEqual({ contentTypeId: created.body.id });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/api/content-types/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
