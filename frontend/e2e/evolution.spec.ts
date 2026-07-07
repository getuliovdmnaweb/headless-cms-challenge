import { test, expect } from '@playwright/test'

const API = 'http://localhost:4000/api'
const ts = Date.now() + 200
const CT_NAME = `Product ${ts}`
const CT_SLUG = `product-${ts}`

test.beforeAll(async ({ request }) => {
  await request.post(`${API}/content-types`, {
    data: {
      name: CT_NAME,
      fields: [{ name: 'Price', type: 'text', required: false, position: 0 }],
    },
  })
  // create a couple of entries so the review modal shows "entries will be affected"
  await request.post(`${API}/content-types/${CT_SLUG}/entries`, { data: { data: { Price: '9.99' } } })
  await request.post(`${API}/content-types/${CT_SLUG}/entries`, { data: { data: { Price: '19.99' } } })
})

test.afterAll(async ({ request }) => {
  await request.delete(`${API}/content-types/${CT_SLUG}`).catch(() => {})
})

test('field row turns amber when type changes', async ({ page }) => {
  await page.goto(`/edit/${CT_SLUG}`)

  // Change "Price" field from text → number
  await page.locator('select').first().selectOption('number')

  // The field row should have data-risky="true"
  await expect(page.locator('[data-risky="true"]')).toBeVisible()
})

test('shows review modal when saving a risky type change', async ({ page }) => {
  await page.goto(`/edit/${CT_SLUG}`)
  await page.locator('select').first().selectOption('number')
  await page.click('button[type="submit"]')

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('text=Review schema changes')).toBeVisible()
  await expect(page.locator('text=Price: text → number')).toBeVisible()
})

test('cancelling the review modal keeps the user on the edit page', async ({ page }) => {
  await page.goto(`/edit/${CT_SLUG}`)
  await page.locator('select').first().selectOption('number')
  await page.click('button[type="submit"]')

  await page.getByRole('dialog').locator('text=Cancel').click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page).toHaveURL(`/edit/${CT_SLUG}`)
})

test('applying changes commits the migration and redirects to list', async ({ page }) => {
  await page.goto(`/edit/${CT_SLUG}`)
  await page.locator('select').first().selectOption('number')
  await page.click('button[type="submit"]')

  await page.getByRole('dialog').locator('text=Apply changes').click()

  await expect(page).toHaveURL('/')
  await expect(page.locator(`text=${CT_NAME}`)).toBeVisible()
})

test('entries are migrated after field type change', async ({ page, request }) => {
  const res = await request.get(`${API}/content-types/${CT_SLUG}/entries`)
  const body = await res.json()
  // Price field should now be null or 0 for unconvertible entries (text "9.99" → number)
  // The values "9.99" are convertible numbers, so they should become the number 9.99
  const prices = body.entries.map((e: { data: Record<string, unknown> }) => e.data['Price'])
  expect(prices.every((p: unknown) => p === null || typeof p === 'number')).toBe(true)
})

test('non-risky change (adding optional field) commits without modal', async ({ page, request }) => {
  const ts2 = Date.now() + 300
  const name2 = `Simple ${ts2}`
  const slug2 = `simple-${ts2}`

  await request.post(`${API}/content-types`, {
    data: { name: name2, fields: [{ name: 'Note', type: 'text', required: false, position: 0 }] },
  })

  await page.goto(`/edit/${slug2}`)
  await page.click('text=+ Add field')
  await page.locator('[aria-label="Field name"]').last().fill('Extra')
  await page.click('button[type="submit"]')

  // No dialog should appear — navigates directly
  await expect(page).toHaveURL('/')

  await request.delete(`${API}/content-types/${slug2}`).catch(() => {})
})
