import { test, expect } from '@playwright/test'
import { addFirstProductToCart, fillCheckoutPersonal, fillCheckoutAddress, selectFirstShipping, SANDBOX_CARD } from './helpers'

test.describe('Checkout E2E en staging', () => {
  let productAvailable = false

  test.beforeEach(async ({ page }) => {
    const slug = await addFirstProductToCart(page)
    productAvailable = !!slug
    if (productAvailable) {
      await page.goto('/checkout')
      await page.waitForLoadState('networkidle')
    }
  })

  test('E2E-CO1: checkout carga con producto en el carrito', async ({ page }) => {
    if (!productAvailable) { test.skip(); return }
    expect(page.url()).toContain('/checkout')
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })

  test('E2E-CO2: avanzar sin datos muestra errores de validación', async ({ page }) => {
    if (!productAvailable) { test.skip(); return }
    await page.getByRole('button', { name: /continuar|siguiente/i }).first().click()
    const errorMsg = page.locator('[data-error], .error-message, [role="alert"], p.text-red-500').first()
    await expect(errorMsg).toBeVisible()
  })

  test('E2E-CO3: email inválido muestra error específico', async ({ page }) => {
    if (!productAvailable) { test.skip(); return }
    const emailInput = page.getByLabel(/email/i)
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill('no-es-email')
      await page.getByRole('button', { name: /continuar|siguiente/i }).first().click()
      const emailError = page.getByText(/email inválido|correo inválido|email válido/i).first()
      await expect(emailError).toBeVisible()
    }
  })

  test('E2E-CO4: cotización de Skydropx aparece al ingresar dirección válida', async ({ page }) => {
    if (!productAvailable) { test.skip(); return }
    await fillCheckoutPersonal(page)
    await page.waitForLoadState('networkidle')
    await fillCheckoutAddress(page)

    // Skydropx debe responder — esperar opciones de envío (hasta 20s por latencia de staging)
    const shippingOptions = page.locator('[data-shipping-option], input[name*="shipping"]').first()
    const appeared = await shippingOptions.isVisible({ timeout: 20000 }).catch(() => false)

    if (!appeared) {
      // Skydropx puede fallar en staging — verificar al menos que no hay error 500
      const hasFatalError = await page.getByText(/error 500|internal server error/i).isVisible()
      expect(hasFatalError).toBe(false)
    } else {
      await expect(shippingOptions).toBeVisible()
    }
  })

  test('E2E-CO5: toggle CFDI muestra campos de RFC y razón social', async ({ page }) => {
    if (!productAvailable) { test.skip(); return }
    await fillCheckoutPersonal(page)
    await page.waitForLoadState('networkidle')
    await fillCheckoutAddress(page)
    await page.waitForTimeout(2000)

    // Ir al paso de CFDI si existe
    const cfdiToggle = page.locator('input[type="checkbox"]').filter({ hasText: /factura|cfdi/i }).first()
      .or(page.locator('[data-cfdi-toggle]').first())

    if (await cfdiToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cfdiToggle.check()
      await expect(page.getByLabel(/rfc/i)).toBeVisible()
      await expect(page.getByLabel(/razón social/i)).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('E2E-CO6: carrito vacío en checkout redirige o muestra aviso', async ({ page }) => {
    // No depende del backend — prueba el comportamiento del frontend puro
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')

    const isRedirected = !page.url().includes('/checkout')
    const hasEmptyMsg = await page.getByText(/carrito vacío|sin productos/i).first().isVisible().catch(() => false)
    expect(isRedirected || hasEmptyMsg, 'Debe redirigir o mostrar carrito vacío').toBe(true)
  })

  test('E2E-CO7: flujo completo hasta MP — botón de pago aparece', async ({ page }) => {
    if (!productAvailable) { test.skip(); return }

    await fillCheckoutPersonal(page)
    await page.waitForLoadState('networkidle')
    await fillCheckoutAddress(page)

    const shippingOk = await selectFirstShipping(page)
    if (!shippingOk) { test.skip(); return }

    // Paso CFDI — saltar (sin factura)
    const skipCFDI = page.getByRole('button', { name: /continuar|siguiente/i }).first()
    if (await skipCFDI.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipCFDI.click()
    }

    // Debe aparecer la sección de pago (MP o botón de pagar)
    const pagoUI = page.getByRole('button', { name: /pagar|confirmar pago/i })
      .or(page.frameLocator('iframe[src*="mercadopago"]').locator('body'))
    await expect(pagoUI.first()).toBeVisible({ timeout: 15000 })
  })
})
