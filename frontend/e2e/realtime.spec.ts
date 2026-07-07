import { test, expect } from '@playwright/test'

const API = 'http://localhost:4000/api'
const ts = Date.now() + 400
const CT_NAME = `Live ${ts}`
const CT_SLUG = `live-${ts}`

test.beforeAll(async ({ request }) => {
  await request.post(`${API}/content-types`, {
    data: {
      name: CT_NAME,
      fields: [{ name: 'Message', type: 'text', required: true, position: 0 }],
    },
  })
})

test.afterAll(async ({ request }) => {
  await request.delete(`${API}/content-types/${CT_SLUG}`).catch(() => {})
})

test('new entry created in one tab appears in another without refresh', async ({ browser }) => {
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  const page1 = await ctx1.newPage()
  const page2 = await ctx2.newPage()

  await page1.goto(`http://localhost:5173/${CT_SLUG}/entries`)
  await page2.goto(`http://localhost:5173/${CT_SLUG}/entries`)

  await expect(page1.locator('text=No entries yet')).toBeVisible()
  await expect(page2.locator('text=No entries yet')).toBeVisible()

  // Create an entry in page 1
  await page1.click('text=+ New entry')
  await page1.fill('#field-Message', 'Hello from tab 1')
  await page1.click('button[type="submit"]')
  await expect(page1).toHaveURL(`/${CT_SLUG}/entries`)

  // Page 2 should update automatically via Socket.IO
  await expect(page2.locator('text=Hello from tab 1')).toBeVisible({ timeout: 5000 })

  await ctx1.close()
  await ctx2.close()
})

test('deleted entry disappears in other tab without refresh', async ({ browser }) => {
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  const page1 = await ctx1.newPage()
  const page2 = await ctx2.newPage()

  // Both tabs open on the entry list
  await page1.goto(`http://localhost:5173/${CT_SLUG}/entries`)
  await page2.goto(`http://localhost:5173/${CT_SLUG}/entries`)

  await expect(page1.locator('text=Hello from tab 1')).toBeVisible()
  await expect(page2.locator('text=Hello from tab 1')).toBeVisible()

  // Delete from page 1
  page1.on('dialog', dialog => dialog.accept())
  await page1.locator('[aria-label="Delete"]').first().click()
  await expect(page1.locator('text=No entries yet')).toBeVisible()

  // Page 2 should reflect the deletion
  await expect(page2.locator('text=Hello from tab 1')).not.toBeVisible({ timeout: 5000 })

  await ctx1.close()
  await ctx2.close()
})

test('content type deleted in one tab redirects the other tab', async ({ browser }) => {
  const ts2 = Date.now() + 500
  const name2 = `Ephemeral ${ts2}`
  const slug2 = `ephemeral-${ts2}`

  const setup = await browser.newContext()
  const setupReq = await setup.newPage()
  await setupReq.request.post(`${API}/content-types`, {
    data: { name: name2, fields: [{ name: 'X', type: 'text', required: false, position: 0 }] },
  })
  await setup.close()

  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  const page1 = await ctx1.newPage()
  const page2 = await ctx2.newPage()

  await page1.goto(`http://localhost:5173/${slug2}/entries`)
  await page2.goto(`http://localhost:5173/${slug2}/entries`)

  // Delete the content type from the root list in page1
  await page1.goto('http://localhost:5173/')
  page1.on('dialog', dialog => dialog.accept())
  const row = page1.locator(`tr:has-text("${name2}")`)
  await row.locator(`[aria-label="Delete ${name2}"]`).click()

  // Page 2 (still on entries) should be redirected to root
  await expect(page2).toHaveURL('http://localhost:5173/', { timeout: 5000 })

  await ctx1.close()
  await ctx2.close()
})
