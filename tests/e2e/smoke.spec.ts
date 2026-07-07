import { test, expect } from '@playwright/test'

const PAGES = [
  { name: 'Homepage', path: '/' },
  { name: 'Catálogo', path: '/catalogo' },
  { name: 'Carrito', path: '/carrito' },
  { name: 'Blog', path: '/blog' },
  { name: 'Contacto', path: '/contacto' },
]

test.describe('Smoke — páginas principales cargan en staging', () => {
  for (const { name, path } of PAGES) {
    test(`E2E-S${PAGES.indexOf(PAGES.find(p => p.path === path)!) + 1}: ${name} carga sin errores`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // Sin error fatal en pantalla
      const hasFatalError = await page.getByText(/error 500|internal server error|cannot read properties/i).isVisible()
      expect(hasFatalError, `Error fatal en ${name}`).toBe(false)

      // Sin overflow horizontal
      const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
      expect(overflow, `Overflow horizontal en ${name}`).toBe(false)

      // Navbar visible
      const navbar = page.locator('nav, header').first()
      await expect(navbar).toBeVisible()

      // Footer con MadeBy
      const madeBy = page.getByText(/made by/i)
      await expect(madeBy).toBeVisible()
    })
  }

  test('E2E-S6: /admin sin sesión redirige a login (SEC-001)', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    const redirectedToLogin =
      page.url().includes('/admin/login') ||
      page.url().includes('/sign-in') ||
      page.url().includes('/login')

    const hasLoginUI =
      await page.getByLabel(/email/i).isVisible().catch(() => false) ||
      await page.locator('.cl-rootBox, [data-clerk-component]').isVisible().catch(() => false)

    expect(redirectedToLogin || hasLoginUI,
      '/admin debe redirigir a login o mostrar Clerk').toBe(true)
  })

  test('E2E-S7: /mi-cuenta sin sesión redirige a Clerk', async ({ page }) => {
    await page.goto('/mi-cuenta')
    await page.waitForLoadState('networkidle')

    const isRedirected = !page.url().includes('/mi-cuenta') ||
      page.url().includes('/sign-in') ||
      page.url().includes('/login')

    const hasClerkUI =
      await page.getByLabel(/email/i).isVisible().catch(() => false) ||
      await page.locator('.cl-rootBox').isVisible().catch(() => false)

    expect(isRedirected || hasClerkUI, '/mi-cuenta debe redirigir a Clerk').toBe(true)
  })
})
