import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test.describe.configure({ timeout: 120_000 })
  test('root redirects to a locale-prefixed URL', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveURL(/\/(fr|en)$/)
  })

  test('homepage shows C2I2A branding in French', async ({ page }) => {
    await page.goto('http://localhost:3000/fr')
    await expect(page.locator('h1').first()).toContainText('C2I2A')
    await expect(page.locator('main')).toBeVisible()
  })

  test('homepage shows English translations', async ({ page }) => {
    await page.goto('http://localhost:3000/en')
    await expect(page.locator('h1').first()).toContainText('C2I2A')
    await expect(page.getByText(/Register/i).first()).toBeVisible()
  })

  test('core bilingual pages and metadata render', async ({ page }) => {
    for (const route of ['/about', '/access', '/contact', '/submission']) {
      const response = await page.goto(`http://localhost:3000/en${route}`)
      expect(response?.status()).toBeLessThan(500)
      await expect(page.locator('h1').first()).toBeVisible()
      await expect(page).toHaveTitle(/C2I2A/)
    }
  })

  test('mobile navigation opens, closes, and navigates', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('http://localhost:3000/en')
    await page.getByRole('button', { name: /menu/i }).click()
    await expect(page.getByRole('navigation').last()).toBeVisible()
    await page.locator('[role="dialog"] a[href$="/about"]').click()
    await expect(page).toHaveURL(/\/en\/about$/)
  })

  test('account requires authentication', async ({ page }) => {
    await page.goto('http://localhost:3000/en/account')
    await expect(page).toHaveURL(/\/en\/auth\/login$/)
  })

  test('robots and sitemap expose only public discovery routes', async ({ request }) => {
    const robots = await request.get('http://localhost:3000/robots.txt')
    expect(robots.ok()).toBe(true)
    const robotsText = await robots.text()
    expect(robotsText).toContain('Disallow: /admin/')
    expect(robotsText).toContain('Disallow: /*/auth/')

    const sitemap = await request.get('http://localhost:3000/sitemap.xml')
    expect(sitemap.ok()).toBe(true)
    const sitemapText = await sitemap.text()
    expect(sitemapText).toContain('/fr/about')
    expect(sitemapText).toContain('/en/about')
    expect(sitemapText).not.toContain('/admin')
  })
})
