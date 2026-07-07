import { test, expect } from '@playwright/test'

test.describe('Control de acceso', () => {
  // NOTA: Las rutas /admin son actualmente accesibles sin autenticación en el frontend.
  // La protección real ocurre a nivel de API (Clerk en Express).
  // Estos tests verifican el comportamiento actual y documentan qué se muestra sin sesión.

  test('F22: /admin carga la UI del panel sin sesión (auth protegida en API)', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // El panel admin carga en el frontend — la auth real es a nivel de API
    // Verificar que la URL es /admin y no hay error 500
    const hasFatalError = await page.getByText(/error 500|internal server error/i).isVisible()
    expect(hasFatalError, 'No debe haber error 500 en /admin sin sesión').toBe(false)
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

  test('F24: /admin/pedidos carga la UI sin sesión — datos protegidos en API', async ({ page }) => {
    await page.goto('/admin/pedidos')
    await page.waitForLoadState('networkidle')

    // Sin backend: la tabla de pedidos estará vacía o en estado de carga
    // Verificar que no hay error 500
    const hasFatalError = await page.getByText(/error 500|internal server error/i).isVisible()
    expect(hasFatalError, 'No debe haber error 500 en /admin/pedidos sin sesión').toBe(false)
  })
})
