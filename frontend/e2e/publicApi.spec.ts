import { test, expect } from '@playwright/test'

const API = 'http://localhost:4000/api'
const PUBLIC = 'http://localhost:4000/api/content'
const ts = Date.now() + 600
const CT_NAME = `News ${ts}`
const CT_SLUG = `news-${ts}`

let entryId: number

test.beforeAll(async ({ request }) => {
  await request.post(`${API}/content-types`, {
    data: {
      name: CT_NAME,
      fields: [
        { name: 'Headline', type: 'text', required: true, position: 0 },
        { name: 'Published', type: 'boolean', required: false, position: 1 },
      ],
    },
  })
  const res = await request.post(`${API}/content-types/${CT_SLUG}/entries`, {
    data: { data: { Headline: 'Breaking news', Published: true } },
  })
  const body = await res.json()
  entryId = body.id
})

test.afterAll(async ({ request }) => {
  await request.delete(`${API}/content-types/${CT_SLUG}`).catch(() => {})
})

test('GET /api/content/:slug returns a flat array of entries', async ({ request }) => {
  const res = await request.get(`${PUBLIC}/${CT_SLUG}`)
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
  expect(body).toHaveLength(1)
  expect(body[0].data.Headline).toBe('Breaking news')
})

test('GET /api/content/:slug entries have id, data, and isValid', async ({ request }) => {
  const res = await request.get(`${PUBLIC}/${CT_SLUG}`)
  const body = await res.json()
  const entry = body[0]
  expect(entry).toHaveProperty('id')
  expect(entry).toHaveProperty('data')
  expect(entry).toHaveProperty('isValid')
})

test('GET /api/content/:slug/:id returns a single entry', async ({ request }) => {
  const res = await request.get(`${PUBLIC}/${CT_SLUG}/${entryId}`)
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body.id).toBe(entryId)
  expect(body.data.Headline).toBe('Breaking news')
})

test('GET /api/content/:slug returns 404 for unknown slug', async ({ request }) => {
  const res = await request.get(`${PUBLIC}/does-not-exist-xyz`)
  expect(res.status()).toBe(404)
})

test('GET /api/content/:slug/:id returns 404 for unknown entry', async ({ request }) => {
  const res = await request.get(`${PUBLIC}/${CT_SLUG}/99999`)
  expect(res.status()).toBe(404)
})

test('public API response contains only entry fields — no schema metadata', async ({ request }) => {
  const res = await request.get(`${PUBLIC}/${CT_SLUG}`)
  const body = await res.json()
  const entry = body[0]
  const keys = Object.keys(entry)
  expect(keys).toContain('id')
  expect(keys).toContain('data')
  expect(keys).not.toContain('version')
  expect(keys).not.toContain('content_type_id')
})
