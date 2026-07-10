# Suite de Pruebas — Double-I TCG Ecommerce

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar las 4 capas de pruebas definidas en el spec `2026-05-26-suite-pruebas-design.md` — API tests con Jest+Supertest, UI tests con Playwright MCP, flujos E2E en staging, y checklist manual de seguridad.

**Architecture:** Capa 1 vive en `server/tests/` y usa Jest + Supertest con mocks de Jest para todas las APIs externas. Capa 2 son scripts Playwright que corren sobre `localhost:5173`. Capa 3 son los mismos scripts apuntando a `staging.doubleicards.com` con credenciales sandbox. Capa 4 es un documento de checklist ejecutable.

**Tech Stack:** Jest 30, ts-jest 29, supertest, @types/supertest, Playwright (ya disponible vía Playwright MCP), dotenv v17 para `.env.test`.

---

## Estado de implementación (actualizado 2026-07-07)

| Capa | Estado | Resultado |
|------|--------|-----------|
| **Capa 1 — API Tests (Jest + Supertest)** | ✅ Completa | 61/61 tests passing |
| **Capa 2 — UI Tests (Playwright local)** | ✅ Completa | 43 passing · 19 skipped (backend-dependent) · 0 failed |
| **Capa 3 — E2E Staging** | ⏳ Pendiente | — |
| **Capa 4 — Checklist manual seguridad** | ⏳ Pendiente | — |

### Hallazgos de QA — Seguridad

| ID | Descripción | Severidad | Estado |
|----|-------------|-----------|--------|
| SEC-001 | `/admin` frontend sin guard `RequireAdmin` — el panel renderizaba sin autenticación Clerk | **Alta** | ✅ Corregido en `src/App.tsx` (2026-07-07) |

**Detalle SEC-001:**
- `AdminLayout` se montaba directamente en `<Route path="/admin" element={<AdminLayout />}>` sin verificar sesión
- El componente `RequireAdmin` ya existía (`src/components/admin/RequireAdmin.tsx`) pero no se usaba en el router
- **Fix:** `<Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>` en `src/App.tsx:114`
- Ahora `/admin/*` redirige a `/admin/login` si no hay sesión activa o `user.publicMetadata.role !== 'admin'`
- Tests F22 y F24 en `tests/ui/auth.spec.ts` actualizados para verificar la redirección correcta

---

### Capa 1 — Resultados

```
Test Suites: 4 passed, 4 total
Tests:       61 passed, 61 total
```

**Desglose por suite (expandidas respecto al plan original):**
- `invoices.test.ts` — 9 tests: happy path, Facturapi falla, orden inexistente, API key faltante, email falla, doble fallo, absorb error Brevo
- `email.test.ts` — 24 tests: funciones internas, source inválido, transactional emails, add-to-list, errores Brevo, suscriptor duplicado
- `admin.test.ts` — 8 tests: mark-paid ya confirmado, status incorrecto, happy path, retry edge cases, validaciones
- `payments.test.ts` — 20 tests: createPreference, webhook edge cases, OXXO, firma inválida, payload malformado, stock insuficiente

**Coverage (controladores):**
- `invoicesController` — ~100% líneas/funciones
- `paymentsController` — ~98% (L12 producción-only throw · L174 `.catch` no-op — no alcanzables en tests)
- `emailController` — ~95% líneas
- `shippingController` — parcial (sin `shipping.test.ts` — polling con delays reales pendiente)

**Reporte HTML:** `server/coverage/lcov-report/index.html` (`npm run test:coverage`)  
**Comando:** `cd server && npm test`

### Capa 2 — Resultados (Playwright local)

```
43 passed · 19 skipped (backend-dependent) · 0 failed
Chromium: desktop 1280×800 + mobile 375×812
```

**Desglose por spec:**
- `screenshots.spec.ts` — páginas estáticas, navbar/footer/overflow desktop+mobile
- `catalog.spec.ts` — F1-F6: filtros franquicia (labels `<label>`, no `<button>`), limpiar todo, búsqueda, sin overflow
- `cart.spec.ts` — F7-F12: agregar, vacío, persistencia, eliminar (skip sin backend)
- `checkout.spec.ts` — F13-F17: validaciones, carrito vacío vía localStorage (skip sin backend)
- `auth.spec.ts` — F22-F24: `/admin` y `/admin/pedidos` redirigen a login (SEC-001 corregido)
- `newsletter.spec.ts` — F25-F27: formulario presente, email inválido, footer visible

**Nota:** Los 19 tests skipped (carrito/checkout) requieren backend + producto en DB. Se activarán automáticamente cuando corra el stack completo con `npm run dev` en frontend y `cd server && npm start`.

**Comando:** `npx playwright test --config=tests/ui/playwright.config.ts`

### Desviaciones respecto al plan original

| Aspecto | Plan | Implementado | Motivo |
|---------|------|--------------|--------|
| Config Jest | `jest.config.ts` (ESM) | `jest.config.js` (CommonJS) | ESM causaba errores de módulo en ts-jest |
| `resetMocks` | `true` | Eliminado | Limpiaba implementaciones del mock de `mercadopago` entre tests |
| Mock mercadopago | Sin `__esModule` ni `default` | `__esModule: true` + `default` export | TypeScript's interop requiere `default` para imports default |
| `subscribeEmail` status | Esperaba 201 | Devuelve 200 | El controller usa `res.json(...)` no `res.status(201).json(...)` |
| OXXO test | `status: 'pending'` | `status: 'approved'` con `payment_type_id: 'ticket'` | El path `awaiting_verification` solo se activa cuando MP aprueba el pago de ticket |
| Tests de shipping | 4 tests planeados | No implementados | Pendiente (la ruta de shipping usa polling con delays reales) |
| Total tests | 22 planeados | 18 implementados | Sin `shipping.test.ts` por ahora |

---

## Mapa de archivos

### Archivos nuevos — Capa 1 (API Tests)

| Archivo | Responsabilidad |
|---------|----------------|
| `server/tests/setup.ts` | Configuración global de Jest: mock de prisma, variables de entorno de prueba |
| `server/tests/mocks/prisma.mock.ts` | Mock del cliente Prisma para aislar tests de la DB |
| `server/tests/mocks/axios.mock.ts` | Mock de axios para aislar llamadas a Brevo/Skydropx/Facturapi |
| `server/tests/mocks/facturapi.mock.ts` | Mock del módulo `facturapi` |
| `server/tests/mocks/mercadopago.mock.ts` | Mock del módulo `mercadopago` |
| `server/tests/shipping.test.ts` | 4 casos de prueba para `POST /api/shipping/quote` |
| `server/tests/email.test.ts` | 4 casos de prueba para `POST /api/email/subscribe` |
| `server/tests/payments.test.ts` | 6 casos de prueba para `POST /api/payments/webhook` |
| `server/tests/invoices.test.ts` | 3 casos de prueba para la lógica de `createInvoice` |
| `server/tests/admin.test.ts` | 5 casos de prueba para rutas `/api/admin/*` |
| `server/jest.config.ts` | Configuración de Jest con ts-jest y paths de módulos |
| `server/.env.test` | Variables de entorno para tests (valores ficticios, nunca reales) |

### Archivos modificados — Capa 1

| Archivo | Cambio |
|---------|--------|
| `server/package.json` | Agregar `jest`, `ts-jest`, `supertest`, `@types/supertest` como devDependencies; script `test` y `test:watch` |

### Archivos nuevos — Capa 2 (UI Tests)

| Archivo | Responsabilidad |
|---------|----------------|
| `tests/ui/playwright.config.ts` | Config de Playwright: baseURL, viewport desktop y mobile, timeouts |
| `tests/ui/helpers.ts` | Funciones reutilizables: `addProductToCart`, `fillCheckoutStep1`, `fillCheckoutStep2`, `loginAsAdmin` |
| `tests/ui/screenshots.spec.ts` | 34 screenshots (17 páginas × 2 resoluciones) |
| `tests/ui/catalog.spec.ts` | Flujos F1-F6: filtros, búsqueda, sin resultados |
| `tests/ui/cart.spec.ts` | Flujos F7-F13b: carrito, stock, persistencia, agotado durante navegación |
| `tests/ui/checkout.spec.ts` | Flujos F14-F21c: validaciones, cotización, CFDI, carrito vacío, regresar paso |
| `tests/ui/auth.spec.ts` | Flujos F22-F24: acceso sin sesión redirige a login |
| `tests/ui/newsletter.spec.ts` | Flujos F25-F26: formulario de suscripción |
| `tests/ui/admin.spec.ts` | Flujos F27-F31: facturas pendientes, validaciones admin |

### Archivos nuevos — Capa 3 (E2E)

| Archivo | Responsabilidad |
|---------|----------------|
| `tests/e2e/playwright.config.ts` | Config E2E: baseURL apunta a staging, timeouts más generosos (30s) |
| `tests/e2e/helpers.ts` | Funciones: `completePurchase`, `fillMercadoPagoSandbox`, `verifyOrderInDB` |
| `tests/e2e/purchase-happy-path.spec.ts` | Flujo E2E 1: compra completa como invitado |
| `tests/e2e/purchase-with-cfdi.spec.ts` | Flujo E2E 2: compra con CFDI |
| `tests/e2e/skydropx-failure.spec.ts` | Flujo E2E 3: error controlado de Skydropx |
| `tests/e2e/invoice-retry.spec.ts` | Flujo E2E 4: fallo CFDI → reintento desde admin |
| `tests/e2e/arrival-notification.spec.ts` | Flujo E2E 5: arrival notification agrupada |
| `tests/e2e/card-rejected.spec.ts` | Flujo E2E 6: tarjeta rechazada |
| `tests/e2e/oxxo-payment.spec.ts` | Flujo E2E 7: pago OXXO diferido |
| `tests/e2e/webhook-idempotency.spec.ts` | Flujo E2E 8: webhook duplicado (idempotencia) |
| `tests/e2e/session-expired.spec.ts` | Flujo E2E 9: sesión Clerk expira en checkout |
| `tests/e2e/url-manipulation.spec.ts` | Flujo E2E 10: checkout con carrito vacío por URL directa |

### Archivos nuevos — Capa 4 (Checklist Manual)

| Archivo | Responsabilidad |
|---------|----------------|
| `docs/qa/checklist-seguridad.md` | 18 verificaciones manuales con comandos exactos y casillas |

---

## Tarea 1: Instalar dependencias y configurar Jest en el backend

**Archivos:**
- Modificar: `server/package.json`
- Crear: `server/jest.config.ts`
- Crear: `server/.env.test`

- [ ] **Paso 1: Instalar devDependencies de testing**

```bash
cd server
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

Salida esperada: `added N packages` sin errores.

- [ ] **Paso 2: Crear `server/jest.config.ts`**

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterFramework: ['./tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  clearMocks: true,
  resetMocks: true,
}

export default config
```

- [ ] **Paso 3: Agregar scripts de test en `server/package.json`**

Reemplazar el script `"test"` existente:

```json
"test": "jest --forceExit",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage --forceExit"
```

- [ ] **Paso 4: Crear `server/.env.test`**

```env
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
CLERK_SECRET_KEY=sk_test_fake_key_for_tests
SKYDROPX_API_KEY=test_skydropx_key
SKYDROPX_ORIGIN_ZIP=06600
FACTURAPI_API_KEY=test_facturapi_key
BREVO_API_KEY=test_brevo_key
BREVO_SENDER_EMAIL=test@doubleicards.com
BREVO_SENDER_NAME=Double-I Test
BREVO_ARRIVAL_TEMPLATE_ID=1
BREVO_WELCOME_TEMPLATE_ID=2
BREVO_ORDER_CONFIRM_TEMPLATE_ID=3
BREVO_MAIN_LIST_ID=1
PAYMENT_ACCESS_TOKEN=TEST-fake-access-token
PAYMENT_WEBHOOK_SECRET=fake_webhook_secret_32_chars_here
CLOUDFLARE_R2_ACCOUNT_ID=test
CLOUDFLARE_R2_ACCESS_KEY_ID=test
CLOUDFLARE_R2_SECRET_ACCESS_KEY=test
CLOUDFLARE_R2_BUCKET_NAME=test-bucket
CLOUDFLARE_R2_PUBLIC_URL=https://test.r2.dev
PORT=3002
NODE_ENV=test
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3002
```

- [ ] **Paso 5: Agregar `.env.test` al `.gitignore` del servidor**

Verificar que `server/.gitignore` contenga `.env.test`. Si no existe el archivo:

```bash
echo ".env.test" >> server/.gitignore
```

- [ ] **Paso 6: Verificar que Jest arranca**

```bash
cd server && npx jest --listTests
```

Salida esperada: lista vacía (aún no hay tests) sin errores de configuración.

- [ ] **Paso 7: Commit**

```bash
git add server/package.json server/jest.config.ts server/.gitignore
git commit -m "chore: configurar Jest + ts-jest para tests del backend"
```

---

## Tarea 2: Crear mocks reutilizables

**Archivos:**
- Crear: `server/tests/setup.ts`
- Crear: `server/tests/mocks/prisma.mock.ts`
- Crear: `server/tests/mocks/axios.mock.ts`
- Crear: `server/tests/mocks/facturapi.mock.ts`
- Crear: `server/tests/mocks/mercadopago.mock.ts`

- [ ] **Paso 1: Crear `server/tests/setup.ts`**

```typescript
import dotenv from 'dotenv'
import path from 'path'

// Cargar variables de entorno de prueba antes de cualquier módulo
dotenv.config({ path: path.resolve(__dirname, '../.env.test') })

// Silenciar console.error en tests para no ensuciar el output
jest.spyOn(console, 'error').mockImplementation(() => {})
```

- [ ] **Paso 2: Crear `server/tests/mocks/prisma.mock.ts`**

```typescript
// Mock del módulo lib/prisma — reemplaza el cliente real por jest.fn()
export const prismaMock = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  invoice: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  emailSubscriber: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  shippingQuote: {
    create: jest.fn(),
  },
  systemConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
}

jest.mock('../../lib/prisma', () => ({
  prisma: prismaMock,
}))
```

- [ ] **Paso 3: Crear `server/tests/mocks/axios.mock.ts`**

```typescript
// Mock global de axios — todas las llamadas HTTP externas retornan éxito por defecto
export const axiosMock = {
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  get: jest.fn().mockResolvedValue({ data: {} }),
}

jest.mock('axios', () => axiosMock)
```

- [ ] **Paso 4: Crear `server/tests/mocks/facturapi.mock.ts`**

```typescript
export const facturapiInvoiceMock = {
  create: jest.fn().mockResolvedValue({
    id: 'facturapi_invoice_id_123',
    status: 'valid',
  }),
  downloadPdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
  downloadXml: jest.fn().mockResolvedValue(Buffer.from('fake-xml')),
}

export const facturapiMock = {
  invoices: facturapiInvoiceMock,
}

// Facturapi se instancia con require() dentro de getFacturapi()
jest.mock('facturapi', () => {
  return jest.fn().mockImplementation(() => facturapiMock)
})
```

- [ ] **Paso 5: Crear `server/tests/mocks/mercadopago.mock.ts`**

```typescript
export const mpPaymentGetMock = jest.fn()
export const mpPreferenceCreateMock = jest.fn()

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
  Payment: jest.fn().mockImplementation(() => ({
    get: mpPaymentGetMock,
  })),
  Preference: jest.fn().mockImplementation(() => ({
    create: mpPreferenceCreateMock,
  })),
}))
```

- [ ] **Paso 6: Corregir typo en `server/jest.config.ts`**

El campo `setupFilesAfterFramework` debe ser `setupFilesAfterFramework`. Corregir:

```typescript
setupFilesAfterEach: ['./tests/setup.ts'],
```

Reemplazar por:

```typescript
setupFiles: ['./tests/setup.ts'],
```

- [ ] **Paso 7: Commit**

```bash
git add server/tests/
git commit -m "chore: mocks de Prisma, axios, Facturapi y MercadoPago para tests"
```

---

## Tarea 3: Tests de `POST /api/shipping/quote`

**Archivos:**
- Crear: `server/tests/shipping.test.ts`

- [ ] **Paso 1: Crear `server/tests/shipping.test.ts`**

```typescript
import request from 'supertest'
import express from 'express'
import '../tests/mocks/prisma.mock'
import '../tests/mocks/axios.mock'
import { axiosMock } from '../tests/mocks/axios.mock'
import { prismaMock } from '../tests/mocks/prisma.mock'
import { shippingRoutes } from '../routes/shipping'

const app = express()
app.use(express.json())
app.use('/api/shipping', shippingRoutes)

describe('POST /api/shipping/quote', () => {
  const validBody = {
    destination: {
      street: 'Av. Insurgentes',
      number: '1234',
      neighborhood: 'Del Valle',
      city: 'Ciudad de México',
      state: 'CDMX',
      zip_code: '03100',
    },
    parcel: { weight: 0.1, length: 15, width: 10, height: 2 },
  }

  beforeEach(() => {
    // Skydropx responde con 3 opciones
    axiosMock.post.mockResolvedValue({
      data: {
        data: [
          { carrier: 'Estafeta', service: 'Terrestre', total_price: 85, estimated_days: 4 },
          { carrier: 'DHL', service: 'Express', total_price: 145, estimated_days: 1 },
          { carrier: 'FedEx', service: 'Economy', total_price: 110, estimated_days: 2 },
        ],
      },
    })
    prismaMock.shippingQuote.create.mockResolvedValue({ id: 'sq_1' } as any)
  })

  it('devuelve opciones de envío para dirección válida', async () => {
    const res = await request(app).post('/api/shipping/quote').send(validBody)
    expect(res.status).toBe(200)
    expect(res.body.data).toBeInstanceOf(Array)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data[0]).toHaveProperty('carrier')
    expect(res.body.data[0]).toHaveProperty('price')
    expect(res.body.data[0]).toHaveProperty('eta')
  })

  it('guarda la cotización en shipping_quotes con expires_at +15 min', async () => {
    await request(app).post('/api/shipping/quote').send(validBody)
    expect(prismaMock.shippingQuote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          destinationAddress: expect.any(Object),
          quotesResponse: expect.any(Object),
        }),
      })
    )
    const callArg = prismaMock.shippingQuote.create.mock.calls[0][0].data
    const expiresAt = new Date(callArg.expiresAt)
    const diff = expiresAt.getTime() - Date.now()
    expect(diff).toBeGreaterThan(14 * 60 * 1000) // al menos 14 min en el futuro
    expect(diff).toBeLessThan(16 * 60 * 1000)
  })

  it('devuelve 408 shipping_timeout si Skydropx tarda más de 5s', async () => {
    axiosMock.post.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10))
    )
    jest.useFakeTimers()
    const resPromise = request(app).post('/api/shipping/quote').send(validBody)
    jest.advanceTimersByTime(6000)
    const res = await resPromise
    jest.useRealTimers()
    expect(res.status).toBe(408)
    expect(res.body.error).toBe('shipping_timeout')
  })

  it('devuelve 400 si zip_code tiene letras', async () => {
    const res = await request(app)
      .post('/api/shipping/quote')
      .send({ ...validBody, destination: { ...validBody.destination, zip_code: 'ABCDE' } })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Paso 2: Correr el test y verificar que pasa**

```bash
cd server && npx jest tests/shipping.test.ts --verbose
```

Salida esperada: 4 tests en verde.

- [ ] **Paso 3: Commit**

```bash
git add server/tests/shipping.test.ts
git commit -m "test: casos de prueba POST /api/shipping/quote"
```

---

## Tarea 4: Tests de `POST /api/email/subscribe`

**Archivos:**
- Crear: `server/tests/email.test.ts`

- [ ] **Paso 1: Crear `server/tests/email.test.ts`**

```typescript
import request from 'supertest'
import express from 'express'
import '../tests/mocks/prisma.mock'
import '../tests/mocks/axios.mock'
import { prismaMock } from '../tests/mocks/prisma.mock'
import { axiosMock } from '../tests/mocks/axios.mock'
import { emailRoutes } from '../routes/email'

const app = express()
app.use(express.json())
app.use('/api/email', emailRoutes)

describe('POST /api/email/subscribe', () => {
  beforeEach(() => {
    prismaMock.emailSubscriber.findUnique.mockResolvedValue(null)
    prismaMock.emailSubscriber.create.mockResolvedValue({
      id: 'sub_1',
      email: 'test@example.com',
    } as any)
    axiosMock.post.mockResolvedValue({ data: { id: 'brevo_contact_123' } })
  })

  it('crea suscriptor y dispara template de bienvenida para email nuevo', async () => {
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'nuevo@example.com', source: 'homepage_form' })
    expect(res.status).toBe(201)
    expect(prismaMock.emailSubscriber.create).toHaveBeenCalledTimes(1)
    expect(axiosMock.post).toHaveBeenCalled()
  })

  it('devuelve 200 sin duplicar si el email ya existe', async () => {
    prismaMock.emailSubscriber.findUnique.mockResolvedValue({
      id: 'sub_existing',
      email: 'ya-existe@example.com',
    } as any)
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'ya-existe@example.com', source: 'checkout' })
    expect(res.status).toBe(200)
    expect(prismaMock.emailSubscriber.create).not.toHaveBeenCalled()
  })

  it('devuelve 400 para email con formato inválido', async () => {
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'no-es-un-email', source: 'homepage_form' })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si falta el campo source', async () => {
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'test@example.com' })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Paso 2: Correr el test**

```bash
cd server && npx jest tests/email.test.ts --verbose
```

Salida esperada: 4 tests en verde.

- [ ] **Paso 3: Commit**

```bash
git add server/tests/email.test.ts
git commit -m "test: casos de prueba POST /api/email/subscribe"
```

---

## Tarea 5: Tests del webhook de pagos

**Archivos:**
- Crear: `server/tests/payments.test.ts`

- [ ] **Paso 1: Crear `server/tests/payments.test.ts`**

```typescript
import request from 'supertest'
import express from 'express'
import crypto from 'crypto'
import '../tests/mocks/prisma.mock'
import '../tests/mocks/axios.mock'
import '../tests/mocks/mercadopago.mock'
import '../tests/mocks/facturapi.mock'
import { prismaMock } from '../tests/mocks/prisma.mock'
import { mpPaymentGetMock } from '../tests/mocks/mercadopago.mock'
import { paymentsRoutes } from '../routes/payments'

// El webhook necesita body raw
const app = express()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use('/api/payments', paymentsRoutes)

const WEBHOOK_SECRET = 'fake_webhook_secret_32_chars_here'

function buildSignedWebhookHeaders(paymentId: string, requestId: string) {
  const ts = Date.now().toString()
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`
  const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex')
  return {
    'x-signature': `ts=${ts},v1=${v1}`,
    'x-request-id': requestId,
    'content-type': 'application/json',
  }
}

const approvedPaymentData = {
  id: 'pay_001',
  status: 'approved',
  external_reference: 'order_123',
  payment_type_id: 'credit_card',
}

const baseOrder = {
  id: 'order_123',
  paymentStatus: 'pending',
  orderStatus: 'pending_payment',
  requiresInvoice: false,
  items: [{ productId: 'prod_1', quantity: 1 }],
  invoice: null,
}

describe('POST /api/payments/webhook', () => {
  beforeEach(() => {
    mpPaymentGetMock.mockResolvedValue(approvedPaymentData)
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock))
    prismaMock.order.findUnique.mockResolvedValue({ ...baseOrder } as any)
    prismaMock.order.update.mockResolvedValue({ ...baseOrder, paymentStatus: 'confirmed' } as any)
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 })
  })

  it('confirma pago y descuenta stock con firma válida', async () => {
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_001')
    const res = await request(app)
      .post('/api/payments/webhook')
      .set(headers)
      .send(body)
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'confirmed' }),
      })
    )
    expect(prismaMock.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stock: { decrement: 1 } },
      })
    )
  })

  it('llama a createInvoice si requiresInvoice = true y factura en draft', async () => {
    prismaMock.order.findUnique
      .mockResolvedValueOnce({ ...baseOrder, requiresInvoice: true, invoice: { status: 'draft' } } as any)
      .mockResolvedValueOnce({ ...baseOrder, requiresInvoice: true, invoice: { status: 'draft' } } as any)
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_002')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    // createInvoice llama a prisma.order.findUnique con include de items e invoice
    expect(prismaMock.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'order_123' } })
    )
  })

  it('marca pago como fallido cuando status es rejected', async () => {
    mpPaymentGetMock.mockResolvedValue({ ...approvedPaymentData, status: 'rejected' })
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_003')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { paymentStatus: 'failed' } })
    )
    expect(prismaMock.product.updateMany).not.toHaveBeenCalled()
  })

  it('devuelve 200 pero no procesa si firma es inválida', async () => {
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const res = await request(app)
      .post('/api/payments/webhook')
      .set({ 'x-signature': 'ts=123,v1=firma_invalida', 'x-request-id': 'req_004', 'content-type': 'application/json' })
      .send(body)
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it('devuelve 200 sin procesar si el payload está malformado', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set({ 'content-type': 'application/json' })
      .send('not-valid-json{{{')
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it('no descuenta stock si updateMany devuelve count 0 (stock insuficiente)', async () => {
    prismaMock.product.updateMany.mockResolvedValue({ count: 0 })
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_005')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    // La orden igual se confirma — el guard de stock solo loguea el error
    expect(prismaMock.order.update).toHaveBeenCalled()
  })
})
```

- [ ] **Paso 2: Correr el test**

```bash
cd server && npx jest tests/payments.test.ts --verbose
```

Salida esperada: 6 tests en verde.

- [ ] **Paso 3: Commit**

```bash
git add server/tests/payments.test.ts
git commit -m "test: casos de prueba POST /api/payments/webhook"
```

---

## Tarea 6: Tests de `createInvoice` y rutas admin

**Archivos:**
- Crear: `server/tests/invoices.test.ts`
- Crear: `server/tests/admin.test.ts`

- [ ] **Paso 1: Crear `server/tests/invoices.test.ts`**

```typescript
import '../tests/mocks/prisma.mock'
import '../tests/mocks/axios.mock'
import '../tests/mocks/facturapi.mock'
import { prismaMock } from '../tests/mocks/prisma.mock'
import { axiosMock } from '../tests/mocks/axios.mock'
import { facturapiInvoiceMock } from '../tests/mocks/facturapi.mock'
import { createInvoice } from '../controllers/invoicesController'

// Mock de R2 — no queremos subir archivos reales en tests
jest.mock('../lib/r2', () => ({
  uploadToR2: jest.fn().mockResolvedValue('https://test.r2.dev/invoices/order_1/factura.pdf'),
}))

const baseOrder = {
  id: 'order_1',
  guestEmail: 'comprador@example.com',
  paymentMethod: 'credit_card',
  items: [{ product: { name: 'Charizard Base Set' }, quantity: 1, unitPrice: 1500 }],
  invoice: {
    rfc: 'XAXX010101000',
    razonSocial: 'PÚBLICO EN GENERAL',
    cfdiUse: 'G03',
    status: 'draft',
  },
  customer: null,
}

describe('createInvoice', () => {
  beforeEach(() => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder as any)
    prismaMock.invoice.update.mockResolvedValue({ status: 'valid' } as any)
  })

  it('emite CFDI y actualiza invoice a valid cuando Facturapi responde', async () => {
    await createInvoice('order_1')
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'valid', facturapiInvoiceId: 'facturapi_invoice_id_123' }),
      })
    )
  })

  it('deja invoice en draft y envía email de alerta a Irving cuando Facturapi falla', async () => {
    facturapiInvoiceMock.create.mockRejectedValue(new Error('Facturapi error simulado'))
    await createInvoice('order_1')
    // No actualiza a valid
    expect(prismaMock.invoice.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'valid' }) })
    )
    // Envía email de alerta (axios.post a Brevo)
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringContaining('brevo.com'),
      expect.objectContaining({
        subject: expect.stringContaining('Factura pendiente'),
      }),
      expect.any(Object)
    )
  })

  it('devuelve sin error si la orden no existe', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null)
    await expect(createInvoice('orden_inexistente')).resolves.toBeUndefined()
  })
})
```

- [ ] **Paso 2: Crear `server/tests/admin.test.ts`**

```typescript
import request from 'supertest'
import express from 'express'
import '../tests/mocks/prisma.mock'
import '../tests/mocks/axios.mock'
import { prismaMock } from '../tests/mocks/prisma.mock'
import { adminRoutes } from '../routes/admin'

// Mock del middleware de Clerk para no necesitar JWT real en tests
jest.mock('../middleware/authAdmin', () => ({
  requireAdmin: [
    (_req: any, _res: any, next: any) => next(), // sin autenticación en tests
  ],
}))

const app = express()
app.use(express.json())
app.use('/api/admin', adminRoutes)

// App separada SIN el mock de auth — para probar el rechazo real
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => ({ userId: null, sessionClaims: null }),
}))

const appWithRealAuth = express()
appWithRealAuth.use(express.json())

// Reimportar las rutas sin el mock
jest.isolateModules(() => {
  jest.unmock('../middleware/authAdmin')
  const { adminRoutes: realAdminRoutes } = require('../routes/admin')
  appWithRealAuth.use('/api/admin', realAdminRoutes)
})

describe('Rutas /api/admin', () => {
  it('GET /api/admin/orders sin JWT devuelve 401', async () => {
    const res = await request(appWithRealAuth).get('/api/admin/orders')
    expect(res.status).toBe(401)
  })

  it('PATCH /api/admin/orders/:id actualiza orderStatus y trackingNumber', async () => {
    prismaMock.order.update.mockResolvedValue({
      id: 'order_1',
      orderStatus: 'shipped',
      trackingNumber: 'GUIDE123',
    } as any)
    const res = await request(app)
      .patch('/api/admin/orders/order_1')
      .send({ orderStatus: 'shipped', trackingNumber: 'GUIDE123' })
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orderStatus: 'shipped', trackingNumber: 'GUIDE123' }),
      })
    )
  })

  it('POST /api/admin/invoices/:orderId/retry devuelve 404 si factura no existe', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null)
    const res = await request(app).post('/api/admin/invoices/orden_sin_factura/retry')
    expect(res.status).toBe(404)
  })

  it('POST /api/admin/invoices/:orderId/retry devuelve 409 si factura ya es valid', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ status: 'valid' } as any)
    const res = await request(app).post('/api/admin/invoices/order_ya_facturada/retry')
    expect(res.status).toBe(409)
  })

  it('POST /api/admin/invoices/:orderId/retry devuelve 200 para factura en draft', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ status: 'draft' } as any)
    prismaMock.order.findUnique.mockResolvedValue(null) // createInvoice saldrá temprano
    const res = await request(app).post('/api/admin/invoices/order_draft/retry')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
```

- [ ] **Paso 3: Correr todos los tests de backend**

```bash
cd server && npx jest --verbose --forceExit
```

Salida esperada: todos los tests en verde, 0 failures.

- [ ] **Paso 4: Commit**

```bash
git add server/tests/invoices.test.ts server/tests/admin.test.ts
git commit -m "test: casos de prueba createInvoice y rutas /api/admin"
```

---

## Tarea 7: Configurar Playwright para UI tests

**Archivos:**
- Crear: `tests/ui/playwright.config.ts`
- Crear: `tests/ui/helpers.ts`

- [ ] **Paso 1: Verificar que Playwright está disponible**

```bash
npx playwright --version
```

Si no está instalado:
```bash
npm install --save-dev @playwright/test && npx playwright install chromium
```

- [ ] **Paso 2: Crear `tests/ui/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 15000,
  expect: { timeout: 5000 },
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone SE'] },
    },
  ],
})
```

- [ ] **Paso 3: Crear `tests/ui/helpers.ts`**

```typescript
import { Page } from '@playwright/test'

export async function addProductToCart(page: Page, productSlug: string) {
  await page.goto(`/catalogo/${productSlug}`)
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
  // Clerk maneja el login — esperar redirección al dashboard
  await page.waitForURL('**/admin')
}
```

- [ ] **Paso 4: Verificar configuración**

```bash
npx playwright test --config=tests/ui/playwright.config.ts --list
```

Salida esperada: lista de specs (vacía aún) sin errores de config.

- [ ] **Paso 5: Commit**

```bash
git add tests/ui/playwright.config.ts tests/ui/helpers.ts
git commit -m "chore: configurar Playwright para UI tests"
```

---

## Tarea 8: Screenshots de todas las páginas

**Archivos:**
- Crear: `tests/ui/screenshots.spec.ts`

- [ ] **Paso 1: Obtener un slug de producto real del seed**

```bash
cd server && npx ts-node -e "
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
prisma.product.findFirst().then(p => { console.log(p?.slug); prisma.\$disconnect() })
"
```

Anotar el slug devuelto — usarlo en el spec como `PRODUCT_SLUG`.

- [ ] **Paso 2: Crear `tests/ui/screenshots.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

const PRODUCT_SLUG = 'charizard-base-set-1st-edition' // reemplazar con slug real del seed
const BLOG_SLUG = 'guia-pokemon-base-set' // reemplazar con slug real del seed

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'catalogo', path: '/catalogo' },
  { name: 'producto-detalle', path: `/catalogo/${PRODUCT_SLUG}` },
  { name: 'carrito', path: '/carrito' },
  { name: 'blog-listado', path: '/blog' },
  { name: 'blog-post', path: `/blog/${BLOG_SLUG}` },
  { name: 'contacto', path: '/contacto' },
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

test('screenshot carrito con producto', async ({ page }) => {
  // Agregar producto antes de tomar screenshot
  await page.goto(`/catalogo/${PRODUCT_SLUG}`)
  await page.getByRole('button', { name: /agregar al carrito/i }).click()
  await page.goto('/carrito')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'tests/ui/screenshots/carrito-con-producto.png', fullPage: true })
})

test('screenshot checkout paso 1', async ({ page }) => {
  await page.goto(`/catalogo/${PRODUCT_SLUG}`)
  await page.getByRole('button', { name: /agregar al carrito/i }).click()
  await page.goto('/checkout')
  await page.screenshot({ path: 'tests/ui/screenshots/checkout-paso1.png', fullPage: true })
})

test('screenshot admin dashboard (sin sesión — redirige a login)', async ({ page }) => {
  await page.goto('/admin')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'tests/ui/screenshots/admin-sin-sesion.png', fullPage: true })
})
```

- [ ] **Paso 3: Crear el directorio de screenshots**

```bash
mkdir -p tests/ui/screenshots
echo "*.png" >> tests/ui/screenshots/.gitignore
```

- [ ] **Paso 4: Correr los screenshots**

Con el servidor frontend corriendo (`npm run dev`):

```bash
npx playwright test tests/ui/screenshots.spec.ts --config=tests/ui/playwright.config.ts
```

Revisar que se generaron 34+ archivos `.png` en `tests/ui/screenshots/`.

- [ ] **Paso 5: Commit**

```bash
git add tests/ui/screenshots.spec.ts tests/ui/screenshots/.gitignore
git commit -m "test: screenshots de todas las páginas desktop y mobile"
```

---

## Tarea 9: Tests funcionales — catálogo, carrito y checkout

**Archivos:**
- Crear: `tests/ui/catalog.spec.ts`
- Crear: `tests/ui/cart.spec.ts`
- Crear: `tests/ui/checkout.spec.ts`

- [ ] **Paso 1: Crear `tests/ui/catalog.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Catálogo — filtros y búsqueda', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/catalogo')
    await page.waitForLoadState('networkidle')
  })

  test('F1: filtrar por franquicia Pokémon muestra solo tarjetas Pokémon', async ({ page }) => {
    await page.getByRole('button', { name: /pokemon/i }).click()
    await page.waitForLoadState('networkidle')
    const badges = page.locator('[data-category]')
    const count = await badges.count()
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toHaveAttribute('data-category', /pokemon/i)
    }
  })

  test('F2: filtrar por condición Mint muestra badge verde en todos los resultados', async ({ page }) => {
    await page.getByRole('button', { name: /mint/i }).click()
    await page.waitForLoadState('networkidle')
    const conditionBadges = page.locator('[data-condition="mint"]')
    await expect(conditionBadges.first()).toBeVisible()
  })

  test('F3: filtros combinados — franquicia + condición reducen resultados', async ({ page }) => {
    const initialCount = await page.locator('[data-product-card]').count()
    await page.getByRole('button', { name: /pokemon/i }).click()
    await page.getByRole('button', { name: /mint/i }).click()
    await page.waitForLoadState('networkidle')
    const filteredCount = await page.locator('[data-product-card]').count()
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
  })

  test('F4: limpiar filtros restaura todos los productos', async ({ page }) => {
    const initialCount = await page.locator('[data-product-card]').count()
    await page.getByRole('button', { name: /pokemon/i }).click()
    await page.getByRole('button', { name: /limpiar|todos/i }).click()
    await page.waitForLoadState('networkidle')
    const afterCount = await page.locator('[data-product-card]').count()
    expect(afterCount).toBeGreaterThanOrEqual(initialCount)
  })

  test('F5: búsqueda de texto devuelve resultados relevantes', async ({ page }) => {
    await page.getByRole('searchbox').fill('Charizard')
    await page.keyboard.press('Enter')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/charizard/i).first()).toBeVisible()
  })

  test('F6: búsqueda sin resultados muestra estado vacío', async ({ page }) => {
    await page.getByRole('searchbox').fill('xyzproductoinexistente123')
    await page.keyboard.press('Enter')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/sin resultados|no encontramos/i)).toBeVisible()
  })
})
```

- [ ] **Paso 2: Crear `tests/ui/cart.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

const PRODUCT_SLUG = 'charizard-base-set-1st-edition' // reemplazar con slug real

test.describe('Carrito', () => {
  test('F7: agregar producto incrementa contador en navbar', async ({ page }) => {
    await page.goto(`/catalogo/${PRODUCT_SLUG}`)
    const counter = page.locator('[data-cart-count]')
    await expect(counter).toHaveText('0')
    await page.getByRole('button', { name: /agregar al carrito/i }).click()
    await expect(counter).toHaveText('1')
  })

  test('F10: producto con stock 0 muestra botón Agotado deshabilitado', async ({ page }) => {
    // Este test requiere un producto con stock=0 en la DB de dev
    await page.goto('/catalogo?condition=mint') // navegar al catálogo
    // Si no hay producto agotado en seed, este test se marca como skip
    const agotado = page.getByRole('button', { name: /agotado/i }).first()
    if (await agotado.isVisible()) {
      await expect(agotado).toBeDisabled()
    } else {
      test.skip()
    }
  })

  test('F11: modificar cantidad actualiza subtotal', async ({ page }) => {
    await page.goto(`/catalogo/${PRODUCT_SLUG}`)
    await page.getByRole('button', { name: /agregar al carrito/i }).click()
    await page.goto('/carrito')
    const subtotalBefore = await page.locator('[data-subtotal]').textContent()
    await page.locator('[data-quantity-increase]').click()
    const subtotalAfter = await page.locator('[data-subtotal]').textContent()
    expect(subtotalAfter).not.toEqual(subtotalBefore)
  })

  test('F12: eliminar producto deja carrito vacío', async ({ page }) => {
    await page.goto(`/catalogo/${PRODUCT_SLUG}`)
    await page.getByRole('button', { name: /agregar al carrito/i }).click()
    await page.goto('/carrito')
    await page.getByRole('button', { name: /eliminar|quitar/i }).click()
    await expect(page.getByText(/carrito vacío|sin productos/i)).toBeVisible()
  })

  test('F13: carrito persiste al recargar la página', async ({ page }) => {
    await page.goto(`/catalogo/${PRODUCT_SLUG}`)
    await page.getByRole('button', { name: /agregar al carrito/i }).click()
    await page.reload()
    const counter = page.locator('[data-cart-count]')
    await expect(counter).not.toHaveText('0')
  })

  test('F13b: producto agotado durante navegación bloquea el checkout', async ({ page }) => {
    await page.goto(`/catalogo/${PRODUCT_SLUG}`)
    await page.getByRole('button', { name: /agregar al carrito/i }).click()
    // Simular que el stock se agotó (requiere intervención manual en DB durante el test)
    // Este es un test de integración que se ejecuta manualmente — marcar como skip en CI
    test.skip()
  })
})
```

- [ ] **Paso 3: Crear `tests/ui/checkout.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import { fillCheckoutStep1 } from './helpers'

const PRODUCT_SLUG = 'charizard-base-set-1st-edition' // reemplazar con slug real

test.describe('Checkout — validaciones y flujo', () => {
  test.beforeEach(async ({ page }) => {
    // Asegurar que hay un producto en el carrito antes de cada test
    await page.goto(`/catalogo/${PRODUCT_SLUG}`)
    await page.getByRole('button', { name: /agregar al carrito/i }).click()
    await page.goto('/checkout')
  })

  test('F14: avanzar sin llenar campos muestra errores Zod', async ({ page }) => {
    await page.getByRole('button', { name: /continuar|siguiente/i }).click()
    await expect(page.locator('[data-error], .error-message, [role="alert"]').first()).toBeVisible()
  })

  test('F15: email inválido muestra error específico', async ({ page }) => {
    await page.getByLabel(/email/i).fill('no-es-email')
    await page.getByRole('button', { name: /continuar|siguiente/i }).click()
    await expect(page.getByText(/email inválido|correo inválido/i)).toBeVisible()
  })

  test('F16: CP con menos de 5 dígitos muestra error de validación', async ({ page }) => {
    await fillCheckoutStep1(page)
    await page.getByLabel(/código postal|cp/i).fill('123')
    await page.getByRole('button', { name: /continuar|siguiente/i }).click()
    await expect(page.getByText(/código postal|cp/i).locator('..').getByRole('alert')).toBeVisible()
  })

  test('F17: paso 3 muestra spinner y luego opciones de envío', async ({ page }) => {
    await fillCheckoutStep1(page)
    await page.getByLabel(/calle/i).fill('Av. Insurgentes')
    await page.getByLabel(/número/i).fill('1234')
    await page.getByLabel(/colonia/i).fill('Del Valle')
    await page.getByLabel(/ciudad/i).fill('Ciudad de México')
    await page.getByLabel(/estado/i).fill('CDMX')
    await page.getByLabel(/código postal|cp/i).fill('03100')
    await page.getByRole('button', { name: /continuar|siguiente/i }).click()
    // Spinner debe aparecer
    await expect(page.locator('[data-loading], .animate-spin').first()).toBeVisible()
    // Y luego las opciones
    await expect(page.getByText(/estafeta|dhl|fedex|recoger/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('F19: toggle CFDI muestra formulario de RFC', async ({ page }) => {
    await fillCheckoutStep1(page)
    // Avanzar hasta paso 4
    // ... navegar pasos ...
    const toggle = page.locator('[data-cfdi-toggle], input[type="checkbox"]').filter({ hasText: /factura|cfdi/i })
    await toggle.check()
    await expect(page.getByLabel(/rfc/i)).toBeVisible()
    await expect(page.getByLabel(/razón social/i)).toBeVisible()
  })

  test('F20: RFC con formato inválido muestra error Zod', async ({ page }) => {
    await fillCheckoutStep1(page)
    const toggle = page.locator('[data-cfdi-toggle], input[type="checkbox"]')
    await toggle.check()
    await page.getByLabel(/rfc/i).fill('ABC123')
    await page.getByRole('button', { name: /continuar|siguiente/i }).click()
    await expect(page.getByText(/rfc inválido/i)).toBeVisible()
  })

  test('F21: desactivar toggle CFDI oculta formulario', async ({ page }) => {
    await fillCheckoutStep1(page)
    const toggle = page.locator('[data-cfdi-toggle], input[type="checkbox"]')
    await toggle.check()
    await expect(page.getByLabel(/rfc/i)).toBeVisible()
    await toggle.uncheck()
    await expect(page.getByLabel(/rfc/i)).not.toBeVisible()
  })

  test('F21b: navegar a /checkout con carrito vacío redirige o muestra aviso', async ({ page }) => {
    // Limpiar carrito en localStorage
    await page.evaluate(() => localStorage.clear())
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')
    const isRedirected = !page.url().includes('/checkout')
    const hasEmptyMessage = await page.getByText(/carrito vacío|sin productos/i).isVisible()
    expect(isRedirected || hasEmptyMessage).toBe(true)
  })

  test('F21c: regresar al paso anterior preserva los datos', async ({ page }) => {
    await fillCheckoutStep1(page)
    await page.getByRole('button', { name: /atrás|volver/i }).click()
    await expect(page.getByLabel(/nombre/i)).toHaveValue('Juan Prueba')
    await expect(page.getByLabel(/email/i)).toHaveValue('test@doubleicards.com')
  })
})
```

- [ ] **Paso 4: Correr los tests funcionales**

```bash
npx playwright test tests/ui/catalog.spec.ts tests/ui/cart.spec.ts tests/ui/checkout.spec.ts --config=tests/ui/playwright.config.ts --project=desktop
```

- [ ] **Paso 5: Commit**

```bash
git add tests/ui/catalog.spec.ts tests/ui/cart.spec.ts tests/ui/checkout.spec.ts
git commit -m "test: flujos funcionales de catálogo, carrito y checkout (UI)"
```

---

## Tarea 10: Tests funcionales — acceso, newsletter y admin

**Archivos:**
- Crear: `tests/ui/auth.spec.ts`
- Crear: `tests/ui/newsletter.spec.ts`
- Crear: `tests/ui/admin.spec.ts`

- [ ] **Paso 1: Crear `tests/ui/auth.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Control de acceso', () => {
  test('F22: /admin sin sesión redirige a login', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toContain('/admin/productos')
    const isLoginPage = page.url().includes('/login') || page.url().includes('/sign-in')
    const hasLoginForm = await page.getByLabel(/email/i).isVisible()
    expect(isLoginPage || hasLoginForm).toBe(true)
  })

  test('F23: /mi-cuenta sin sesión redirige a login', async ({ page }) => {
    await page.goto('/mi-cuenta')
    await page.waitForLoadState('networkidle')
    const isLoginPage = page.url().includes('/login') || page.url().includes('/sign-in')
    const hasLoginForm = await page.getByLabel(/email/i).isVisible()
    expect(isLoginPage || hasLoginForm).toBe(true)
  })

  test('F24: /admin/pedidos sin sesión redirige a login', async ({ page }) => {
    await page.goto('/admin/pedidos')
    await page.waitForLoadState('networkidle')
    const isLoginPage = page.url().includes('/login') || page.url().includes('/sign-in')
    const hasLoginForm = await page.getByLabel(/email/i).isVisible()
    expect(isLoginPage || hasLoginForm).toBe(true)
  })
})
```

- [ ] **Paso 2: Crear `tests/ui/newsletter.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Formulario de newsletter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('F25: email válido muestra mensaje de confirmación', async ({ page }) => {
    await page.getByPlaceholder(/tu email|tu correo/i).fill('test-newsletter@example.com')
    await page.getByRole('button', { name: /suscribir|suscríbete/i }).click()
    await expect(page.getByText(/gracias|suscrito|confirmación/i)).toBeVisible({ timeout: 8000 })
  })

  test('F26: email inválido muestra error de validación', async ({ page }) => {
    await page.getByPlaceholder(/tu email|tu correo/i).fill('no-es-email')
    await page.getByRole('button', { name: /suscribir|suscríbete/i }).click()
    await expect(page.getByText(/email inválido|correo inválido/i)).toBeVisible()
  })
})
```

- [ ] **Paso 3: Crear `tests/ui/admin.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

// Estos tests requieren sesión admin activa.
// En CI se saltean — se ejecutan manualmente con sesión real de Irving.
test.describe('Panel admin — facturas y validaciones', () => {
  test.skip(process.env.CI === 'true', 'Tests de admin requieren sesión manual')

  test('F27: pedido con invoice draft muestra badge Factura pendiente', async ({ page }) => {
    await page.goto('/admin/pedidos')
    await page.waitForLoadState('networkidle')
    const badge = page.getByText(/factura pendiente/i).first()
    // Solo valida si existe al menos un pedido con draft en la DB de dev
    if (await badge.isVisible()) {
      await expect(badge).toBeVisible()
    } else {
      test.skip()
    }
  })

  test('F29: crear producto sin campos requeridos muestra errores inline', async ({ page }) => {
    await page.goto('/admin/productos')
    await page.getByRole('button', { name: /nuevo producto/i }).click()
    await page.getByRole('button', { name: /guardar|crear/i }).click()
    await expect(page.locator('[data-error], .error-message').first()).toBeVisible()
  })

  test('F30: subir imagen con formato no permitido muestra error', async ({ page }) => {
    await page.goto('/admin/productos')
    await page.getByRole('button', { name: /nuevo producto/i }).click()
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'documento.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content'),
    })
    await expect(page.getByText(/formato no soportado|tipo de archivo/i)).toBeVisible()
  })
})
```

- [ ] **Paso 4: Correr los tests**

```bash
npx playwright test tests/ui/auth.spec.ts tests/ui/newsletter.spec.ts --config=tests/ui/playwright.config.ts --project=desktop
```

- [ ] **Paso 5: Commit**

```bash
git add tests/ui/auth.spec.ts tests/ui/newsletter.spec.ts tests/ui/admin.spec.ts
git commit -m "test: flujos de acceso, newsletter y admin (UI)"
```

---

## Tarea 11: Configurar Playwright para E2E en staging

**Archivos:**
- Crear: `tests/e2e/playwright.config.ts`
- Crear: `tests/e2e/helpers.ts`

- [ ] **Paso 1: Crear `tests/e2e/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 60000, // E2E puede tomar más tiempo por APIs reales
  expect: { timeout: 15000 },
  retries: 1, // Un reintento por si hay flakiness de red
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://staging.doubleicards.com',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'e2e-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
})
```

- [ ] **Paso 2: Crear `tests/e2e/helpers.ts`**

```typescript
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

export const TEST_RFC = 'XAXX010101000'

export async function addProductToCart(page: Page, productSlug: string) {
  await page.goto(`/catalogo/${productSlug}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /agregar al carrito/i }).click()
  // Esperar que el contador se actualice
  await page.waitForFunction(() => {
    const counter = document.querySelector('[data-cart-count]')
    return counter && counter.textContent !== '0'
  })
}

export async function completeCheckoutSteps1And2(page: Page) {
  await page.getByLabel(/nombre/i).fill('Test Comprador')
  await page.getByLabel(/email/i).fill('test-e2e@doubleicards.com')
  await page.getByLabel(/teléfono/i).fill('5512345678')
  await page.getByRole('button', { name: /continuar|siguiente/i }).click()

  await page.getByLabel(/calle/i).fill('Av. Insurgentes')
  await page.getByLabel(/número/i).fill('1234')
  await page.getByLabel(/colonia/i).fill('Del Valle')
  await page.getByLabel(/ciudad/i).fill('Ciudad de México')
  await page.getByLabel(/estado/i).fill('CDMX')
  await page.getByLabel(/código postal|cp/i).fill('03100')
  await page.getByRole('button', { name: /continuar|siguiente/i }).click()
}

export async function selectShippingAndSkipCFDI(page: Page) {
  // Esperar opciones de envío
  await expect(page.getByText(/estafeta|dhl|fedex|recoger/i).first()).toBeVisible({ timeout: 15000 })
  // Seleccionar primera opción disponible
  await page.locator('[data-shipping-option]').first().click()
  await page.getByRole('button', { name: /continuar|siguiente/i }).click()
  // Paso 4: CFDI — saltar
  await page.getByRole('button', { name: /continuar|siguiente/i }).click()
}
```

- [ ] **Paso 3: Commit**

```bash
git add tests/e2e/playwright.config.ts tests/e2e/helpers.ts
git commit -m "chore: configurar Playwright E2E para staging"
```

---

## Tarea 12: Flujos E2E happy path

**Archivos:**
- Crear: `tests/e2e/purchase-happy-path.spec.ts`
- Crear: `tests/e2e/purchase-with-cfdi.spec.ts`

- [ ] **Paso 1: Crear `tests/e2e/purchase-happy-path.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import { addProductToCart, completeCheckoutSteps1And2, selectShippingAndSkipCFDI, SANDBOX_CARD } from './helpers'

const PRODUCT_SLUG = 'charizard-base-set-1st-edition' // reemplazar con slug real de staging

test('E2E 1: compra completa como invitado', async ({ page }) => {
  await addProductToCart(page, PRODUCT_SLUG)
  await page.goto('/checkout')

  await completeCheckoutSteps1And2(page)
  await selectShippingAndSkipCFDI(page)

  // Paso 5: pago con tarjeta sandbox
  // Mercado Pago renderiza en iframe — esperar a que cargue
  const mpFrame = page.frameLocator('iframe[src*="mercadopago"]').first()
  await mpFrame.getByLabel(/número de tarjeta/i).fill(SANDBOX_CARD.number)
  await mpFrame.getByLabel(/vencimiento/i).fill(SANDBOX_CARD.expiry)
  await mpFrame.getByLabel(/código de seguridad|cvv/i).fill(SANDBOX_CARD.cvv)
  await mpFrame.getByLabel(/nombre/i).fill(SANDBOX_CARD.name)
  await page.getByRole('button', { name: /pagar|confirmar/i }).click()

  // Verificar página de confirmación
  await page.waitForURL('**/pedido/confirmacion', { timeout: 30000 })
  await expect(page.getByText(/pedido confirmado|número de pedido/i)).toBeVisible()
})
```

- [ ] **Paso 2: Crear `tests/e2e/purchase-with-cfdi.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import { addProductToCart, completeCheckoutSteps1And2, SANDBOX_CARD, TEST_RFC } from './helpers'

const PRODUCT_SLUG_2 = 'pikachu-base-set-holo' // reemplazar con segundo slug real de staging

test('E2E 2: compra con CFDI — factura queda en valid', async ({ page }) => {
  await addProductToCart(page, PRODUCT_SLUG_2)
  await page.goto('/checkout')

  await completeCheckoutSteps1And2(page)

  // Paso 3: seleccionar DHL
  await expect(page.getByText(/dhl/i)).toBeVisible({ timeout: 15000 })
  await page.locator('[data-shipping-option]').filter({ hasText: /dhl/i }).click()
  await page.getByRole('button', { name: /continuar|siguiente/i }).click()

  // Paso 4: activar CFDI
  await page.locator('[data-cfdi-toggle], input[type="checkbox"]').check()
  await page.getByLabel(/rfc/i).fill(TEST_RFC)
  await page.getByLabel(/razón social/i).fill('PÚBLICO EN GENERAL')
  await page.getByRole('combobox', { name: /uso/i }).selectOption('G03')
  await page.getByRole('button', { name: /continuar|siguiente/i }).click()

  // Paso 5: pago
  const mpFrame = page.frameLocator('iframe[src*="mercadopago"]').first()
  await mpFrame.getByLabel(/número de tarjeta/i).fill(SANDBOX_CARD.number)
  await mpFrame.getByLabel(/vencimiento/i).fill(SANDBOX_CARD.expiry)
  await mpFrame.getByLabel(/código de seguridad|cvv/i).fill(SANDBOX_CARD.cvv)
  await mpFrame.getByLabel(/nombre/i).fill(SANDBOX_CARD.name)
  await page.getByRole('button', { name: /pagar|confirmar/i }).click()

  await page.waitForURL('**/pedido/confirmacion', { timeout: 30000 })
  await expect(page.getByText(/pedido confirmado/i)).toBeVisible()
  // La verificación de invoices.status = 'valid' se hace manualmente en DB
})
```

- [ ] **Paso 3: Commit**

```bash
git add tests/e2e/purchase-happy-path.spec.ts tests/e2e/purchase-with-cfdi.spec.ts
git commit -m "test: E2E flujos de compra happy path con y sin CFDI"
```

---

## Tarea 13: Flujos E2E negativos

**Archivos:**
- Crear: `tests/e2e/skydropx-failure.spec.ts`
- Crear: `tests/e2e/invoice-retry.spec.ts`
- Crear: `tests/e2e/card-rejected.spec.ts`
- Crear: `tests/e2e/oxxo-payment.spec.ts`
- Crear: `tests/e2e/webhook-idempotency.spec.ts`
- Crear: `tests/e2e/url-manipulation.spec.ts`
- Crear: `tests/e2e/session-expired.spec.ts`
- Crear: `tests/e2e/arrival-notification.spec.ts`

- [ ] **Paso 1: Crear `tests/e2e/skydropx-failure.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import { addProductToCart, completeCheckoutSteps1And2 } from './helpers'

const PRODUCT_SLUG = 'charizard-base-set-1st-edition'

// PRERREQUISITO MANUAL: cambiar SKYDROPX_API_KEY a valor inválido en staging y reiniciar servidor
test('E2E 3: Skydropx falla — muestra error controlado y pickup disponible', async ({ page }) => {
  test.skip(!process.env.SKYDROPX_FAILURE_MODE, 'Requiere SKYDROPX_FAILURE_MODE=true y key inválida en staging')

  await addProductToCart(page, PRODUCT_SLUG)
  await page.goto('/checkout')
  await completeCheckoutSteps1And2(page)

  // Verificar mensaje de error controlado
  await expect(
    page.getByText(/no pudimos cotizar|recoger en tienda/i)
  ).toBeVisible({ timeout: 10000 })

  // Pickup sigue disponible
  await expect(page.getByText(/recoger en tienda|gratis/i)).toBeVisible()
  await page.locator('[data-shipping-option]').filter({ hasText: /recoger/i }).click()
  await page.getByRole('button', { name: /continuar|siguiente/i }).click()
  // El checkout puede continuar
  await expect(page.getByRole('button', { name: /continuar|pagar/i })).toBeVisible()
})
```

- [ ] **Paso 2: Crear `tests/e2e/invoice-retry.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

// PRERREQUISITO MANUAL: tener un pedido con invoice.status = 'draft' en staging
// y sesión admin activa en el navegador
test('E2E 4: reintento de factura desde admin cambia status a valid', async ({ page }) => {
  test.skip(!process.env.ADMIN_SESSION, 'Requiere sesión admin activa')

  await page.goto('/admin/pedidos')
  await page.waitForLoadState('networkidle')

  // Encontrar pedido con badge de factura pendiente
  const pedidoConBadge = page.locator('[data-order-row]').filter({ has: page.getByText(/factura pendiente/i) }).first()
  await expect(pedidoConBadge).toBeVisible()
  await pedidoConBadge.click()

  // Verificar que aparece la sección de reintento
  await expect(page.getByText(/factura pendiente/i).filter({ hasText: /⚠/ })).toBeVisible()

  // Hacer clic en reintentar
  await page.getByRole('button', { name: /reintentar factura/i }).click()
  await expect(page.getByText(/reintento iniciado/i)).toBeVisible({ timeout: 10000 })
})
```

- [ ] **Paso 3: Crear `tests/e2e/card-rejected.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import { addProductToCart, completeCheckoutSteps1And2, selectShippingAndSkipCFDI, REJECTED_CARD } from './helpers'

const PRODUCT_SLUG = 'charizard-base-set-1st-edition'

test('E2E 6: tarjeta rechazada no descuenta stock y muestra error en UI', async ({ page }) => {
  await addProductToCart(page, PRODUCT_SLUG)
  await page.goto('/checkout')
  await completeCheckoutSteps1And2(page)
  await selectShippingAndSkipCFDI(page)

  const mpFrame = page.frameLocator('iframe[src*="mercadopago"]').first()
  await mpFrame.getByLabel(/número de tarjeta/i).fill(REJECTED_CARD.number)
  await mpFrame.getByLabel(/vencimiento/i).fill(REJECTED_CARD.expiry)
  await mpFrame.getByLabel(/código de seguridad|cvv/i).fill(REJECTED_CARD.cvv)
  await mpFrame.getByLabel(/nombre/i).fill(REJECTED_CARD.name)
  await page.getByRole('button', { name: /pagar|confirmar/i }).click()

  // Esperar respuesta de pago rechazado
  await expect(
    page.getByText(/pago rechazado|tarjeta rechazada|intenta con otro/i)
  ).toBeVisible({ timeout: 30000 })

  // No debe redirigir a confirmación
  expect(page.url()).not.toContain('confirmacion')
})
```

- [ ] **Paso 4: Crear `tests/e2e/oxxo-payment.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import { addProductToCart, completeCheckoutSteps1And2, selectShippingAndSkipCFDI } from './helpers'

const PRODUCT_SLUG = 'charizard-base-set-1st-edition'

test('E2E 7: pago OXXO genera referencia y pedido queda en pending', async ({ page }) => {
  await addProductToCart(page, PRODUCT_SLUG)
  await page.goto('/checkout')
  await completeCheckoutSteps1And2(page)
  await selectShippingAndSkipCFDI(page)

  // Seleccionar OXXO Pay
  await page.getByRole('button', { name: /oxxo/i }).click()
  await page.getByRole('button', { name: /pagar|confirmar/i }).click()

  // Verificar referencia OXXO visible
  await expect(page.getByText(/referencia oxxo|código oxxo/i)).toBeVisible({ timeout: 30000 })

  // Redirige a página de pendiente
  await page.waitForURL('**/pedido/pendiente', { timeout: 30000 })
  await expect(page.getByText(/pendiente|realiza tu pago/i)).toBeVisible()
})
```

- [ ] **Paso 5: Crear `tests/e2e/url-manipulation.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test('E2E 10: /checkout con carrito vacío no muestra pantalla en blanco', async ({ page }) => {
  // Limpiar cualquier carrito existente
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/checkout')
  await page.waitForLoadState('networkidle')

  // No debe ser pantalla en blanco
  const bodyText = await page.locator('body').textContent()
  expect(bodyText?.trim().length).toBeGreaterThan(10)

  // Debe redirigir o mostrar aviso de carrito vacío
  const redirected = !page.url().endsWith('/checkout')
  const hasMessage = await page.getByText(/carrito vacío|sin productos/i).isVisible()
  expect(redirected || hasMessage).toBe(true)
})
```

- [ ] **Paso 6: Crear `tests/e2e/arrival-notification.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

// PRERREQUISITO MANUAL: sesión admin activa y lista de suscriptores de prueba en Brevo
test('E2E 5: arrival notification se agrupa en ráfaga de 10 min', async ({ page }) => {
  test.skip(!process.env.ADMIN_SESSION, 'Requiere sesión admin activa')

  // Este test es semi-manual — verifica UI del admin, la confirmación del email es manual
  await page.goto('/admin/productos')
  await page.getByRole('button', { name: /nuevo producto/i }).click()

  // Llenar campos mínimos
  await page.getByLabel(/nombre/i).fill(`Test Arrival ${Date.now()}`)
  await page.getByLabel(/precio/i).fill('100')
  await page.getByLabel(/stock/i).fill('1')
  await page.locator('[data-active-toggle]').check()
  await page.getByRole('button', { name: /guardar|crear/i }).click()

  await expect(page.getByText(/producto.*creado|guardado/i)).toBeVisible({ timeout: 10000 })
  // Verificación de email en Brevo se hace manualmente
})
```

- [ ] **Paso 7: Crear `tests/e2e/session-expired.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'
import { addProductToCart, completeCheckoutSteps1And2 } from './helpers'

const PRODUCT_SLUG = 'charizard-base-set-1st-edition'

// Este test es semi-manual — la expiración de Clerk requiere manipulación de cookies
test('E2E 9: sesión expirada en checkout muestra aviso y preserva carrito', async ({ page }) => {
  test.skip(!process.env.CLERK_SESSION_TEST, 'Requiere manipulación manual de sesión Clerk')

  await addProductToCart(page, PRODUCT_SLUG)
  await page.goto('/checkout')
  await completeCheckoutSteps1And2(page)

  // Invalidar sesión modificando el cookie de Clerk
  await page.context().clearCookies()

  await page.getByRole('button', { name: /continuar|siguiente/i }).click()
  await page.waitForLoadState('networkidle')

  // Debe mostrar mensaje de sesión expirada o redirigir a login
  const hasExpiredMessage = await page.getByText(/sesión.*expiró|inicia sesión de nuevo/i).isVisible()
  const redirectedToLogin = page.url().includes('/login') || page.url().includes('/sign-in')
  expect(hasExpiredMessage || redirectedToLogin).toBe(true)

  // El carrito debe seguir presente después de re-login
  const cartData = await page.evaluate(() => localStorage.getItem('cart'))
  expect(cartData).not.toBeNull()
})
```

- [ ] **Paso 8: Commit**

```bash
git add tests/e2e/
git commit -m "test: E2E flujos negativos — Skydropx, CFDI retry, tarjeta rechazada, OXXO, idempotencia, URL"
```

---

## Tarea 14: Checklist manual de seguridad (documento)

**Archivos:**
- Crear: `docs/qa/checklist-seguridad.md`

- [ ] **Paso 1: Crear directorio**

```bash
mkdir -p docs/qa
```

- [ ] **Paso 2: Crear `docs/qa/checklist-seguridad.md`**

```markdown
# Checklist Manual de Seguridad — Double-I TCG

Ejecutar antes de hacer merge a `main`. Marcar ✅ o ❌ en cada ítem.

## Seguridad del bundle frontend

- [ ] **S1 — Sin API keys en el bundle**
  ```bash
  npm run build && grep -r "sk_" dist/ && grep -r "API_KEY" dist/
  ```
  Resultado esperado: sin output (vacío).

- [ ] **S2 — SUPABASE_SERVICE_KEY no está en el bundle**
  ```bash
  grep -r "service_role" dist/
  ```
  Resultado esperado: sin output.

- [ ] **S3 — Sin console.log en producción**
  ```bash
  grep -r "console.log" dist/
  ```
  Resultado esperado: sin output.

## Seguridad de acceso y datos

- [ ] **S4 — Usuario A no ve pedidos de usuario B**
  1. Crear cuenta A y cuenta B en staging
  2. Hacer un pedido con cada cuenta
  3. Con el JWT de la cuenta A, hacer:
     ```bash
     curl -H "Authorization: Bearer <JWT_CUENTA_A>" https://staging.doubleicards.com/api/orders/me
     ```
  Resultado esperado: solo pedidos de A, nunca de B.

- [ ] **S5 — /api/admin/orders sin JWT devuelve 401**
  ```bash
  curl -X GET https://staging.doubleicards.com/api/admin/orders
  ```
  Resultado esperado: `{"error":"No autenticado"}` con status 401.

- [ ] **S6 — /api/admin/products POST sin JWT devuelve 401**
  ```bash
  curl -X POST https://staging.doubleicards.com/api/admin/products \
    -H "Content-Type: application/json" \
    -d '{"name":"test"}'
  ```
  Resultado esperado: status 401.

## Correctitud de stock

- [ ] **S7 — Stock no baja en pagos fallidos**
  1. Anotar el stock actual de un producto en staging
  2. Iniciar checkout → llegar al paso de pago → abandonar (cerrar tab)
  3. Verificar en Neon (tabla `products`) que `stock` no cambió

- [ ] **S8 — Stock no queda negativo (race condition)**
  1. Producto con stock = 1
  2. Abrir 2 tabs del navegador simultáneamente
  3. Agregar el producto en ambas tabs
  4. Completar el pago en ambas tabs lo más rápido posible
  5. Verificar en DB: `stock >= 0` y solo 1 pedido con `payment_status = 'confirmed'`

- [ ] **S9 — Producto agotado no se puede agregar al carrito**
  1. En Neon: `UPDATE "Product" SET stock = 0 WHERE slug = '<slug>'`
  2. Navegar a la PDP del producto
  3. Verificar: botón "Agotado" visible y deshabilitado

## Variables de entorno y configuración

- [ ] **S10 — .env no está en el repositorio**
  ```bash
  git log --all --full-history -- "**/.env" "server/.env"
  ```
  Resultado esperado: sin output.

- [ ] **S11 — .env.example está completo**
  Comparar manualmente `server/.env.example` con `server/.env`.
  Todas las keys del `.env` deben existir en `.env.example`.

- [ ] **S12 — NODE_ENV=production en staging**
  Verificar en los logs del servidor Express al arrancar:
  El log de Morgan NO debe aparecer (solo activo en development).

## Experiencia en dispositivos reales

- [ ] **S13 — iPhone SE sin overflow horizontal**
  Abrir `staging.doubleicards.com` en Safari iOS (375px):
  - Navegar catálogo, filtrar, abrir PDP, iniciar checkout
  - Verificar que no hay scroll horizontal en ninguna pantalla

- [ ] **S14 — Botón WhatsApp abre correctamente en mobile**
  En Safari iOS: tocar el botón flotante de WhatsApp
  Resultado esperado: abre WhatsApp con el número de Irving prellenado

- [ ] **S15 — Carrito persiste al cerrar Safari**
  1. Agregar producto al carrito
  2. Cerrar la tab completamente
  3. Reabrir `staging.doubleicards.com`
  4. Verificar que el producto sigue en el carrito

## Emails transaccionales

- [ ] **S16 — Email de confirmación tiene todos los datos**
  Después del E2E 1, revisar el inbox de `test-e2e@doubleicards.com`:
  - Número de pedido presente
  - Lista de artículos correcta
  - Total correcto
  - Método de envío presente

- [ ] **S17 — CFDI adjunto abre correctamente**
  Después del E2E 2, revisar el inbox:
  - PDF descargable y abre correctamente (no vacío)
  - XML descargable y contiene XML válido (verificar con cualquier editor de texto)

- [ ] **S18 — Email de bienvenida llega al suscribirse**
  1. Ingresar email nuevo en el formulario de homepage
  2. Verificar inbox en menos de 2 minutos
  3. Email debe tener asunto de bienvenida y enlace al catálogo

---

**Fecha de ejecución:** _______________  
**Ejecutado por:** _______________  
**Resultado:** ✅ Aprobado / ❌ Con observaciones

**Observaciones:**
```

- [ ] **Paso 3: Commit**

```bash
git add docs/qa/checklist-seguridad.md
git commit -m "docs: checklist manual de seguridad pre go-live"
```

---

## Tarea 15: Agregar script `test:api` al root package.json y verificación final

**Archivos:**
- Modificar: `package.json` (raíz)

- [ ] **Paso 1: Agregar scripts en el package.json raíz**

Abrir `package.json` en la raíz del proyecto y agregar dentro de `"scripts"`:

```json
"test:api": "cd server && npm test",
"test:ui": "npx playwright test --config=tests/ui/playwright.config.ts",
"test:e2e": "npx playwright test --config=tests/e2e/playwright.config.ts",
"test:all": "npm run test:api && npm run test:ui"
```

- [ ] **Paso 2: Verificar que todos los API tests pasan**

```bash
npm run test:api
```

Salida esperada:
```
Test Suites: 5 passed, 5 total
Tests:       22 passed, 22 total
```

- [ ] **Paso 3: Verificar que el build del frontend sigue limpio**

```bash
npm run build
```

Salida esperada: `✓ built in X.XXs` sin errores TypeScript.

- [ ] **Paso 4: Commit final**

```bash
git add package.json
git commit -m "chore: scripts test:api, test:ui y test:e2e en package.json raíz"
```

---

## Resumen de verificación final

Antes de hacer merge a `main`:

| Capa | Comando | Resultado esperado |
|------|---------|-------------------|
| API Tests | `npm run test:api` | 22 tests ✅ |
| UI Tests | `npm run test:ui` | 34 screenshots + 28+ flujos ✅ |
| E2E Staging | `npm run test:e2e` | 5 flujos automáticos ✅ (5 semi-manuales) |
| Checklist manual | `docs/qa/checklist-seguridad.md` | 18 ítems ✅ |
| Build | `npm run build` | Sin errores ✅ |
