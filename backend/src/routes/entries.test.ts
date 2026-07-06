import request from 'supertest'
import { app } from '../app'
import { prisma } from '../db'
import { getIo } from '../socket'

jest.mock('../socket', () => ({
  getIo: jest.fn(),
  initIo: jest.fn(),
}))

let mockEmit: jest.Mock

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
  mockEmit = jest.fn()
  jest.mocked(getIo).mockReturnValue({ emit: mockEmit } as any)
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

describe('GET /api/content-types/:slug/entries/:id', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await request(app).get('/api/content-types/ghost/entries/1')
    expect(res.status).toBe(404)
  })

  it('returns 404 for unknown entry id', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app).get('/api/content-types/car/entries/99999')
    expect(res.status).toBe(404)
  })

  it('returns the entry with isValid', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const created = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Toyota', Year: 2020 } })
    const res = await request(app).get(`/api/content-types/car/entries/${created.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.Brand).toBe('Toyota')
    expect(res.body.isValid).toBe(true)
  })
})

describe('PUT /api/content-types/:slug/entries/:id', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await request(app)
      .put('/api/content-types/ghost/entries/1')
      .send({ data: { Brand: 'X' } })
    expect(res.status).toBe(404)
  })

  it('returns 404 for unknown entry id', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app)
      .put('/api/content-types/car/entries/99999')
      .send({ data: { Brand: 'X' } })
    expect(res.status).toBe(404)
  })

  it('returns 400 when data is missing', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const created = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Toyota' } })
    const res = await request(app)
      .put(`/api/content-types/car/entries/${created.body.id}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it('updates the entry and returns 200 with isValid', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const created = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Toyota' } })
    mockEmit.mockClear()
    const res = await request(app)
      .put(`/api/content-types/car/entries/${created.body.id}`)
      .send({ data: { Brand: 'Honda', Year: 2022 } })
    expect(res.status).toBe(200)
    expect(res.body.data.Brand).toBe('Honda')
    expect(res.body.isValid).toBe(true)
    expect(mockEmit).toHaveBeenCalledWith('entry:updated', expect.objectContaining({ slug: 'car' }))
  })
})

describe('DELETE /api/content-types/:slug/entries/:id', () => {
  it('returns 404 for unknown slug', async () => {
    const res = await request(app).delete('/api/content-types/ghost/entries/1')
    expect(res.status).toBe(404)
  })

  it('returns 404 for unknown entry id', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app).delete('/api/content-types/car/entries/99999')
    expect(res.status).toBe(404)
  })

  it('deletes the entry and returns 204', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const created = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Toyota' } })
    mockEmit.mockClear()
    const res = await request(app).delete(`/api/content-types/car/entries/${created.body.id}`)
    expect(res.status).toBe(204)
    const check = await request(app).get(`/api/content-types/car/entries/${created.body.id}`)
    expect(check.status).toBe(404)
    expect(mockEmit).toHaveBeenCalledWith('entry:deleted', expect.objectContaining({ slug: 'car' }))
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
    mockEmit.mockClear()
    const res = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Tesla', Year: 2023 } })
    expect(res.status).toBe(201)
    expect(res.body.data.Brand).toBe('Tesla')
    expect(res.body.isValid).toBe(true)
    expect(mockEmit).toHaveBeenCalledWith('entry:created', expect.objectContaining({ slug: 'car' }))
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
