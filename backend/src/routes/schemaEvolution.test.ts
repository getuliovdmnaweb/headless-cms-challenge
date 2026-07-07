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
    { name: 'Year', type: 'text', required: false, position: 1 },
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

describe('POST /api/content-types/:slug/preview', () => {
  it('returns 400 when fields array is missing', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app).post('/api/content-types/car/preview').send({})
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown slug', async () => {
    const res = await request(app)
      .post('/api/content-types/ghost/preview')
      .send({ fields: [] })
    expect(res.status).toBe(404)
  })

  it('returns ImpactPreview with empty changes for safe-only edits', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app)
      .post('/api/content-types/car/preview')
      .send({
        fields: [
          { name: 'Brand', type: 'text', required: true, position: 0 },
          { name: 'Year', type: 'text', required: false, position: 1 },
          { name: 'Color', type: 'text', required: false, position: 2 },
        ],
      })
    expect(res.status).toBe(200)
    expect(res.body.changes).toEqual([])
    expect(res.body.totalAffected).toBe(0)
    expect(res.body.unconvertible).toBe(0)
  })

  it('reports risky type change and affected entry counts', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    await request(app).post('/api/content-types/car/entries').send({ data: { Brand: 'Toyota', Year: '2020' } })
    await request(app).post('/api/content-types/car/entries').send({ data: { Brand: 'Ford', Year: 'oops' } })
    await request(app).post('/api/content-types/car/entries').send({ data: { Brand: 'BMW' } })

    const res = await request(app)
      .post('/api/content-types/car/preview')
      .send({
        fields: [
          { name: 'Brand', type: 'text', required: true, position: 0 },
          { name: 'Year', type: 'number', required: false, position: 1 },
        ],
      })
    expect(res.status).toBe(200)
    expect(res.body.changes).toContainEqual(
      expect.objectContaining({ kind: 'type_change', fieldName: 'Year', from: 'text', to: 'number' })
    )
    expect(res.body.totalAffected).toBe(2)
    expect(res.body.unconvertible).toBe(1)
  })

  it('reports field deletion', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    await request(app).post('/api/content-types/car/entries').send({ data: { Brand: 'Toyota', Year: '2020' } })

    const res = await request(app)
      .post('/api/content-types/car/preview')
      .send({ fields: [{ name: 'Brand', type: 'text', required: true, position: 0 }] })
    expect(res.status).toBe(200)
    expect(res.body.changes).toContainEqual({ kind: 'field_deleted', fieldName: 'Year' })
    expect(res.body.totalAffected).toBe(1)
  })
})

describe('POST /api/content-types/:slug/commit', () => {
  it('returns 400 when fields is missing', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app)
      .post('/api/content-types/car/commit')
      .send({ version: 1, fallback: {} })
    expect(res.status).toBe(400)
  })

  it('returns 400 when version is missing', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app)
      .post('/api/content-types/car/commit')
      .send({ fields: carPayload.fields, fallback: {} })
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown slug', async () => {
    const res = await request(app)
      .post('/api/content-types/ghost/commit')
      .send({ fields: carPayload.fields, version: 1, fallback: {} })
    expect(res.status).toBe(404)
  })

  it('returns 409 when version is stale', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app)
      .post('/api/content-types/car/commit')
      .send({ fields: carPayload.fields, version: 0, fallback: {} })
    expect(res.status).toBe(409)
  })

  it('applies safe field addition and returns updated CT with incremented version', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const res = await request(app)
      .post('/api/content-types/car/commit')
      .send({
        fields: [
          { name: 'Brand', type: 'text', required: true, position: 0 },
          { name: 'Year', type: 'text', required: false, position: 1 },
          { name: 'Color', type: 'text', required: false, position: 2 },
        ],
        version: 1,
        fallback: {},
      })
    expect(res.status).toBe(200)
    expect(res.body.version).toBe(2)
    expect(res.body.fields).toHaveLength(3)
  })

  it('migrates entry data on text → number type change', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const created = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Toyota', Year: '2020' } })

    await request(app)
      .post('/api/content-types/car/commit')
      .send({
        fields: [
          { name: 'Brand', type: 'text', required: true, position: 0 },
          { name: 'Year', type: 'number', required: false, position: 1 },
        ],
        version: 1,
        fallback: {},
      })

    const entry = await prisma.entry.findUnique({ where: { id: created.body.id } })
    expect((entry!.data as any).Year).toBe(2020)
  })

  it('nulls out field value when conversion fails and no fallback provided', async () => {
    await request(app).post('/api/content-types').send(carPayload)
    const created = await request(app)
      .post('/api/content-types/car/entries')
      .send({ data: { Brand: 'Toyota', Year: 'abc' } })

    await request(app)
      .post('/api/content-types/car/commit')
      .send({
        fields: [
          { name: 'Brand', type: 'text', required: true, position: 0 },
          { name: 'Year', type: 'number', required: false, position: 1 },
        ],
        version: 1,
        fallback: {},
      })

    const entry = await prisma.entry.findUnique({ where: { id: created.body.id } })
    expect((entry!.data as any).Year).toBeNull()
  })
})
