import { test, expect } from '@playwright/test'

const API = 'http://localhost:4000/api'
const ts = Date.now()
const CT_NAME = `Article ${ts}`
const CT_SLUG = `article-${ts}`

async function createCT(request: Parameters<typeof test>[1] extends (args: { request: infer R }) => unknown ? R : never, name: string, fields = [{ name: 'Title', type: 'text', required: true, position: 0 }]) {
  return request.post(`${API}/content-types`, { data: { name, fields } })
}

test.afterAll(async ({ request }) => {
  await request.delete(`${API}/content-types/${CT_SLUG}`).catch(() => {})
})

test('creates a content type via UI', async ({ page }) => {
  await page.goto('/')
  await page.click('text=+ New content type')

  await page.fill('#ct-name', CT_NAME)
  await page.click('text=+ Add field')
  await page.locator('[aria-label="Field name"]').first().fill('Title')

  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/')
  await expect(page.locator(`text=${CT_NAME}`)).toBeVisible()
})

test('shows field count in the list', async ({ page }) => {
  await page.goto('/')
  const row = page.locator(`tr:has-text("${CT_NAME}")`)
  await expect(row.locator('text=1 field')).toBeVisible()
})

test('navigates to edit fields page', async ({ page }) => {
  await page.goto('/')
  const row = page.locator(`tr:has-text("${CT_NAME}")`)
  await row.locator('text=Edit fields').click()
  await expect(page).toHaveURL(`/edit/${CT_SLUG}`)
  await expect(page.locator('h1')).toContainText('Edit content type')
})

test('adds a field via edit fields page', async ({ page }) => {
  await page.goto(`/edit/${CT_SLUG}`)
  await page.click('text=+ Add field')

  const inputs = page.locator('[aria-label="Field name"]')
  await inputs.last().fill('Published')

  await page.locator('select').last().selectOption('boolean')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('/')
})

test('shows updated field count after edit', async ({ page }) => {
  await page.goto('/')
  const row = page.locator(`tr:has-text("${CT_NAME}")`)
  await expect(row.locator('text=2 fields')).toBeVisible()
})

test('navigates to entry list via "View content" link', async ({ page }) => {
  await page.goto('/')
  const row = page.locator(`tr:has-text("${CT_NAME}")`)
  await row.locator('text=View content').click()
  await expect(page).toHaveURL(`/${CT_SLUG}/entries`)
})

test('deletes a content type via UI', async ({ page }) => {
  const ts2 = Date.now() + 1
  const name2 = `ToDelete ${ts2}`
  const slug2 = `todelete-${ts2}`

  await page.request.post(`${API}/content-types`, {
    data: { name: name2, fields: [{ name: 'X', type: 'text', required: false, position: 0 }] },
  })

  await page.goto('/')
  page.on('dialog', dialog => dialog.accept())

  const row = page.locator(`tr:has-text("${name2}")`)
  await row.locator(`[aria-label="Delete ${name2}"]`).click()

  await expect(page.locator(`text=${name2}`)).not.toBeVisible()
  await page.request.delete(`${API}/content-types/${slug2}`).catch(() => {})
})
