import request from 'supertest';
import { createApp } from '../app';
import { pool } from '../db';
import { resetDb } from '../testUtils/resetDb';

const app = createApp();

beforeEach(resetDb);
afterAll(() => pool.end());

async function createCarContentType() {
  const res = await request(app)
    .post('/api/content-types')
    .send({ name: 'Car', fields: [{ id: 'f1', name: 'brand', type: 'text', required: true }] });
  return res.body;
}

describe('GET /api/content/:type', () => {
  it('lists entries for the content type with the given slug', async () => {
    const car = await createCarContentType();
    await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });

    const res = await request(app).get('/api/content/car');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].data).toEqual({ brand: 'Toyota' });
  });

  it('does not leak admin-only fields like isValid or errors', async () => {
    const car = await createCarContentType();
    await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });

    const res = await request(app).get('/api/content/car');

    expect(res.body[0]).not.toHaveProperty('isValid');
    expect(res.body[0]).not.toHaveProperty('errors');
    expect(res.body[0]).toEqual({ id: expect.any(String), data: { brand: 'Toyota' }, createdAt: expect.any(String), updatedAt: expect.any(String) });
  });

  it('returns 404 for an unknown content type slug', async () => {
    const res = await request(app).get('/api/content/unknown-type');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/content/:type/:id', () => {
  it('returns a single entry', async () => {
    const car = await createCarContentType();
    const entry = await request(app).post(`/api/content-types/${car.id}/entries`).send({ data: { brand: 'Toyota' } });

    const res = await request(app).get(`/api/content/car/${entry.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ brand: 'Toyota' });
  });

  it('returns 404 for an unknown content type slug', async () => {
    const res = await request(app).get('/api/content/unknown-type/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown entry id', async () => {
    await createCarContentType();
    const res = await request(app).get('/api/content/car/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
