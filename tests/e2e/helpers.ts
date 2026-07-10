import { Page, expect } from '@playwright/test'

export const SANDBOX_CARD = {
  number: '4013 1735 9472 5704',
  expiry: '11/25',
  cvv: '123',
  name: 'TEST USER',
}

export const REJECTED_CARD = {
  number: '4000 0000 0000 0002',
  expiry: '11/25',
  cvv: '123',
  name: 'TEST REJECTED',
}

export const CHECKOUT_DATA = {
  name: 'Test E2E',
  email: 'test-e2e@doubleicards.com',
  phone: '5512345678',
  street: 'Av. Insurgentes Sur',
  number: '1234',
  colonia: 'Del Valle',
  city: 'Ciudad de México',
  state: 'Ciudad de México',
  zip: '03100',
}

// Obtiene el slug del primer producto disponible en el catálogo
export async function getFirstProductSlug(page: Page): Promise<string | null> {
  await page.goto('/catalogo')
  await page.waitForLoadState('networkidle')

  // Buscar el primer enlace a un producto dentro del main (excluye links del navbar)
  const productLink = page.locator('main a[href*="/catalogo/"], [data-product-card] a[href*="/catalogo/"]').first()
  if (!(await productLink.isVisible({ timeout: 8000 }).catch(() => false))) return null

  const href = await productLink.getAttribute('href')
  if (!href) return null

  // Extraer slug: /catalogo/[slug]
  const parts = href.split('/catalogo/')
  return parts[1]?.split('/')[0] ?? null
}

// Agrega el primer producto disponible al carrito. Retorna el slug o null si no hay backend.
export async function addFirstProductToCart(page: Page): Promise<string | null> {
  const slug = await getFirstProductSlug(page)
  if (!slug) return null

  await page.goto(`/catalogo/${slug}`)
  await page.waitForLoadState('networkidle')

  const addBtn = page.getByRole('button', { name: /agregar al carrito/i })
  if (!(await addBtn.isVisible({ timeout: 6000 }).catch(() => false))) return null

  await addBtn.click()
  await page.waitForTimeout(500)
  return slug
}

// Rellena el paso 1 del checkout (datos personales)
export async function fillCheckoutPersonal(page: Page) {
  await page.getByLabel(/nombre/i).fill(CHECKOUT_DATA.name)
  await page.getByLabel(/email/i).fill(CHECKOUT_DATA.email)
  await page.getByLabel(/teléfono/i).fill(CHECKOUT_DATA.phone)
  await page.getByRole('button', { name: /continuar|siguiente/i }).first().click()
}

// Rellena el paso 2 del checkout (dirección)
export async function fillCheckoutAddress(page: Page) {
  await page.getByLabel(/calle/i).fill(CHECKOUT_DATA.street)
  await page.getByLabel(/número exterior|número/i).first().fill(CHECKOUT_DATA.number)
  await page.getByLabel(/colonia/i).fill(CHECKOUT_DATA.colonia)
  await page.getByLabel(/ciudad/i).fill(CHECKOUT_DATA.city)
  await page.getByLabel(/estado/i).fill(CHECKOUT_DATA.state)
  await page.getByLabel(/código postal|cp/i).fill(CHECKOUT_DATA.zip)
  await page.getByRole('button', { name: /continuar|siguiente/i }).first().click()
}

// Espera a que aparezcan las opciones de envío y selecciona la primera
export async function selectFirstShipping(page: Page): Promise<boolean> {
  const shippingOption = page.locator('[data-shipping-option], input[name*="shipping"], label[for*="shipping"]').first()
  const appeared = await shippingOption.isVisible({ timeout: 20000 }).catch(() => false)
  if (!appeared) return false
  await shippingOption.click()
  await page.getByRole('button', { name: /continuar|siguiente/i }).first().click()
  return true
}
