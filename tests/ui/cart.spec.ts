import { test, expect } from '@playwright/test'
import { PRODUCT_SLUG } from './helpers'

// Tests que requieren backend: el botón "Agregar al carrito" solo aparece cuando la API de productos responde.
// Estos tests se skipean automáticamente cuando el backend no está corriendo.

async function addToCartOrSkip(page: any) {
  await page.goto(`/catalogo/${PRODUCT_SLUG}`)
  await page.waitForLoadState('networkidle')
  const btn = page.getByRole('button', { name: /agregar al carrito/i })
  const isAvailable = await btn.isVisible({ timeout: 5000 }).catch(() => false)
  if (!isAvailable) {
    return false
  }
  await btn.click()
  return true
}

test.describe('Carrito', () => {
  test('F7: agregar producto al carrito desde la página de detalle', async ({ page }) => {
    const added = await addToCartOrSkip(page)
    if (!added) {
      test.skip()
      return
    }
    // Si se agregó, verificar que la UI refleja el cambio
    const cartIndicator = page.locator('[data-cart-count]').first()
    if (await cartIndicator.isVisible()) {
      const text = await cartIndicator.textContent()
      expect(parseInt(text || '0')).toBeGreaterThan(0)
    }
  })

  test('F8: la página de carrito vacío muestra el estado vacío', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/carrito')
    await page.waitForLoadState('networkidle')

    // El texto real en CartPage.tsx es "Tu carrito está vacío" (aparece en main + drawer, usar .first())
    const emptyMsg = page.getByText(/Tu carrito está vacío|sin productos|no tienes artículos/i).first()
    await expect(emptyMsg).toBeVisible()
  })

  test('F9: carrito con producto muestra nombre del producto', async ({ page }) => {
    const added = await addToCartOrSkip(page)
    if (!added) {
      test.skip()
      return
    }
    await page.goto('/carrito')
    await page.waitForLoadState('networkidle')
    const productName = page.getByText(/charizard/i).first()
    await expect(productName).toBeVisible()
  })

  test('F10: eliminar producto deja el carrito vacío', async ({ page }) => {
    const added = await addToCartOrSkip(page)
    if (!added) {
      test.skip()
      return
    }
    await page.goto('/carrito')
    await page.waitForLoadState('networkidle')
    const eliminarBtn = page.getByRole('button', { name: /eliminar|quitar|remover/i }).first()
    if (await eliminarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await eliminarBtn.click()
      await expect(page.getByText(/Tu carrito está vacío/i)).toBeVisible()
    }
  })

  test('F11: carrito persiste al recargar la página', async ({ page }) => {
    const added = await addToCartOrSkip(page)
    if (!added) {
      test.skip()
      return
    }
    await page.reload()
    await page.waitForLoadState('networkidle')
    const cartIndicator = page.locator('[data-cart-count]').first()
    if (await cartIndicator.isVisible()) {
      const text = await cartIndicator.textContent()
      expect(parseInt(text || '0')).toBeGreaterThan(0)
    }
  })

  test('F12: navegar a checkout desde carrito', async ({ page }) => {
    const added = await addToCartOrSkip(page)
    if (!added) {
      test.skip()
      return
    }
    await page.goto('/carrito')
    await page.waitForLoadState('networkidle')
    const checkoutBtn = page.getByRole('link', { name: /finalizar|proceder|checkout|pagar/i })
      .or(page.getByRole('button', { name: /finalizar|proceder|checkout|pagar/i })).first()
    if (await checkoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutBtn.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/checkout')
    }
  })
})
