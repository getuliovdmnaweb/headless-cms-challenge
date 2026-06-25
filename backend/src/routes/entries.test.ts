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

async function createCarContentType() {
  const res = await request(app)
    .post('/api/content-types')
    .send({
      name: 'Car',
      fields: [
        { id: 'f1', name: 'brand', type: 'text', required: true },
        { id: 'f2', name: 'year', type: 'number', required: false },
      ],
    });
  return res.body;
}

describe('POST /api/content-types/:contentTypeId/entries', () => {
  it('creates an entry', async () => {
    const car = await createCarContentType();
    const res = await request(app)
      .post(`/api/content-types/${car.id}/entries`)
      .send({ data: { brand: 'Toyota', year: 2022 } });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ brand: 'Toyota', year: 2022 });
  });

  it('emits an entry:created event', async () => {
    const car = await createCarContentType();
    const eventPromise = waitForEvent('entry:created');
    const res = await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });
    expect(await eventPromise).toEqual({ contentTypeId: car.id, entryId: res.body.id });
  });

  it('returns 400 with field errors for invalid data', async () => {
    const car = await createCarContentType();
    const res = await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: {} });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ field: 'brand', reason: 'required' }]);
  });

  it('returns 404 for an unknown content type', async () => {
    const res = await request(app)
      .post('/api/content-types/00000000-0000-0000-0000-000000000000/entries')
      .send({ data: {} });
    expect(res.status).toBe(404);
  });

  it('returns 400 when a reference field points to a non-existent entry', async () => {
    const person = await request(app).post('/api/content-types').send({ name: 'Person', fields: [] });
    const car = await request(app)
      .post('/api/content-types')
      .send({
        name: 'Car',
        fields: [{ id: 'f1', name: 'owner', type: 'reference', required: false, referenceContentTypeId: person.body.id }],
      });

    const res = await request(app)
      .post(`/api/content-types/${car.body.id}/entries`)
      .send({ data: { owner: '00000000-0000-0000-0000-000000000000' } });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ field: 'owner', reason: 'reference' }]);
  });
});

describe('GET /api/content-types/:contentTypeId/entries', () => {
  it('lists entries annotated with validity', async () => {
    const car = await createCarContentType();
    await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });

    const res = await request(app).get(`/api/content-types/${car.id}/entries`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].isValid).toBe(true);
  });
});

describe('GET /api/content-types/:contentTypeId/entries/:id', () => {
  it('returns 404 for an unknown entry', async () => {
    const car = await createCarContentType();
    const res = await request(app).get(`/api/content-types/${car.id}/entries/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/content-types/:contentTypeId/entries/:id', () => {
  it('updates an entry', async () => {
    const car = await createCarContentType();
    const created = await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });

    const res = await request(app)
      .patch(`/api/content-types/${car.id}/entries/${created.body.id}`)
      .send({ data: { brand: 'Honda' } });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ brand: 'Honda' });
  });

  it('emits an entry:updated event', async () => {
    const car = await createCarContentType();
    const created = await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });

    const eventPromise = waitForEvent('entry:updated');
    await request(app).patch(`/api/content-types/${car.id}/entries/${created.body.id}`).send({ data: { brand: 'Honda' } });
    expect(await eventPromise).toEqual({ contentTypeId: car.id, entryId: created.body.id });
  });

  it('returns 400 with field errors for invalid data', async () => {
    const car = await createCarContentType();
    const created = await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });

    const res = await request(app)
      .patch(`/api/content-types/${car.id}/entries/${created.body.id}`)
      .send({ data: {} });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/content-types/:contentTypeId/entries/:id', () => {
  it('deletes an entry', async () => {
    const car = await createCarContentType();
    const created = await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });

    const res = await request(app).delete(`/api/content-types/${car.id}/entries/${created.body.id}`);

    expect(res.status).toBe(204);
  });

  it('emits an entry:deleted event', async () => {
    const car = await createCarContentType();
    const created = await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });

    const eventPromise = waitForEvent('entry:deleted');
    await request(app).delete(`/api/content-types/${car.id}/entries/${created.body.id}`);
    expect(await eventPromise).toEqual({ contentTypeId: car.id, entryId: created.body.id });
  });

  it('returns 404 for an unknown entry', async () => {
    const car = await createCarContentType();
    const res = await request(app).delete(`/api/content-types/${car.id}/entries/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });
});
