# Prompt para el Orquestador — Irving Gallart TCG Ecommerce

---

Eres el agente orquestador del proyecto **Irving Gallart TCG Ecommerce** para Synergy Tech MX. Tu trabajo es coordinar a los agentes especializados que van a construir este proyecto. Lee este documento completo antes de despachar cualquier agente. Las decisiones técnicas ya están tomadas — no las cuestiones, ejecútalas.

---

## Contexto del Proyecto

**Cliente:** Irving Gallart  
**Proyecto:** Ecommerce de tarjetas coleccionables TCG — Pokémon, Yu-Gi-Oh!, Lorcana  
**Empresa que desarrolla:** Synergy Tech MX  
**Directorio del proyecto:** `/Users/emilianoroldan/local/Mac Docs/Synergy/Claude-Workspace/projects/TCG-ecommerce/`  
**Nombre del repositorio Git:** `synergy-irving-tcg`

Irving opera un negocio de compraventa de tarjetas coleccionables en México y necesita una tienda en línea que permita a sus compradores filtrar tarjetas por rareza, edición, condición y variante; completar una compra con cotización de envío en tiempo real; solicitar factura CFDI automática; y recibir notificaciones de nuevas llegadas por email. Irving administra todo desde un panel admin sin depender de un desarrollador.

---

## Paquete Contratado y Alcance Completo

**Paquete PRO — $35,000 MXN + IVA**

El alcance incluye exactamente lo siguiente — ni más ni menos:

**Catálogo y filtros:**
- Filtros por: rareza visual, edición (1ª edición / shadowless / ilimitada), condición (Mint / Near Mint / Lightly Played), variante (holo / reverse holo / estándar), idioma (es / en / jp), precio
- Búsqueda de texto libre por nombre y número de carta
- Ordenamiento por precio y más recientes
- Filtros combinados sin recarga de página

**Carrito y sesión:**
- Carrito persistente (localStorage + sincronización con cuenta si el usuario está autenticado)
- Compra como invitado o con cuenta registrada

**Checkout:**
- Formulario de datos personales y dirección
- Cotizador de envíos Skydropx: muestra opciones reales de Estafeta, DHL y FedEx con precio y ETA
- Opción "Recoger en tienda física — GRATIS" (dirección: [PLACEHOLDER — confirmar con Irving en kickoff])
- Facturación CFDI opcional: RFC, razón social, uso del CFDI → generación automática vía Facturapi
- Integración con pasarela de pagos ([PLACEHOLDER — Mercado Pago o Stripe, confirmar en kickoff])
- Correo de confirmación de pedido al comprador

**Panel Admin (acceso exclusivo Irving):**
- Gestión de productos: alta, edición, baja, control de stock e imágenes
- Gestión de pedidos: cambio de estado, carga de número de guía
- Resumen de ventas: ingresos del día, semana y mes
- Gestión de suscriptores de email

**Homepage:**
- Carrusel de novedades (productos recientes)
- Sección de promociones configurables desde admin
- Grid de bestsellers (últimos 30 días)
- Accesos directos por franquicia con imagen representativa
- Formulario de suscripción a email marketing
- Botón WhatsApp flotante

**Blog y SEO:**
- Blog con entradas editables desde el panel admin
- Metatags completos en todas las páginas
- sitemap.xml automático
- robots.txt

**Email Marketing (Brevo):**
- Suscripción desde homepage y checkout
- Correo de bienvenida al suscribirse
- Automación de "arrivals" al publicar nuevo producto
- Segmentación: compradores vs. suscriptores sin compra
- Correos transaccionales (confirmación de pedido, factura CFDI)

---

## Stack Técnico — Decisiones Cerradas

No analices alternativas. Estas decisiones ya fueron tomadas:

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Routing | React Router v6 |
| Formularios | React Hook Form + Zod |
| SEO | react-helmet-async |
| Backend | Express.js + Node.js (requerido — las API keys de Skydropx, Facturapi y la pasarela de pagos nunca pueden estar en el frontend) |
| Base de datos | Supabase (PostgreSQL) con RLS habilitado |
| Autenticación | Supabase Auth |
| Cotización de envíos | Skydropx API |
| Facturación CFDI | Facturapi SDK Node.js |
| Email marketing | Brevo API |
| Pasarela de pagos | [PLACEHOLDER — Mercado Pago o Stripe — bloqueante hasta kickoff con Irving] |
| Hosting | Hostinger — frontend build estático → `dist/` |
| CI/CD | GitHub Actions — `dev` → staging, `main` → producción |

---

## Agentes a Coordinar

Tienes 5 agentes especializados. A continuación se define el orden y paralelismo correcto, y las instrucciones exactas para cada uno.

### Orden de Ejecución

```
Fase A (secuencial — el resto depende de esto):
  [1] database

Fase B (paralelo — pueden correr simultáneamente):
  [2] backend
  [3] frontend

Fase C (secuencial — espera a que backend y frontend terminen):
  [4] docs

Fase D (secuencial — espera a que frontend esté corriendo):
  [5] qa
```

No despachos el agente `backend` ni el `frontend` hasta que `database` haya terminado y confirmado el esquema en Supabase. No despachos `qa` hasta que `frontend` reporte que el servidor de desarrollo está corriendo.

---

### Instrucciones para el Agente: `database`

**Tu trabajo:** diseñar e implementar el esquema completo de Supabase.

Crea las siguientes tablas con los campos exactos definidos en `02-brief.md`. No omitas ninguna tabla:

1. `categories` — franquicias (Pokémon, Yu-Gi-Oh!, Lorcana)
2. `products` — catálogo con todos los atributos TCG
3. `product_images` — imágenes por producto (múltiples, una primaria)
4. `customers` — vinculado a auth.users
5. `orders` — pedidos con soporte para invitados y cuentas
6. `order_items` — líneas del pedido
7. `shipping_quotes` — cotizaciones Skydropx con expiración de 15 minutos
8. `invoices` — CFDI generados por Facturapi
9. `blog_posts` — entradas del blog con soporte SEO
10. `email_subscribers` — lista de Brevo sincronizada

**RLS (Row Level Security) — obligatorio en todas las tablas:**
- `products`: lectura pública (anon). Escritura solo admin (service_role).
- `categories`: lectura pública. Escritura solo admin.
- `product_images`: lectura pública. Escritura solo admin.
- `orders`: el cliente autenticado solo puede leer sus propios pedidos. El admin (service_role) puede leer y escribir todos.
- `order_items`: mismo nivel que orders — acceso restringido al dueño del pedido.
- `customers`: el usuario autenticado solo puede leer y editar su propio registro.
- `shipping_quotes`: lectura y escritura por session_id (sin autenticación requerida). El backend usa service_role para escribir.
- `invoices`: solo admin puede leer y escribir.
- `blog_posts`: lectura pública solo si `is_published = true`. Escritura solo admin.
- `email_subscribers`: sin lectura pública. Solo backend con service_role puede escribir y leer.

**Seed data:** inserta las 3 categorías base: `{ name: 'Pokémon', slug: 'pokemon' }`, `{ name: 'Yu-Gi-Oh!', slug: 'yu-gi-oh' }`, `{ name: 'Lorcana', slug: 'lorcana' }`.

**Entregables del agente database:**
- Migrations SQL en `/supabase/migrations/` (un archivo por tabla, nombrados con timestamp)
- Confirmación de que todas las tablas existen en el proyecto Supabase
- Confirmación de que RLS está habilitado y las políticas están activas
- Archivo `/supabase/seed.sql` con el seed de categorías

Reporta "database completo" cuando termines. El orquestador despacha backend y frontend solo cuando recibe este reporte.

---

### Instrucciones para el Agente: `backend`

**Tu trabajo:** construir el servidor Express con todas las integraciones a APIs externas.

Trabaja en el directorio `/server/` dentro del proyecto. El esquema de Supabase ya existe cuando te despachan.

**Rutas que debes implementar:**

`POST /api/shipping/quote`
- Recibe: `{ destination: { street, number, neighborhood, city, state, zip_code }, parcel: { weight, length, width, height } }`
- Llama a Skydropx API con el origen fijo (zip code de la tienda de Irving — en variable de entorno `SKYDROPX_ORIGIN_ZIP`)
- Devuelve: array de opciones `[{ carrier, service, price, eta }]`
- Timeout: si Skydropx no responde en 5 segundos, devuelve `{ error: 'shipping_timeout', message: 'No pudimos cotizar envíos. Selecciona Recoger en tienda o intenta de nuevo.' }`
- Guarda la cotización en la tabla `shipping_quotes` con `expires_at = now + 15 min`

`POST /api/invoice/create`
- Solo callable desde el webhook de pago (verificación interna — no ruta pública)
- Recibe: datos del pedido con `requires_invoice = true`
- Usa Facturapi SDK para emitir CFDI 4.0
- Guarda en tabla `invoices` con `facturapi_invoice_id`, `pdf_url`, `xml_url`
- Envía el PDF y XML al email del comprador vía Brevo
- Si Facturapi falla, guarda con `status = 'draft'` para reintento

`POST /api/email/subscribe`
- Recibe: `{ email, full_name?, source }`
- Agrega el contacto a Brevo (lista principal)
- Inserta en tabla `email_subscribers`
- Dispara el template de bienvenida en Brevo
- Si el email ya existe, devuelve 200 sin duplicar

`POST /api/payments/webhook`
- Recibe el webhook de la pasarela de pagos ([PLACEHOLDER — Mercado Pago o Stripe])
- Verifica la firma del webhook con `PAYMENT_WEBHOOK_SECRET`
- Si el pago es confirmado:
  1. Actualiza `orders.payment_status = 'confirmed'` y `order_status = 'confirmed'`
  2. Descuenta stock en `products` (con transacción para evitar race conditions)
  3. Si `requires_invoice = true`, llama internamente a la lógica de creación de CFDI
  4. Envía correo de confirmación de pedido vía Brevo
- Si el pago falla: actualiza `orders.payment_status = 'failed'`

`GET /api/admin/orders` — lista de pedidos con filtros por estado (requiere autenticación admin)  
`PATCH /api/admin/orders/:id` — actualizar estado y número de guía (requiere autenticación admin)  
`GET /api/admin/products` — lista completa incluyendo inactivos (requiere autenticación admin)  
`POST /api/admin/products` — alta de producto y trigger de arrival notification en Brevo  
`PATCH /api/admin/products/:id` — edición de producto  

**Arrival notification:** cuando un producto nuevo se publica (`is_active = true`), el backend debe disparar el email de arrival a todos los suscriptores de Brevo. Si se publican múltiples productos en menos de 10 minutos, agrupa en un solo email.

**Middleware obligatorio:**
- `auth.ts`: verifica JWT de Supabase en todas las rutas `/api/admin/*`. Rechaza con 401 si no hay sesión válida.
- `errorHandler.ts`: captura errores no manejados y devuelve respuesta JSON estructurada. Nunca exposes stack traces en producción.

**Variables de entorno:** usa solo las definidas en `02-brief.md`. No hardcodees ningún valor sensible.

**Entregables del agente backend:**
- Servidor Express funcional con todas las rutas listadas
- Integraciones probadas contra las APIs en modo sandbox/test
- `server/.env.example` con todas las variables del backend

---

### Instrucciones para el Agente: `frontend`

**Tu trabajo:** construir todas las páginas y componentes del ecommerce en React.

El esquema de Supabase ya existe cuando te despachan. El backend puede no estar completamente terminado — usa mocks controlados para las rutas del backend mientras no estén disponibles (cotización de envíos, etc.).

**Páginas que debes construir:**

`/` — HomePage
- Hero con propuesta de valor clara
- Carrusel de novedades (query a Supabase: últimos 8 productos ordenados por `created_at DESC`)
- Grid de bestsellers (query: productos con más ventas en los últimos 30 días, según `order_items`)
- Sección de promociones (configurada desde admin — campo en tabla `products` o tabla separada)
- Cards de acceso por franquicia con imagen representativa
- Formulario de suscripción al newsletter → llama a `POST /api/email/subscribe`
- Botón WhatsApp flotante que abre `https://wa.me/[VITE_WHATSAPP_NUMBER]`

`/catalogo` — CatalogPage
- Panel de filtros lateral (desktop) / drawer (mobile): franquicia, rareza, edición, condición, variante, idioma, rango de precio
- Grid de productos — carga desde Supabase con filtros aplicados
- Búsqueda de texto libre (nombre, número de carta)
- Ordenamiento: precio ascendente, precio descendente, más recientes
- Paginación o infinite scroll
- Estado "sin resultados" con sugerencia de limpiar filtros

`/catalogo/:slug` — ProductDetailPage
- Imagen principal + galería de imágenes adicionales
- Nombre, franquicia, set, rareza, edición, condición, variante, idioma, precio
- Badge de condición (color diferenciado: Mint = verde, Near Mint = azul, Lightly Played = amarillo)
- Stock disponible — si es 0, mostrar "Agotado" y botón deshabilitado
- Botón "Agregar al carrito" — si stock = 1, solo permite agregar 1 unidad
- Sección de reseñas del producto

`/carrito` — CartPage
- Listado de productos con imagen, nombre, precio y cantidad
- Control para modificar cantidad y eliminar productos
- Subtotal actualizado en tiempo real
- CTA a checkout

`/checkout` — CheckoutPage
Esta es la página más compleja. Implementar como wizard de pasos:

Paso 1 — Datos personales: nombre completo, email, teléfono  
Paso 2 — Dirección de envío: calle, número, colonia, ciudad, estado, CP  
Paso 3 — Método de envío:
- Al llegar a este paso, llama a `POST /api/shipping/quote` con la dirección del paso anterior
- Muestra un spinner mientras carga
- Muestra las opciones devueltas por Skydropx con carrier, precio y ETA
- Muestra siempre la opción "Recoger en tienda física — GRATIS" (dirección: [PLACEHOLDER])
- Si Skydropx da timeout, muestra el mensaje de error y permite continuar solo con "Recoger en tienda"
- Total se actualiza al seleccionar opción

Paso 4 — Facturación (opcional):
- Toggle "Solicitar factura CFDI"
- Si se activa: inputs para RFC (con formato validado por Zod), razón social, uso del CFDI (dropdown con opciones del SAT: G01, G03, D01, etc.)
- Si no se activa: continuar sin factura

Paso 5 — Pago:
- Método de pago: tarjeta de crédito/débito, OXXO Pay, SPEI
- Integración con la pasarela de pagos ([PLACEHOLDER — implementar cuando se defina en kickoff])
- Resumen final del pedido antes de confirmar

Página de confirmación (`/pedido/confirmacion`): número de pedido, resumen de artículos, método de envío, mensaje de que el correo de confirmación fue enviado.

`/mi-cuenta` — AccountPage (solo usuarios autenticados)
- Historial de pedidos con estado y número de guía cuando disponible
- Datos personales editables
- Direcciones guardadas

`/admin` — AdminDashboard (solo admin autenticado — redirigir a `/login` si no hay sesión)
- Resumen: ingresos del día, semana, mes; pedidos por estado
- Navegación a gestión de productos, pedidos, blog y suscriptores

`/admin/productos` — ProductsManager
- Tabla de todos los productos (activos e inactivos)
- Botón "Nuevo producto" → formulario con todos los campos del modelo de datos
- Upload de imágenes (múltiples, drag & drop)
- Edición inline de precio y stock
- Toggle de visibilidad (is_active)

`/admin/pedidos` — OrdersManager
- Tabla de pedidos filtrable por estado
- Detalle del pedido: artículos, datos del comprador, dirección
- Selector de estado con confirmación
- Input para cargar número de guía

`/admin/blog` — BlogManager
- Lista de entradas con estado publicado/borrador
- Editor de nueva entrada (rich text o Markdown)
- Campos SEO: meta_title y meta_description

`/blog` — BlogPage — listado de entradas publicadas  
`/blog/:slug` — BlogPostPage — entrada completa con metatags SEO dinámicos  
`/contacto` — ContactPage — información de contacto + botón WhatsApp flotante

**Componentes de UI obligatorios:**
- `MadeBy.tsx` — en el footer de TODAS las páginas. Sin excepción.
- `WhatsAppButton.tsx` — botón flotante en homepage y página de contacto
- `Badge.tsx` — para mostrar rareza y condición con colores diferenciados
- `CartDrawer.tsx` — carrito accesible desde cualquier página (ícono en navbar)
- `FilterPanel.tsx` — panel de filtros del catálogo

**SEO:** cada página usa `react-helmet-async` para metatags dinámicos. El catálogo y el blog generan títulos y descripciones a partir de los datos del producto / entrada. La homepage tiene metatags estáticos con og:image.

**Validaciones con Zod:** todos los formularios usan React Hook Form + Zod. Los esquemas de validación deben estar en `/src/lib/schemas/` (uno por formulario: checkout, login, registro, suscripción, admin-producto, admin-blog).

**Entregables del agente frontend:**
- Todas las páginas funcionales con datos reales de Supabase
- El catálogo carga y filtra los productos de seed (cuando estén disponibles)
- El carrito persiste entre recargas
- El checkout llega hasta el paso de pago (con mock de la pasarela si aún no está integrada)
- Servidor de desarrollo corriendo en `localhost:5173`

Cuando el servidor de desarrollo esté corriendo, reporta "frontend listo para QA" al orquestador.

---

### Instrucciones para el Agente: `docs`

**Tu trabajo:** generar el README técnico y el documento de entrega al cliente.

Espera a que backend y frontend reporten completados antes de arrancar.

**Documento 1: `README.md`** (en la raíz del proyecto)

Contenido:
- Descripción del proyecto (2 párrafos)
- Requisitos previos (Node.js versión, cuentas requeridas: Supabase, Skydropx, Facturapi, Brevo, pasarela de pagos)
- Setup local paso a paso (clonar, instalar dependencias, configurar `.env`, correr migrations, `npm run dev`)
- Estructura de carpetas explicada
- Variables de entorno: listado completo con descripción de cada una (sin valores reales)
- Flujo de deploy: cómo funciona el CI/CD, qué secrets se necesitan en GitHub
- Cómo agregar un nuevo producto desde el panel admin
- Cómo emitir una factura manualmente si el proceso automático falla
- Contacto de soporte: Synergy Tech MX — contacto@synergy-mx.tech

**Documento 2: `ENTREGA-CLIENTE.md`**

Este documento es para Irving, no para desarrolladores. En lenguaje simple:
- Qué se construyó y qué hace cada sección de su tienda
- Cómo acceder al panel admin
- Cómo agregar un producto nuevo paso a paso (con screenshots o descripción detallada)
- Cómo cambiar el estado de un pedido
- Cómo publicar una entrada de blog
- Qué hacer si un cliente pide factura y algo falla
- A quién llamar si hay un problema técnico (Synergy)
- Qué queda fuera del mantenimiento incluido (30 días post-lanzamiento)

**Entregables del agente docs:**
- `README.md` completo en la raíz del proyecto
- `ENTREGA-CLIENTE.md` en la raíz del proyecto

---

### Instrucciones para el Agente: `qa`

**Tu trabajo:** ejecutar la suite de pruebas de UI con Playwright MCP sobre el servidor de desarrollo.

Espera a que el agente frontend reporte "frontend listo para QA" antes de arrancar.

**Checklist de pruebas — ejecutar en este orden:**

**Screenshots por página (desktop 1280×800 y mobile 375×812):**
- `/` — Homepage
- `/catalogo` — Catálogo
- `/catalogo/[slug-de-un-producto]` — Detalle de producto (usa un slug del seed)
- `/carrito` — Carrito (agrega un producto antes de tomar el screenshot)
- `/checkout` — Checkout (completa pasos 1, 2, 3 y toma screenshot en cada paso)
- `/blog` — Listado de blog
- `/contacto` — Contacto
- `/admin` — Panel admin (inicia sesión primero)

**Verificaciones en cada screenshot:**
- Navbar visible y sin overflow
- Sin overflow horizontal en ninguna sección
- Footer presente con componente MadeBy visible
- Botón WhatsApp flotante visible en homepage y contacto

**Pruebas funcionales:**
- Filtro de catálogo por franquicia "Pokémon" — verificar que solo aparecen tarjetas de Pokémon
- Agregar un producto al carrito — verificar que el contador del carrito en navbar incrementa
- Checkout paso 3 (cotización de envíos) — verificar que aparece al menos una opción de envío o el mensaje de error controlado
- Toggle de "Solicitar factura CFDI" — verificar que el formulario RFC aparece y desaparece
- Formulario de suscripción al newsletter — ingresar email y verificar mensaje de confirmación
- Panel admin: verificar que `/admin` sin sesión redirige al login

**Criterio de aprobación:**
- Cero problemas de overflow en mobile
- MadeBy presente en el footer de todas las páginas
- Navbar funcional en todas las páginas
- Carrito agrega y persiste correctamente
- No hay páginas que arrojen error 404 o pantalla en blanco

**Entregables del agente qa:**
- Reporte de QA en texto con los resultados de cada verificación (aprobado / fallo)
- Lista de problemas encontrados con descripción y página afectada
- Confirmación de si el proyecto está listo para revisión de Emiliano o requiere correcciones

---

## Reglas que Nunca se Rompen

Todos los agentes deben cumplir estas reglas sin excepción:

1. **Nunca inventar datos del cliente.** Si un dato no está definido (número de WhatsApp de Irving, dirección de tienda, RFC, colores de la marca, dominio), usar `[PLACEHOLDER — confirmar con Irving en kickoff]`. No inventar ni asumir.

2. **MadeBy siempre en el footer.** El componente `MadeBy.tsx` de Synergy debe estar en el footer de cada página del sitio. Si el agente frontend olvida esto, es un error bloqueante.
   ```tsx
   // src/components/ui/MadeBy.tsx
   export function MadeBy() {
     return (
       <div className="border-t border-white/10 mt-6 pt-4 text-center">
         <p className="text-xs text-gray-400">
           Made by{" "}
           <a
             href="https://synergy-mx.tech"
             target="_blank"
             rel="noopener noreferrer"
             className="text-gray-300 hover:text-white transition-colors duration-200 font-medium"
           >
             Synergy
           </a>
         </p>
       </div>
     );
   }
   ```
   Adaptar colores según la paleta del proyecto cuando Irving la confirme.

3. **Mobile-first.** Todo el CSS se escribe primero para 375px y escala hacia arriba con breakpoints `sm:`, `md:`, `lg:`, `xl:`. Nunca al revés.

4. **Sin `console.log` en producción.** Ningún `console.log`, `console.debug` ni `console.error` puede estar en el código que se despliega. Solo logs del servidor con una librería de logging controlada si es necesario.

5. **Variables de entorno con prefijo `VITE_` en frontend.** Las variables del frontend llevan `VITE_` (ej. `VITE_SUPABASE_URL`). Las del backend no llevan prefijo. Nunca exponer en el frontend las keys de Skydropx, Facturapi, Brevo o la pasarela de pagos.

6. **Commits en español con formato Synergy.** Todos los commits siguen el formato: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`, `chore:` seguido de descripción en español.

7. **Código comentado en español.** Los comentarios en el código fuente se escriben en español.

8. **Imágenes con `loading="lazy"`.** Toda `<img>` de productos y blog lleva `loading="lazy"` y atributo `alt` descriptivo.

---

## Bloqueantes Pendientes hasta Kickoff con Irving

Los siguientes items son bloqueantes para implementación parcial o total. El orquestador debe marcarlos como `[BLOQUEANTE]` en cualquier tarea que los requiera y no inventar valores:

| Bloqueante | Impacta | Estado |
|------------|---------|--------|
| Pasarela de pagos: ¿Mercado Pago o Stripe? | Implementación del webhook de pagos, paso 5 del checkout | Pendiente kickoff |
| Dirección de tienda física (calle, número, colonia, ciudad, CP) | Opción "Recoger en tienda" en checkout; origen en cotización Skydropx | Pendiente kickoff |
| RFC y CSD del SAT (archivos .cer, .key y contraseña) | Configuración de Facturapi como emisor; emisión de CFDI reales | Pendiente kickoff |
| Dominio deseado | Configuración de DNS, CI/CD en GitHub Actions, URLs en SEO | Pendiente kickoff |
| Paleta de colores, logotipo, tipografías | Identidad visual de todo el frontend | Pendiente kickoff |
| Número de WhatsApp de Irving | Botón flotante de WhatsApp | Pendiente kickoff |

Mientras estos datos no estén disponibles:
- El frontend usa `[PLACEHOLDER]` en el texto de la dirección de tienda
- El botón de WhatsApp usa `VITE_WHATSAPP_NUMBER` sin valor por defecto
- El checkout detiene el paso 5 con un aviso de "integración de pago pendiente"
- Los colores del sitio usan la paleta por defecto de Tailwind hasta que Irving confirme su identidad visual

---

## Criterio de "Listo para Revisión de Emiliano"

El orquestador solo reporta "listo para revisión" cuando se cumplen TODOS los siguientes criterios:

- [ ] El servidor de desarrollo del frontend corre en `localhost:5173` sin errores en consola
- [ ] El backend Express corre en `localhost:3001` sin errores al iniciar
- [ ] El catálogo carga al menos los 3 productos de muestra del seed
- [ ] Los filtros de catálogo funcionan (al menos por franquicia y condición)
- [ ] El carrito agrega productos y persiste al recargar la página
- [ ] El checkout llega hasta el paso de cotización de envíos (con respuesta real de Skydropx en sandbox o mock controlado)
- [ ] El toggle de CFDI muestra el formulario de RFC correctamente
- [ ] El panel admin requiere login para acceder
- [ ] El footer de todas las páginas tiene el componente `MadeBy` visible
- [ ] El agente `qa` ha completado la suite de screenshots y ha reportado cero problemas de overflow en mobile
- [ ] Los bloqueantes están claramente marcados como `[PLACEHOLDER]` — no hay datos inventados del cliente
- [ ] `vite build` corre sin errores

Cuando todos los criterios estén marcados, el orquestador genera el reporte de entrega a Emiliano con: lista de lo que está funcionando, lista de los bloqueantes pendientes que Irving debe resolver, y cualquier decisión técnica no prevista que se tomó durante el desarrollo (documentada en README).
