import request from 'supertest'
import { app } from '../app'
import { prisma } from '../db'

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

describe('GET /api/content-types/:slug/entries', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await request(app).get('/api/content-types/ghost/entries')
    expect(res.status).toBe(404)
  })

  it('returns contentType and empty entries array', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app).get('/api/content-types/car/entries')
    expect(res.status).toBe(200)
    expect(res.body.contentType.name).toBe('Car')
    expect(res.body.contentType.fields).toHaveLength(2)
    expect(res.body.entries).toEqual([])
  })

  it('returns entries with isValid computed', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Toyota', Year: 2020 } })
    await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Year: 2019 } })

    const res = await request(app).get('/api/content-types/car/entries')
    expect(res.status).toBe(200)
    expect(res.body.entries).toHaveLength(2)
    expect(res.body.entries[0].isValid).toBe(true)
    expect(res.body.entries[1].isValid).toBe(false)
  })
})

describe('POST /api/content-types/:slug/entries', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await request(app)
      .post('/api/content-types/ghost/entries')
      .send({ data: { Brand: 'Toyota' } })
    expect(res.status).toBe(404)
  })

  it('returns 400 when data is missing', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app).post('/api/content-types/car/entries').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/data/i)
  })

  it('creates entry and returns 201 with isValid', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Tesla', Year: 2023 } })
    expect(res.status).toBe(201)
    expect(res.body.data.Brand).toBe('Tesla')
    expect(res.body.isValid).toBe(true)
  })

  it('creates entry and marks it invalid when required field missing', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Year: 2022 } })
    expect(res.status).toBe(201)
    expect(res.body.isValid).toBe(false)
  })
})
