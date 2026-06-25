import request from 'supertest';
import { createApp } from '../app';
import { pool } from '../db';
import { resetDb } from '../testUtils/resetDb';

const app = createApp();

beforeEach(resetDb);
afterAll(() => pool.end());

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
});

describe('DELETE /api/content-types/:id', () => {
  it('deletes a content type', async () => {
    const created = await request(app).post('/api/content-types').send({ name: 'Car', fields: [] });
    const res = await request(app).delete(`/api/content-types/${created.body.id}`);
    expect(res.status).toBe(204);
    expect((await request(app).get(`/api/content-types/${created.body.id}`)).status).toBe(404);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/api/content-types/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
