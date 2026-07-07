import request from 'supertest'
import { app } from '../app'
import { prisma } from '../db'
import { getIo } from '../socket'

jest.mock('../socket', () => ({ getIo: jest.fn(), initIo: jest.fn() }))

beforeAll(() => {
  jest.mocked(getIo).mockReturnValue({ emit: jest.fn() } as any)
})

const carPayload = {
  name: 'Car',
  fields: [
    { name: 'Brand', type: 'text', required: true, position: 0 },
    { name: 'Year', type: 'number', required: false, position: 1 },
  ],
}

beforeEach(async () => {
  await prisma.entry.deleteMany()
  await prisma.field.deleteMany()
  await prisma.contentType.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /api/content/:slug', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await request(app).get('/api/content/ghost')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('returns an empty array when no entries exist', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app).get('/api/content/car')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns all entries as a flat array with id, data, and isValid', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    await request(app).post('/api/content-types/car/entries').send({ data: { Brand: 'Toyota', Year: 2020 } })
    await request(app).post('/api/content-types/car/entries').send({ data: { Year: 2019 } })

    const res = await request(app).get('/api/content/car')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ id: expect.any(Number), data: { Brand: 'Toyota' }, isValid: true })
    expect(res.body[1]).toMatchObject({ id: expect.any(Number), data: { Year: 2019 }, isValid: false })
  })

  it('returns JSON with correct Content-Type header', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app).get('/api/content/car')
    expect(res.headers['content-type']).toMatch(/application\/json/)
  })
})

describe('GET /api/content/:slug/:id', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await request(app).get('/api/content/ghost/1')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('returns 404 for unknown entry id', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app).get('/api/content/car/99999')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('returns a single entry with id, data, and isValid', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const created = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Honda', Year: 2022 } })

    const res = await request(app).get(`/api/content/car/${created.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: created.body.id, data: { Brand: 'Honda', Year: 2022 }, isValid: true })
  })

  it('returns JSON with correct Content-Type header', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const created = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Honda' } })

    const res = await request(app).get(`/api/content/car/${created.body.id}`)
    expect(res.headers['content-type']).toMatch(/application\/json/)
  })
})
