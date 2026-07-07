import { test, expect } from '@playwright/test'

test.describe('Formulario de newsletter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('F25: formulario de newsletter está presente en la homepage', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').last()
    await expect(emailInput).toBeVisible()
  })

  test('F26: email inválido muestra error de validación', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').last()
    if (await emailInput.isVisible()) {
      await emailInput.fill('no-es-email')
      await emailInput.press('Enter')
      // Esperar un breve momento para que aparezca el error
      await page.waitForTimeout(500)
      const errorMsg = page.getByText(/email inválido|correo inválido|email válido|formato/i).first()
      if (!await errorMsg.isVisible()) {
        // Intentar el botón de suscripción si existe
        const btn = page.getByRole('button', { name: /suscribir|suscríbete/i }).first()
        if (await btn.isVisible()) {
          await btn.click()
          await expect(page.getByText(/email inválido|correo inválido/i)).toBeVisible()
        }
      } else {
        await expect(errorMsg).toBeVisible()
      }
    }
  })

  test('F27: footer está presente y visible en homepage', async ({ page }) => {
    const footer = page.locator('footer').first()
    await expect(footer).toBeVisible()
    await expect(page.getByText(/made by/i)).toBeVisible()
  })
})
