import { test, expect } from '@playwright/test'
import { PRODUCT_SLUG } from './helpers'

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'catalogo', path: '/catalogo' },
  { name: 'producto-detalle', path: `/catalogo/${PRODUCT_SLUG}` },
  { name: 'carrito-vacio', path: '/carrito' },
  { name: 'blog-listado', path: '/blog' },
]

for (const { name, path } of pages) {
  test(`screenshot ${name}`, async ({ page }, testInfo) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    // Sin overflow horizontal
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    expect(overflow, `Overflow horizontal en ${name}`).toBe(false)

    // Navbar visible
    const navbar = page.locator('nav, header').first()
    await expect(navbar).toBeVisible()

    // Footer con MadeBy
    await expect(page.getByText(/made by/i)).toBeVisible()

    await page.screenshot({
      path: `tests/ui/screenshots/${name}-${testInfo.project.name}.png`,
      fullPage: true,
    })
  })
}

test('screenshot carrito con producto', async ({ page }, testInfo) => {
  await page.goto(`/catalogo/${PRODUCT_SLUG}`)
  await page.waitForLoadState('networkidle')

  // El botón solo existe si el backend está corriendo y tiene el producto con stock
  const addBtn = page.getByRole('button', { name: /agregar al carrito/i })
  const btnVisible = await addBtn.isVisible({ timeout: 5000 }).catch(() => false)
  if (btnVisible) {
    await addBtn.click()
  }

  await page.goto('/carrito')
  await page.waitForLoadState('networkidle')

  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
  expect(overflow, 'Overflow horizontal en carrito').toBe(false)

  await page.screenshot({
    path: `tests/ui/screenshots/carrito-con-producto-${testInfo.project.name}.png`,
    fullPage: true,
  })
})

test('screenshot checkout paso 1', async ({ page }, testInfo) => {
  await page.goto(`/catalogo/${PRODUCT_SLUG}`)
  await page.waitForLoadState('networkidle')

  // El botón solo existe si el backend está corriendo y tiene el producto con stock
  const addBtn = page.getByRole('button', { name: /agregar al carrito/i })
  const btnVisible = await addBtn.isVisible({ timeout: 5000 }).catch(() => false)
  if (btnVisible) {
    await addBtn.click()
  }

  await page.goto('/checkout')
  await page.waitForLoadState('networkidle')

  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
  expect(overflow, 'Overflow horizontal en checkout').toBe(false)

  await expect(page.locator('nav, header').first()).toBeVisible()

  await page.screenshot({
    path: `tests/ui/screenshots/checkout-paso1-${testInfo.project.name}.png`,
    fullPage: true,
  })
})

test('screenshot admin sin sesión — redirige o muestra login', async ({ page }, testInfo) => {
  await page.goto('/admin')
  await page.waitForLoadState('networkidle')
  await page.screenshot({
    path: `tests/ui/screenshots/admin-sin-sesion-${testInfo.project.name}.png`,
    fullPage: true,
  })
})
