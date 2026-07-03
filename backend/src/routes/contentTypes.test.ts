import request from 'supertest'
import { app } from '../app'
import { pool } from '../db'

beforeEach(async () => {
  await pool.query('DELETE FROM fields')
  await pool.query('DELETE FROM content_types')
})

afterAll(async () => {
  await pool.end()
})

describe('POST /api/content-types', () => {
  it('creates a content type and returns 201', async () => {
    const res = await request(app)
      .post('/api/content-types')
      .send({
        name: 'Article',
        fields: [
          { name: 'Title', type: 'text', required: true, position: 0 },
          { name: 'Body', type: 'text', required: false, position: 1 },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Article')
    expect(res.body.slug).toBe('article')
    expect(res.body.fields).toHaveLength(2)
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/content-types')
      .send({ fields: [{ name: 'Title', type: 'text', required: true, position: 0 }] })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/i)
  })

  it('returns 400 when fields array is empty', async () => {
    const res = await request(app)
      .post('/api/content-types')
      .send({ name: 'Empty', fields: [] })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/field/i)
  })

  it('returns 409 when name already exists', async () => {
    const payload = {
      name: 'Car',
      fields: [{ name: 'Brand', type: 'text', required: true, position: 0 }],
    }
    await request(app).post('/api/content-types').send(payload)
    const res = await request(app).post('/api/content-types').send(payload)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already exists/i)
  })
})

describe('GET /api/content-types', () => {
  it('returns an empty list initially', async () => {
    const res = await request(app).get('/api/content-types')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns created content types with field count', async () => {
    await request(app)
      .post('/api/content-types')
      .send({
        name: 'Author',
        fields: [
          { name: 'Name', type: 'text', required: true, position: 0 },
          { name: 'Bio', type: 'text', required: false, position: 1 },
        ],
      })

    const res = await request(app).get('/api/content-types')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Author')
    expect(res.body[0].fieldCount).toBe(2)
  })
})
