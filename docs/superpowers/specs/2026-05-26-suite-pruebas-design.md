# Suite de Pruebas — Double-I TCG Ecommerce
**Fecha:** 2026-05-26  
**Proyecto:** synergy-Double_I (doubleicards.com)  
**Autor:** Emiliano Roldan / Synergy Tech MX  
**Estado:** Aprobado por Emiliano

---

## Contexto

Double-I es un ecommerce de tarjetas coleccionables con dinero real de por medio: pagos con Mercado Pago, generación de CFDI 4.0, descuento de stock en tiempo real y envíos cotizados con Skydropx. Un bug en producción tiene consecuencias directas para los clientes de Irving (cargos incorrectos, facturas perdidas, pedidos sin confirmar) y para la reputación de Synergy.

Esta suite de pruebas cubre las 4 capas necesarias para garantizar que el sistema funciona correctamente antes del go-live: pruebas de API en aislamiento, pruebas de UI con Playwright, flujos E2E completos en staging con APIs sandbox, y un checklist manual de seguridad y correctitud que se ejecuta una vez antes de hacer merge a `main`.

---

## Requisito funcional adicional identificado durante el diseño

**Gestión de facturas fallidas desde el panel admin** — cuando Facturapi falla y un CFDI queda en `status = 'draft'`, el sistema debe:

1. Mostrar badge "Factura pendiente" en `/admin/pedidos` para pedidos con `requires_invoice = true` e `invoice.status = 'draft'` (o sin registro en `invoices`).
2. Mostrar botón "Reintentar factura" en el detalle del pedido que llame de nuevo a `POST /api/invoice/create` con los datos ya guardados.
3. Enviar email de alerta a Irving vía Brevo cuando un CFDI queda en `draft`, con número de pedido y datos del cliente.

Este requisito impacta el backend (`/api/invoice/create`, manejo de errores de Facturapi), el frontend (panel admin `/admin/pedidos`) y los flujos de prueba (Flujo E2E 4).

---

## Arquitectura de la Suite

```
Capa 1 — API Tests (Jest + Supertest)
  ↳ Corre en local, todas las APIs externas mockeadas con Jest
  ↳ Verifica lógica del backend: rutas, validaciones, respuestas de error
  ↳ Debe pasar al 100% antes de hacer deploy a staging

Capa 2 — UI Tests (Playwright MCP)
  ↳ Corre sobre localhost:5173 + localhost:3001
  ↳ Screenshots desktop/mobile + flujos funcionales interactivos
  ↳ Debe pasar al 100% antes de hacer deploy a staging

Capa 3 — E2E en Staging (Playwright)
  ↳ Corre sobre staging.doubleicards.com
  ↳ APIs sandbox: Mercado Pago sandbox + Facturapi sandbox
  ↳ Debe pasar al 100% antes de hacer merge a main

Capa 4 — Checklist Manual de Seguridad
  ↳ Ejecutado manualmente por Emiliano antes del go-live
  ↳ Bundle analysis, RLS, stock, .env, dispositivos reales
```

**Prerrequisito para Capa 3:** el servidor de staging debe tener un `.env.staging` separado con:
- `PAYMENT_ACCESS_TOKEN` = access token de la cuenta sandbox de Mercado Pago
- `FACTURAPI_API_KEY` = key del entorno sandbox de Facturapi
- El resto de variables iguales al `.env` de producción

---

## Capa 1 — API Tests (Jest + Supertest)

**Ubicación:** `server/tests/`  
**Comando:** `npm run test:api`  
**Total de casos:** ~22

### `POST /api/shipping/quote`

| # | Caso | Input | Resultado esperado |
|---|------|-------|--------------------|
| 1 | Dirección válida | CP válido, parcel con peso | Array con ≥1 opción `{ carrier, service, price, eta }`, status 200 |
| 2 | Timeout de Skydropx (>5s) | Mock que tarda 6s | `{ error: 'shipping_timeout' }`, status 408 |
| 3 | CP inválido (letras) | `zip_code: "ABCDE"` | Status 400 con mensaje de validación |
| 4 | Cotización guardada en DB | Dirección válida | Registro en `shipping_quotes` con `expires_at` = ahora + 15 min |

### `POST /api/email/subscribe`

| # | Caso | Input | Resultado esperado |
|---|------|-------|--------------------|
| 5 | Email nuevo | Email único, source válido | Status 201, registro en DB, template de bienvenida llamado en Brevo |
| 6 | Email ya existente | Email ya en DB | Status 200, sin duplicado, sin error |
| 7 | Email con formato inválido | `"no-es-email"` | Status 400 con error de validación |
| 8 | Sin campo `source` | Body sin `source` | Status 400 — campo requerido |

### `POST /api/payments/webhook`

| # | Caso | Input | Resultado esperado |
|---|------|-------|--------------------|
| 9 | Pago confirmado, firma válida | Payload MP firmado, status `approved` | `order.payment_status = 'confirmed'`, stock decrementado en 1 |
| 10 | Pago confirmado + `requires_invoice = true` | Mismo payload + flag en pedido | Lógica de creación de CFDI invocada |
| 11 | Pago fallido | Payload MP con status `rejected` | `order.payment_status = 'failed'`, stock sin cambio |
| 12 | Firma del webhook inválida | Payload con firma incorrecta | Status 401, pedido no modificado |
| 13 | Payload malformado | Body sin campos requeridos | Status 400 |
| 14 | Race condition de stock | Dos webhooks simultáneos para mismo pedido | Stock no baja por debajo de 0 |

### `POST /api/invoice/create`

| # | Caso | Input | Resultado esperado |
|---|------|-------|--------------------|
| 15 | Datos válidos | RFC válido, order_id existente | `invoices.status = 'valid'`, `facturapi_invoice_id` guardado |
| 16 | Facturapi falla | Mock que lanza error | `invoices.status = 'draft'`, email de alerta enviado a Irving, no lanza excepción 500 |
| 17 | RFC inválido | `rfc: "ABC123"` | Status 400 antes de llamar Facturapi |

### Rutas Admin (`/api/admin/*`)

| # | Caso | Input | Resultado esperado |
|---|------|-------|--------------------|
| 18 | Sin token JWT | Request sin header Authorization | Status 401 en todas las rutas `/admin/*` |
| 19 | Token de usuario normal | JWT de usuario no-admin | Status 403 |
| 20 | `PATCH /api/admin/orders/:id` estado válido | `{ order_status: 'shipped', tracking_number: '123' }` | Pedido actualizado en DB |
| 21 | `POST /api/admin/products` con `is_active = true` | Producto nuevo publicado | Arrival notification disparada en Brevo |
| 22 | Múltiples productos en <10 min | 3 productos publicados en 5 min | Solo 1 email agrupado enviado a Brevo |

---

## Capa 2 — UI Tests (Playwright MCP)

**Entorno:** `localhost:5173` (frontend) + `localhost:3001` (backend)  
**Comando:** ejecutar con Playwright MCP sobre el servidor de desarrollo

### Screenshots por página

Por cada página: captura en **desktop 1280×800** y **mobile 375×812**.  
Verificar en cada screenshot: navbar visible, sin overflow horizontal, footer con MadeBy presente, layout correcto.

| Página | Ruta |
|--------|------|
| Homepage | `/` |
| Catálogo (sin filtros) | `/catalogo` |
| Detalle de producto | `/catalogo/[slug-del-seed]` |
| Carrito con 1 producto | `/carrito` |
| Checkout paso 1 — datos personales | `/checkout` |
| Checkout paso 2 — dirección | `/checkout` (avanzar a paso 2) |
| Checkout paso 3 — cotización de envíos | `/checkout` (avanzar a paso 3) |
| Checkout paso 4 — CFDI toggle activo | `/checkout` (avanzar a paso 4, activar toggle) |
| Confirmación de pedido | `/pedido/confirmacion` |
| Blog listado | `/blog` |
| Blog post individual | `/blog/[slug]` |
| Contacto | `/contacto` |
| Mi cuenta | `/mi-cuenta` |
| Admin dashboard | `/admin` (con sesión activa) |
| Admin productos | `/admin/productos` |
| Admin pedidos | `/admin/pedidos` |
| Admin blog | `/admin/blog` |

**Total screenshots:** 17 páginas × 2 resoluciones = **34 screenshots**

### Flujos funcionales interactivos

**Catálogo y filtros:**

| # | Flujo | Verificación |
|---|-------|-------------|
| F1 | Filtrar por franquicia "Pokémon" | Solo aparecen tarjetas con `category = 'pokemon'` |
| F2 | Filtrar por condición "Mint" | Badge verde presente en todos los resultados |
| F3 | Combinar franquicia + condición | Filtros aplicados simultáneamente, resultados reducidos |
| F4 | Limpiar filtros | Todos los productos vuelven a aparecer |
| F5 | Búsqueda de texto "Charizard" | Aparece al menos 1 resultado relevante |
| F6 | Búsqueda sin resultados | Estado "sin resultados" con botón para limpiar |

**Carrito:**

| # | Flujo | Verificación |
|---|-------|-------------|
| F7 | Agregar producto desde PDP | Contador en navbar pasa de 0 a 1 |
| F8 | Agregar mismo producto dos veces | Cantidad sube a 2 (si stock ≥ 2) |
| F9 | Producto con stock = 1 | No permite agregar más de 1 unidad |
| F10 | Producto con stock = 0 | Botón "Agotado" visible y deshabilitado |
| F11 | Modificar cantidad en `/carrito` | Subtotal se actualiza en tiempo real |
| F12 | Eliminar producto del carrito | Carrito queda vacío, contador en navbar = 0 |
| F13 | Recargar página con carrito no vacío | Carrito persiste (localStorage) |
| F13b | Producto en carrito se agota mientras el usuario navega | En DB poner stock = 0 de un producto que ya está en el carrito de otro tab → al intentar hacer checkout, el sistema debe mostrar aviso "producto agotado, retíralo del carrito" y bloquear el avance |

**Checkout:**

| # | Flujo | Verificación |
|---|-------|-------------|
| F14 | Avanzar paso 1 sin campos | Mensajes de error Zod visibles bajo cada campo |
| F15 | Email con formato inválido | Error específico "Email inválido" |
| F16 | CP con menos de 5 dígitos | Error de validación en campo CP |
| F17 | Llegar a paso 3 | Spinner visible → opciones de envío aparecen |
| F17b | Error de Skydropx en paso 3 (key inválida temporalmente) | Mensaje de error controlado visible, opción "Recoger en tienda" sigue activa, no pantalla en blanco ni error 500 |
| F18 | Seleccionar carrier | Total se actualiza: subtotal + costo del carrier |
| F19 | Toggle CFDI ON | Formulario RFC/razón social/uso aparece |
| F20 | RFC con formato inválido | Error de validación Zod en campo RFC |
| F21 | Toggle CFDI OFF | Formulario RFC desaparece |
| F21b | Navegar a `/checkout` con carrito vacío (URL directa) | Redirige al catálogo o muestra aviso "tu carrito está vacío", no pantalla en blanco |
| F21c | Regresar al paso anterior en checkout | Los datos del paso anterior persisten en el formulario, no se borran |

**Seguridad y acceso:**

| # | Flujo | Verificación |
|---|-------|-------------|
| F22 | Navegar a `/admin` sin sesión | Redirige a login |
| F23 | Navegar a `/mi-cuenta` sin sesión | Redirige a login |
| F24 | Navegar a `/admin/pedidos` sin sesión | Redirige a login |

**Newsletter:**

| # | Flujo | Verificación |
|---|-------|-------------|
| F25 | Email válido en formulario homepage | Mensaje de confirmación visible |
| F26 | Email inválido en formulario homepage | Error de validación visible |

**Panel admin — facturas pendientes:**

| # | Flujo | Verificación |
|---|-------|-------------|
| F27 | Pedido con `invoice.status = 'draft'` en lista | Badge "Factura pendiente" visible en la fila |
| F28 | Clic en "Reintentar factura" (con Facturapi disponible) | Badge cambia a "Factura emitida", botón desaparece |

**Panel admin — casos negativos:**

| # | Flujo | Verificación |
|---|-------|-------------|
| F29 | Crear producto sin campos requeridos (nombre, precio, stock) | Errores de validación inline — formulario no se envía |
| F30 | Cargar imagen de producto con formato no permitido (ej. `.pdf`) | Error "formato no soportado", imagen no se sube |
| F31 | Actualizar estado de pedido a un estado inválido (ej. de `delivered` a `pending_payment`) | El sistema debe rechazar la transición inválida o mostrar advertencia |

**Total flujos funcionales: 31**

---

## Capa 3 — E2E en Staging (Playwright)

**Entorno:** `staging.doubleicards.com`  
**APIs:** Mercado Pago sandbox + Facturapi sandbox  
**Tarjeta de prueba MP:** 4013 1735 9472 5704 — CVV: 123, vencimiento: 11/25  
**RFC de prueba SAT:** XAXX010101000 (RFC genérico, siempre válido en sandbox)

### Flujo E2E 1: Compra completa como invitado (camino feliz)

```
1. Navegar al catálogo → filtrar por "Pokémon"
2. Abrir detalle de un producto con stock ≥ 1
3. Agregar al carrito → verificar contador navbar = 1
4. Ir a /carrito → verificar nombre, precio, subtotal correctos
5. Iniciar checkout:
   Paso 1: nombre completo, email de prueba, teléfono
   Paso 2: calle, número, colonia, ciudad, estado, CP válido
   Paso 3: esperar cotización Skydropx → seleccionar Estafeta
           verificar: total = subtotal + costo Estafeta
   Paso 4: dejar CFDI desactivado
   Paso 5: pagar con tarjeta sandbox 4013 1735 9472 5704
6. Verificar redirect a /pedido/confirmacion con número de pedido visible
7. Verificar en DB: order.payment_status = 'confirmed'
8. Verificar en DB: stock del producto decrementado en 1
9. Verificar que email de confirmación llegó al correo de prueba
```

**Criterio de paso:** número de pedido visible + stock decrementado + email recibido en <2 min.

---

### Flujo E2E 2: Compra con CFDI

```
1. Agregar producto diferente al carrito
2. Iniciar checkout → completar pasos 1 y 2
3. Paso 3: seleccionar DHL
4. Paso 4: activar toggle CFDI
          RFC: XAXX010101000
          Razón social: PÚBLICO EN GENERAL
          Uso CFDI: G03 (Gastos en general)
5. Paso 5: pagar con tarjeta sandbox
6. Verificar en DB: invoices.status = 'valid'
7. Verificar que email con PDF y XML llegó al correo de prueba
8. Descargar PDF desde el link del email → debe abrir correctamente
9. Descargar XML → debe ser un archivo XML válido (no vacío)
```

**Criterio de paso:** `invoices.status = 'valid'` + email con adjuntos recibido + archivos abribles.

---

### Flujo E2E 3: Error controlado de Skydropx

```
1. En staging: cambiar SKYDROPX_API_KEY a valor inválido en .env → reiniciar servidor
2. Iniciar checkout con dirección válida → llegar a paso 3
3. Verificar: mensaje de error controlado visible
   "No pudimos cotizar envíos. Selecciona Recoger en tienda o intenta de nuevo."
4. Verificar: opción "Recoger en tienda — GRATIS" sigue disponible
5. Seleccionar "Recoger en tienda" → completar pago
6. Verificar en DB: shipping_method = 'pickup', shipping_cost = 0
7. Restaurar SKYDROPX_API_KEY correcta → reiniciar servidor
```

**Criterio de paso:** checkout no se rompe cuando Skydropx falla, pickup funciona como fallback.

---

### Flujo E2E 4: Fallo de CFDI → reintento manual desde admin

```
1. En staging: cambiar FACTURAPI_API_KEY a valor inválido en .env → reiniciar servidor
2. Hacer compra con CFDI activado (RFC: XAXX010101000)
3. Verificar en DB: invoices.status = 'draft'
4. Verificar que Irving recibió email de alerta "Factura pendiente" con número de pedido
5. Ir a /admin/pedidos → verificar badge "Factura pendiente" en el pedido
6. Restaurar FACTURAPI_API_KEY correcta en staging → reiniciar servidor
7. En detalle del pedido: clic en botón "Reintentar factura"
8. Verificar en DB: invoices.status cambia de 'draft' a 'valid'
9. Verificar que el cliente recibe email con PDF y XML
```

**Criterio de paso:** Irving puede resolver facturas fallidas desde el admin sin tocar código.

---

### Flujo E2E 6: Tarjeta rechazada (Mercado Pago sandbox)

```
1. Agregar producto al carrito → iniciar checkout completo
2. En paso de pago: usar tarjeta de rechazo sandbox MP: 4000 0000 0000 0002
3. Verificar: mensaje de error visible en UI "Pago rechazado, intenta con otro método"
4. Verificar en DB: order.payment_status = 'failed'
5. Verificar en DB: stock del producto NO fue decrementado
6. Verificar: el usuario puede reintentar el pago sin iniciar un nuevo pedido
```

**Criterio de paso:** pago fallido no descuenta stock, UI informa al usuario, reintento posible.

---

### Flujo E2E 7: Pago por OXXO (confirmación diferida)

```
1. Agregar producto al carrito → iniciar checkout completo
2. En paso de pago: seleccionar método OXXO Pay
3. Verificar: MP genera referencia OXXO y la muestra en pantalla
4. Verificar en DB: order.payment_status = 'pending', order_status = 'pending_payment'
5. Verificar en DB: stock NO decrementado aún (pago no confirmado)
6. Simular confirmación de pago OXXO vía webhook sandbox de MP
7. Verificar en DB: order.payment_status = 'confirmed', stock decrementado
8. Verificar que email de confirmación llegó al correo de prueba
```

**Criterio de paso:** pedido OXXO queda en pending correctamente, confirma solo al recibir webhook.

---

### Flujo E2E 8: Webhook de pago duplicado (idempotencia)

```
1. Completar una compra exitosa (Flujo E2E 1) — anotar el payment_reference
2. Reenviar el mismo payload del webhook de MP al backend (mismo payment_reference)
3. Verificar en DB: stock del producto NO se decrementó dos veces
4. Verificar en DB: solo existe 1 registro de confirmación, no duplicados en orders
5. Verificar: el backend devuelve 200 (no error) — procesó idempotentemente
```

**Criterio de paso:** el mismo webhook dos veces no genera doble descuento de stock ni pedido duplicado.

---

### Flujo E2E 9: Sesión de Clerk expira durante el checkout

```
1. Iniciar sesión con cuenta de usuario
2. Agregar producto al carrito → llegar al paso 3 del checkout
3. Forzar expiración del token de Clerk (modificar manualmente en DevTools → Application → Cookies)
4. Intentar avanzar al paso 4
5. Verificar: el sistema detecta la sesión inválida y muestra aviso
   "Tu sesión expiró. Inicia sesión de nuevo para continuar."
6. Verificar: al re-autenticarse, el carrito persiste (no se pierde el progreso)
```

**Criterio de paso:** sesión expirada no causa error silencioso, carrito sobrevive la re-autenticación.

---

### Flujo E2E 10: Checkout con carrito vacío por manipulación de URL

```
1. Sin productos en el carrito, navegar directamente a /checkout
2. Verificar: redirige a /catalogo o muestra página "tu carrito está vacío"
3. No debe aparecer pantalla en blanco ni error 500
4. Intentar hacer POST directo a /api/payments/create-preference sin order_id válido
5. Verificar: backend devuelve 400 con mensaje de error, no 500
```

**Criterio de paso:** manipulación de URL no genera comportamiento inesperado ni errores no manejados.

---

### Flujo E2E 5: Arrival notification agrupada (Brevo)

```
1. Iniciar sesión como admin en staging
2. Ir a /admin/productos → crear producto nuevo con is_active = true
3. Verificar que email de arrival llegó a la lista de suscriptores de prueba en <3 min
4. Crear 3 productos más en menos de 10 minutos
5. Verificar que solo llegó 1 email agrupado (no 4 emails separados)
```

**Criterio de paso:** 1 email por ráfaga de publicaciones ≤10 min, no spam.

---

## Capa 4 — Checklist Manual de Seguridad y Correctitud

Ejecutar manualmente antes de hacer merge a `main`. Marcar cada ítem como ✅ o ❌.

### Seguridad del bundle frontend

| # | Verificación | Comando |
|---|-------------|---------|
| S1 | Ninguna API key en el bundle | `npm run build && grep -r "sk_" dist/ && grep -r "API_KEY" dist/` — debe devolver vacío |
| S2 | `SUPABASE_SERVICE_KEY` no está en el bundle | `grep -r "service_role" dist/` — debe devolver vacío |
| S3 | Sin `console.log` en producción | `grep -r "console.log" dist/` — debe devolver vacío |

### Seguridad de acceso y datos

| # | Verificación | Cómo hacerlo |
|---|-------------|-------------|
| S4 | Usuario A no ve pedidos de usuario B | 2 cuentas → con JWT de A hacer `GET /api/orders` → solo pedidos de A |
| S5 | `/api/admin/*` sin JWT devuelve 401 | `curl -X GET https://staging.doubleicards.com/api/admin/orders` sin header |
| S6 | `/api/admin/products` POST sin JWT devuelve 401 | `curl -X POST` sin Authorization |

### Correctitud de stock

| # | Verificación | Cómo hacerlo |
|---|-------------|-------------|
| S7 | Stock no baja en pagos fallidos | Checkout → abandonar en paso de pago → verificar stock sin cambio en DB |
| S8 | Stock no queda negativo | Producto con stock = 1 → abrir dos tabs del navegador → iniciar checkout en ambas simultáneamente → completar pago en tab 1 → intentar completar en tab 2 → solo una debe confirmar, el stock no debe quedar en -1 |
| S9 | Producto agotado no se puede agregar | En DB: `stock = 0` → verificar botón "Agotado" deshabilitado en PDP |

### Variables de entorno y configuración

| # | Verificación | Cómo hacerlo |
|---|-------------|-------------|
| S10 | `.env` no está en el repositorio | `git log --all --full-history -- "**/.env"` → debe devolver vacío |
| S11 | `.env.example` completo | Comparar `.env.example` con `.env` real — ninguna variable debe faltar |
| S12 | `NODE_ENV=production` en staging | Verificar en logs del servidor al arrancar |

### Experiencia en dispositivos reales

| # | Verificación | Cómo hacerlo |
|---|-------------|-------------|
| S13 | iPhone SE (375px) sin overflow | Abrir staging en Safari iOS → catálogo, PDP y checkout |
| S14 | Botón WhatsApp abre en mobile | Tap en botón flotante → abre WhatsApp con número de Irving |
| S15 | Carrito persiste al cerrar Safari | Agregar producto → cerrar tab → reabrir → carrito con producto |

### Emails transaccionales

| # | Verificación | Cómo hacerlo |
|---|-------------|-------------|
| S16 | Correo de confirmación con todos los datos | Revisar email: número de pedido, artículos, total, método de envío |
| S17 | CFDI adjunto abre correctamente | Descargar PDF y XML desde email — ambos válidos y no vacíos |
| S18 | Email de bienvenida al suscribirse | Email nuevo en formulario homepage → verificar inbox en <2 min |

---

## Criterio de Go-Live

El proyecto está listo para merge a `main` cuando:

- [ ] Capa 1: todos los ~22 casos de API pasan al 100%
- [ ] Capa 2: 34 screenshots sin overflow + 31 flujos funcionales sin fallos (incluyendo negativos)
- [ ] Capa 3: los 10 flujos E2E pasan en staging con APIs sandbox (5 happy path + 5 negativos)
- [ ] Capa 4: los 18 ítems del checklist manual marcados como ✅
- [ ] El requisito de gestión de facturas fallidas está implementado en backend y admin
- [ ] Emiliano aprueba en staging antes del merge a `main`

---

## Resumen de cobertura

| Capa | Tipo | Cantidad |
|------|------|---------|
| Capa 1 | Casos de prueba API (Jest + Supertest) | 22 |
| Capa 2 | Screenshots (Playwright MCP) | 34 |
| Capa 2 | Flujos funcionales UI (happy path + negativos) | 31 |
| Capa 3 | Flujos E2E en staging — happy path | 5 (~35 pasos) |
| Capa 3 | Flujos E2E en staging — casos negativos | 5 (~30 pasos) |
| Capa 4 | Verificaciones manuales de seguridad | 18 |
| **Total** | | **~160 verificaciones** |
