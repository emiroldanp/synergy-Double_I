import { test, expect } from '@playwright/test'
import { PRODUCT_SLUG } from './helpers'

// Tests que requieren backend: el checkout necesita un producto en el carrito.
// Cuando el backend no está disponible, "Agregar al carrito" no aparece y los tests se skipean.

let backendAvailable = false

test.describe('Checkout — validaciones y flujo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/catalogo/${PRODUCT_SLUG}`)
    await page.waitForLoadState('networkidle')

    const btn = page.getByRole('button', { name: /agregar al carrito/i })
    backendAvailable = await btn.isVisible({ timeout: 5000 }).catch(() => false)

    if (!backendAvailable) {
      return // el test individual decidirá si se skipea
    }
    await btn.click()
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')
  })

  test('F13: checkout carga correctamente con el producto en el carrito', async ({ page }) => {
    if (!backendAvailable) { test.skip(); return }
    expect(page.url()).toContain('/checkout')
    const productName = page.getByText(/charizard/i).first()
    await expect(productName).toBeVisible()
  })

  test('F14: avanzar sin llenar campos muestra errores de validación', async ({ page }) => {
    if (!backendAvailable) { test.skip(); return }
    const continuar = page.getByRole('button', { name: /continuar|siguiente/i }).first()
    await continuar.click()
    const errorMsg = page.locator('[data-error], .error-message, [role="alert"], p.text-red-500').first()
    await expect(errorMsg).toBeVisible()
  })

  test('F15: email inválido muestra error específico', async ({ page }) => {
    if (!backendAvailable) { test.skip(); return }
    const emailInput = page.getByLabel(/email/i)
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('no-es-email')
      await page.getByRole('button', { name: /continuar|siguiente/i }).click()
      const emailError = page.getByText(/email inválido|correo inválido|email válido/i).first()
      await expect(emailError).toBeVisible()
    }
  })

  test('F16: sin overflow horizontal en checkout (mobile)', async ({ page }) => {
    if (!backendAvailable) { test.skip(); return }
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    expect(overflow, 'Overflow horizontal en checkout').toBe(false)
  })

  test('F17: carrito vacío vía localStorage redirige o muestra aviso', async ({ page }) => {
    // Este test no requiere backend — solo prueba el comportamiento del frontend
    await page.evaluate(() => localStorage.clear())
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')

    const isRedirected = !page.url().includes('/checkout')
    const hasEmptyMessage = await page.getByText(/Tu carrito está vacío|carrito vacío|sin productos/i).first().isVisible().catch(() => false)
    expect(isRedirected || hasEmptyMessage, 'Debe redirigir o mostrar carrito vacío').toBe(true)
  })
})
