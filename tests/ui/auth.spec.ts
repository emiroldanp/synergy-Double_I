import { test, expect } from '@playwright/test'

test.describe('Control de acceso', () => {
  test('F22: /admin sin sesión redirige a login o muestra pantalla Clerk', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // RequireAdmin redirige a /admin/login cuando no hay sesión activa
    const redirectedToLogin =
      page.url().includes('/admin/login') ||
      page.url().includes('/sign-in') ||
      page.url().includes('/login')

    const hasLoginUI =
      await page.getByLabel(/email/i).isVisible().catch(() => false) ||
      await page.locator('.cl-rootBox, [data-clerk-component]').isVisible().catch(() => false) ||
      await page.getByText(/inicia sesión|iniciar sesión|acceso admin/i).isVisible().catch(() => false)

    expect(redirectedToLogin || hasLoginUI,
      'Debe redirigir a login o mostrar UI de autenticación').toBe(true)
  })

  test('F23: /mi-cuenta sin sesión redirige a login de Clerk', async ({ page }) => {
    await page.goto('/mi-cuenta')
    await page.waitForLoadState('networkidle')

    const isRedirected = page.url().includes('/login') ||
      page.url().includes('/sign-in') ||
      !page.url().includes('/mi-cuenta')
    const hasLoginForm = await page.getByLabel(/email/i).isVisible()
    const isClerkPage = await page.locator('.cl-rootBox, [data-clerk-component]').isVisible()

    expect(isRedirected || hasLoginForm || isClerkPage,
      'Debe redirigir a login o mostrar componente Clerk').toBe(true)
  })

  test('F24: /admin/pedidos sin sesión redirige a login (no muestra datos)', async ({ page }) => {
    await page.goto('/admin/pedidos')
    await page.waitForLoadState('networkidle')

    // Igual que F22: RequireAdmin debe interceptar antes de renderizar el panel
    const redirectedToLogin =
      page.url().includes('/admin/login') ||
      page.url().includes('/sign-in') ||
      page.url().includes('/login')

    const hasLoginUI =
      await page.getByLabel(/email/i).isVisible().catch(() => false) ||
      await page.locator('.cl-rootBox, [data-clerk-component]').isVisible().catch(() => false) ||
      await page.getByText(/inicia sesión|iniciar sesión|acceso admin/i).isVisible().catch(() => false)

    expect(redirectedToLogin || hasLoginUI,
      'Debe redirigir a login sin exponer datos del panel').toBe(true)
  })
})
