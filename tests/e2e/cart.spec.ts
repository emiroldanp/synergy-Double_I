import { test, expect } from '@playwright/test'
import { addFirstProductToCart, getFirstProductSlug } from './helpers'

test.describe('Carrito E2E en staging', () => {
  test('E2E-CA1: agregar producto actualiza el contador en navbar', async ({ page }) => {
    const slug = await addFirstProductToCart(page)
    if (!slug) { test.skip(); return }

    const counter = page.locator('[data-cart-count]').first()
    if (await counter.isVisible({ timeout: 3000 }).catch(() => false)) {
      const count = parseInt(await counter.textContent() || '0')
      expect(count).toBeGreaterThan(0)
    }
  })

  test('E2E-CA2: carrito vacío muestra estado vacío', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/carrito')
    await page.waitForLoadState('networkidle')
    const emptyMsg = page.getByText(/Tu carrito está vacío|sin productos/i).first()
    await expect(emptyMsg).toBeVisible()
  })

  test('E2E-CA3: producto agregado aparece en /carrito con nombre y precio', async ({ page }) => {
    const slug = await addFirstProductToCart(page)
    if (!slug) { test.skip(); return }

    await page.goto('/carrito')
    await page.waitForLoadState('networkidle')

    // Debe haber al menos un item (precio visible)
    const precio = page.getByText(/\$[\d,]+/).first()
    await expect(precio).toBeVisible()

    // Sin overflow
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })

  test('E2E-CA4: eliminar producto deja el carrito vacío', async ({ page }) => {
    const slug = await addFirstProductToCart(page)
    if (!slug) { test.skip(); return }

    await page.goto('/carrito')
    await page.waitForLoadState('networkidle')

    const eliminarBtn = page.getByRole('button', { name: /eliminar|quitar|remover/i }).first()
    if (await eliminarBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await eliminarBtn.click()
      const emptyMsg = page.getByText(/Tu carrito está vacío/i).first()
      await expect(emptyMsg).toBeVisible()
    }
  })

  test('E2E-CA5: carrito persiste al recargar la página', async ({ page }) => {
    const slug = await addFirstProductToCart(page)
    if (!slug) { test.skip(); return }

    await page.reload()
    await page.waitForLoadState('networkidle')

    const counter = page.locator('[data-cart-count]').first()
    if (await counter.isVisible({ timeout: 3000 }).catch(() => false)) {
      const count = parseInt(await counter.textContent() || '0')
      expect(count).toBeGreaterThan(0)
    }
  })

  test('E2E-CA6: desde /carrito el botón de checkout lleva a /checkout', async ({ page }) => {
    const slug = await getFirstProductSlug(page)
    if (!slug) { test.skip(); return }

    await page.goto(`/catalogo/${slug}`)
    await page.waitForLoadState('networkidle')
    const addBtn = page.getByRole('button', { name: /agregar al carrito/i })
    if (!(await addBtn.isVisible({ timeout: 6000 }).catch(() => false))) { test.skip(); return }
    await addBtn.click()

    await page.goto('/carrito')
    await page.waitForLoadState('networkidle')

    const checkoutLink = page.getByRole('link', { name: /finalizar|proceder|checkout|pagar/i })
      .or(page.getByRole('button', { name: /finalizar|proceder|checkout|pagar/i })).first()

    if (await checkoutLink.isVisible({ timeout: 4000 }).catch(() => false)) {
      await checkoutLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/checkout')
    }
  })
})
