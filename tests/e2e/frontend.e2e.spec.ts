import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('root redirects to default locale (fr)', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveURL(/\/fr/)
  })

  test('homepage shows C2I2A branding in French', async ({ page }) => {
    await page.goto('http://localhost:3000/fr')
    await expect(page.locator('h1').first()).toContainText('C2I2A')
    await expect(page.getByText(/HEEC/i).first()).toBeVisible()
  })

  test('homepage shows English translations', async ({ page }) => {
    await page.goto('http://localhost:3000/en')
    await expect(page.locator('h1').first()).toContainText('C2I2A')
    await expect(page.getByText(/Register/i).first()).toBeVisible()
  })
})
