import { test, expect } from '@playwright/test'

const API = 'http://localhost:4000/api'
const ts = Date.now() + 100
const CT_NAME = `BlogPost ${ts}`
const CT_SLUG = `blogpost-${ts}`

test.beforeAll(async ({ request }) => {
  await request.post(`${API}/content-types`, {
    data: {
      name: CT_NAME,
      fields: [
        { name: 'Title', type: 'text', required: true, position: 0 },
        { name: 'Views', type: 'number', required: false, position: 1 },
      ],
    },
  })
})

test.afterAll(async ({ request }) => {
  await request.delete(`${API}/content-types/${CT_SLUG}`).catch(() => {})
})

test('shows empty state when no entries exist', async ({ page }) => {
  await page.goto(`/${CT_SLUG}/entries`)
  await expect(page.locator('text=No entries yet')).toBeVisible()
})

test('creates an entry via UI', async ({ page }) => {
  await page.goto(`/${CT_SLUG}/entries`)
  await page.click('text=+ New entry')

  await expect(page).toHaveURL(`/${CT_SLUG}/entries/new`)
  await page.fill('#field-Title', 'My First Post')
  await page.fill('#field-Views', '42')

  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(`/${CT_SLUG}/entries`)
  await expect(page.locator('text=My First Post')).toBeVisible()
})

test('shows entry count in header', async ({ page }) => {
  await page.goto(`/${CT_SLUG}/entries`)
  await expect(page.locator('text=1 entry')).toBeVisible()
})

test('shows valid badge for a complete entry', async ({ page }) => {
  await page.goto(`/${CT_SLUG}/entries`)
  await expect(page.locator('text=Valid')).toBeVisible()
})

test('edits an entry via UI', async ({ page }) => {
  await page.goto(`/${CT_SLUG}/entries`)

  const row = page.locator('tr:has-text("My First Post")')
  await row.locator('text=Edit').click()

  await page.fill('#field-Title', 'Updated Post Title')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(`/${CT_SLUG}/entries`)
  await expect(page.locator('text=Updated Post Title')).toBeVisible()
  await expect(page.locator('text=My First Post')).not.toBeVisible()
})

test('deletes an entry via UI', async ({ page }) => {
  await page.goto(`/${CT_SLUG}/entries`)
  page.on('dialog', dialog => dialog.accept())

  const row = page.locator('tr:has-text("Updated Post Title")')
  await row.locator('[aria-label="Delete"]').click()

  await expect(page.locator('text=Updated Post Title')).not.toBeVisible()
  await expect(page.locator('text=No entries yet')).toBeVisible()
})
