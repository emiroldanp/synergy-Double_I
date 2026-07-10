import { Page } from '@playwright/test'

export const PRODUCT_SLUG = 'charizard-holo-base-set'
export const PRODUCT_SLUG_2 = 'pikachu-promo'

export async function addProductToCart(page: Page, slug = PRODUCT_SLUG) {
  await page.goto(`/catalogo/${slug}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /agregar al carrito/i }).click()
}

export async function fillCheckoutStep1(page: Page, data = {
  name: 'Juan Prueba',
  email: 'test@doubleicards.com',
  phone: '5512345678',
}) {
  await page.getByLabel(/nombre/i).fill(data.name)
  await page.getByLabel(/email/i).fill(data.email)
  await page.getByLabel(/teléfono/i).fill(data.phone)
  await page.getByRole('button', { name: /continuar|siguiente/i }).click()
}

export async function fillCheckoutStep2(page: Page, data = {
  street: 'Av. Insurgentes',
  number: '1234',
  colonia: 'Del Valle',
  city: 'Ciudad de México',
  state: 'CDMX',
  zip: '03100',
}) {
  await page.getByLabel(/calle/i).fill(data.street)
  await page.getByLabel(/número/i).fill(data.number)
  await page.getByLabel(/colonia/i).fill(data.colonia)
  await page.getByLabel(/ciudad/i).fill(data.city)
  await page.getByLabel(/estado/i).fill(data.state)
  await page.getByLabel(/código postal|cp/i).fill(data.zip)
  await page.getByRole('button', { name: /continuar|siguiente/i }).click()
}

export async function loginAsAdmin(page: Page) {
  await page.goto('/admin')
  await page.waitForURL('**/admin**')
}
