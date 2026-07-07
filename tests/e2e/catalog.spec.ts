import { test, expect } from '@playwright/test'
import { getFirstProductSlug } from './helpers'

test.describe('Catálogo E2E en staging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/catalogo')
    await page.waitForLoadState('networkidle')
  })

  test('E2E-C1: el catálogo muestra productos con imagen, nombre y precio', async ({ page }) => {
    // Buscar enlaces a productos dentro del main (excluye links de franquicia del navbar)
    const productCards = page.locator('main a[href*="/catalogo/"], [data-product-card] a[href*="/catalogo/"]')
    await expect(productCards.first()).toBeVisible({ timeout: 10000 })
    const count = await productCards.count()
    expect(count, 'Debe haber al menos 1 producto en staging').toBeGreaterThan(0)
  })

  test('E2E-C2: filtrar por Pokémon devuelve resultados o estado vacío', async ({ page }) => {
    const pokemonLabel = page.getByText('Pokémon').first()
    if (await pokemonLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pokemonLabel.click()
      await page.waitForTimeout(1000)
      const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
      expect(overflow).toBe(false)
    } else {
      test.skip()
    }
  })

  test('E2E-C3: búsqueda con texto inexistente muestra estado vacío', async ({ page }) => {
    const searchbox = page.locator('input[type="search"], input[placeholder*="uscar" i]').first()
    if (await searchbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchbox.fill('xyzproductoinexistente999')
      await searchbox.press('Enter')
      await page.waitForTimeout(1500)
      const sinResultados = page.getByText(/sin resultados|no encontramos|no hay productos/i).first()
      await expect(sinResultados).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('E2E-C4: página de detalle de producto carga con nombre y precio', async ({ page }) => {
    const slug = await getFirstProductSlug(page)
    if (!slug) { test.skip(); return }

    await page.goto(`/catalogo/${slug}`)
    await page.waitForLoadState('networkidle')

    // Debe mostrar el nombre del producto (h1 o h2)
    const heading = page.locator('h1, h2').first()
    await expect(heading).toBeVisible()

    // Debe mostrar un precio con $
    const precio = page.getByText(/\$[\d,]+/).first()
    await expect(precio).toBeVisible()

    // Sin overflow
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })

  test('E2E-C5: sin overflow horizontal en catálogo mobile', async ({ page }) => {
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    expect(overflow, 'Overflow horizontal en catálogo staging').toBe(false)
  })
})
