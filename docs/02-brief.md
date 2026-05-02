# Brief Técnico — Irving Gallart TCG Ecommerce

**Cliente:** Irving Gallart  
**Proyecto:** Ecommerce especializado TCG  
**Paquete:** PRO — $35,000 MXN 
**Elaborado por:** Synergy Tech MX  
**Fecha:** Mayo 2026  
**Versión:** 1.0

---

## Resumen Ejecutivo

Irving Gallart opera un negocio de compraventa de tarjetas coleccionables TCG (Trading Card Games) en México, con foco en las franquicias Pokémon, Yu-Gi-Oh! y Lorcana. Su operación actual carece de una vitrina digital propia que le permita escalar más allá de su red de contactos directa y de canales informales como Instagram o grupos de WhatsApp. El problema central es la fricción de compra: sin catálogo filtrable, sin precios públicos actualizados y sin checkout integrado, Irving pierde ventas que no puede atender manualmente a escala.

Lo que se va a construir es un ecommerce especializado que replique la lógica de un coleccionista avanzado: filtros por rareza, edición, condición y variante; carrito persistente; checkout completo en MXN con cotización de envíos en tiempo real y generación automática de CFDI; panel admin para que Irving gestione su inventario sin depender de un desarrollador. La plataforma también incluye un blog SEO para posicionamiento orgánico en búsquedas de coleccionismo y un sistema de email marketing automatizado para notificar arrivals a su base de compradores.

El proyecto se construye sobre el stack estándar de Synergy (React + Vite + TypeScript + Tailwind CSS en frontend, Express + Node.js en backend, Supabase como base de datos) con integraciones a APIs externas especializadas: Skydropx para cotización de paqueterías, Facturapi para emisión de CFDI 4.0 y Brevo para email marketing. El resultado esperado es una tienda operativa en producción en un plazo de 6-7 semanas desde el kickoff.

---

## Tipo de Proyecto

Ecommerce especializado TCG (Trading Card Games) — B2C, mercado mexicano, operación unipersonal administrada por el cliente.

---

## Stack Técnico Completo

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Frontend framework | React + Vite + TypeScript | Stack estándar Synergy. Vite para build rápido en producción. |
| Estilos | Tailwind CSS | Utility-first, mobile-first nativo, velocidad de prototipado. |
| Routing | React Router v6 | Multipágina con navegación SPA. |
| Formularios | React Hook Form + Zod | Validación declarativa con tipado estricto. Ideal para checkout complejo. |
| SEO | react-helmet-async | Metatags dinámicos por página sin perder el modelo SPA. |
| Backend | Express.js + Node.js | Requerido porque el proyecto necesita APIs con keys privadas (Skydropx, Facturapi). Sin Express, esas keys quedarían expuestas en el frontend — inaceptable. |
| Base de datos | Supabase (PostgreSQL) | Estándar Synergy. RLS nativo para seguridad por fila. SDK JavaScript maduro. Realtime para actualización de stock. |
| Autenticación | Supabase Auth | Gestión de sesiones de clientes y del admin sin infraestructura adicional. |
| Cotización de envíos | Skydropx API | Mejor latencia y documentación Node.js para volumen naciente en México. Soporta Estafeta, DHL y FedEx desde una sola integración. |
| Facturación CFDI | Facturapi | SDK Node.js maduro con integración Express nativa. Soporte completo CFDI 4.0, manejo de CSD y generación de PDF/XML. |
| Email marketing | Brevo | Automaciones desbloqueadas en plan gratuito. API REST bien documentada. Escala predecible al crecer la lista. |
| Pasarela de pagos | Mercado Pago (recomendado) | Cobertura OXXO Pay y SPEI — los métodos de pago más usados por compradores TCG en México. Decisión final en kickoff. |
| Hosting | Hostinger | Estándar Synergy. Build estático del frontend → `dist/`. Backend Express en subdominio o mismo servidor según configuración. |
| Deploy | GitHub Actions | CI/CD automático: `dev` → staging, `main` → producción. |

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                        │
│                  (navegador / smartphone)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                    FRONTEND — React + Vite                   │
│   Hostinger /public_html/   |   staging.domain/public_html/ │
│                                                             │
│  Homepage  |  Catálogo  |  PDP  |  Carrito  |  Checkout     │
│  Blog      |  Mi cuenta |  Admin Panel                      │
│                                                             │
│  react-helmet-async (SEO) | React Router v6 | Tailwind CSS  │
└──────────┬───────────────────────────────────┬──────────────┘
           │ fetch / axios (HTTPS)             │ Supabase JS Client
           │ (solo rutas de backend)           │ (queries directas)
┌──────────▼──────────────┐      ┌─────────────▼──────────────┐
│   BACKEND — Express.js  │      │   SUPABASE (PostgreSQL)    │
│   Node.js               │      │                            │
│                         │      │  products                  │
│  /api/shipping/quote    │      │  product_variants          │
│  /api/invoice/create    │      │  categories                │
│  /api/email/subscribe   │      │  orders, order_items       │
│  /api/payments/webhook  │      │  customers                 │
│  /api/admin/*           │      │  shipping_quotes           │
│                         │      │  invoices                  │
│  Variables de entorno:  │      │  blog_posts                │
│  - SKYDROPX_API_KEY     │      │  email_subscribers         │
│  - FACTURAPI_API_KEY    │      │                            │
│  - BREVO_API_KEY        │      │  RLS habilitado en todas   │
│  - PAYMENT_SECRET_KEY   │      │  las tablas sensibles      │
│  - SUPABASE_SERVICE_KEY │      │                            │
└──────────┬──────────────┘      └────────────────────────────┘
           │
    ┌──────┴────────────────────────────────┐
    │         INTEGRACIONES EXTERNAS        │
    ├───────────────────────────────────────┤
    │  Skydropx API   → cotización envíos   │
    │  Facturapi SDK  → emisión CFDI 4.0    │
    │  Brevo API      → email marketing     │
    │  Mercado Pago   → procesamiento pago  │
    └───────────────────────────────────────┘
```

---

## Modelo de Datos

### Tabla: `categories`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| name | text | Pokémon, Yu-Gi-Oh!, Lorcana |
| slug | text UNIQUE | pokemon, yu-gi-oh, lorcana |
| description | text | Descripción breve |
| image_url | text | Imagen representativa |
| created_at | timestamptz | Fecha de creación |

### Tabla: `products`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| category_id | uuid FK → categories | Franquicia |
| name | text | Nombre de la carta |
| card_number | text | Número en el set (ej. 006/102) |
| set_name | text | Nombre del set/expansión |
| edition | text | 1st_edition, shadowless, unlimited |
| language | text | es, en, jp |
| rarity | text | Common, Uncommon, Rare, Ultra Rare, Secret Rare, etc. |
| condition | text | mint, near_mint, lightly_played |
| variant | text | standard, holo, reverse_holo |
| price | numeric(10,2) | Precio en MXN |
| stock | integer | Unidades disponibles |
| is_active | boolean | Visibilidad en catálogo |
| slug | text UNIQUE | URL amigable del producto |
| description | text | Descripción adicional opcional |
| created_at | timestamptz | Fecha de alta |
| updated_at | timestamptz | Última modificación |

### Tabla: `product_images`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| product_id | uuid FK → products | Producto asociado |
| url | text | URL de la imagen en storage |
| is_primary | boolean | Imagen principal del listing |
| sort_order | integer | Orden de presentación |

### Tabla: `customers`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK (= auth.users.id) | Vinculado a Supabase Auth |
| email | text UNIQUE | Correo del cliente |
| full_name | text | Nombre completo |
| phone | text | Teléfono de contacto |
| default_address | jsonb | Dirección guardada (calle, num, colonia, ciudad, estado, CP) |
| created_at | timestamptz | Fecha de registro |

### Tabla: `orders`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| customer_id | uuid FK → customers | Puede ser null si es invitado |
| guest_email | text | Email invitado (si no hay cuenta) |
| guest_name | text | Nombre invitado |
| guest_phone | text | Teléfono invitado |
| shipping_address | jsonb | Dirección de entrega completa |
| shipping_method | text | estafeta, dhl, fedex, pickup |
| shipping_cost | numeric(10,2) | Costo de envío en MXN |
| subtotal | numeric(10,2) | Suma de productos |
| total | numeric(10,2) | subtotal + shipping_cost |
| payment_method | text | credit_card, oxxo, spei |
| payment_status | text | pending, confirmed, failed |
| payment_reference | text | ID de la transacción en la pasarela |
| order_status | text | pending_payment, confirmed, preparing, shipped, delivered, cancelled |
| tracking_number | text | Número de guía (cuando está disponible) |
| requires_invoice | boolean | Si el cliente solicitó CFDI |
| created_at | timestamptz | Fecha del pedido |
| updated_at | timestamptz | Última actualización |

### Tabla: `order_items`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| order_id | uuid FK → orders | Pedido |
| product_id | uuid FK → products | Producto |
| quantity | integer | Unidades |
| unit_price | numeric(10,2) | Precio al momento de la compra |
| subtotal | numeric(10,2) | quantity × unit_price |

### Tabla: `shipping_quotes`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| session_id | text | ID de sesión del comprador |
| destination_address | jsonb | Dirección consultada |
| quotes_response | jsonb | Respuesta completa de Skydropx |
| selected_carrier | text | Paquetería elegida |
| selected_cost | numeric(10,2) | Costo elegido |
| expires_at | timestamptz | Vigencia de la cotización (15 min) |
| created_at | timestamptz | Fecha de consulta |

### Tabla: `invoices`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| order_id | uuid FK → orders | Pedido facturado |
| rfc | text | RFC del receptor |
| razon_social | text | Razón social del receptor |
| cfdi_use | text | Uso del CFDI (G01, G03, etc.) |
| facturapi_invoice_id | text | ID del documento en Facturapi |
| pdf_url | text | URL del PDF generado |
| xml_url | text | URL del XML generado |
| status | text | draft, valid, cancelled |
| created_at | timestamptz | Fecha de emisión |

### Tabla: `blog_posts`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| title | text | Título del artículo |
| slug | text UNIQUE | URL amigable |
| body | text | Contenido en Markdown o HTML |
| excerpt | text | Resumen para listado y metatags |
| featured_image_url | text | Imagen destacada |
| category_id | uuid FK → categories | Franquicia o "General" |
| tags | text[] | Etiquetas SEO |
| is_published | boolean | Publicado en el blog |
| published_at | timestamptz | Fecha de publicación visible |
| meta_title | text | Title tag personalizado |
| meta_description | text | Meta description personalizado |
| created_at | timestamptz | Fecha de creación |
| updated_at | timestamptz | Última modificación |

### Tabla: `email_subscribers`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| email | text UNIQUE | Correo suscrito |
| full_name | text | Nombre (opcional) |
| source | text | homepage_form, checkout, manual |
| is_buyer | boolean | Ha realizado al menos 1 pedido |
| brevo_contact_id | text | ID en Brevo para sincronización |
| subscribed_at | timestamptz | Fecha de alta |
| unsubscribed_at | timestamptz | Fecha de baja (si aplica) |

---

## Flujos Críticos

### Flujo 1: Compra Completa

```
1. Usuario navega el catálogo y filtra por franquicia, rareza, condición
2. Agrega producto al carrito → stock se reserva (soft lock)
3. Accede al carrito → revisa artículos y subtotal
4. Inicia checkout:
   a. Ingresa datos personales (nombre, email, teléfono)
   b. Ingresa dirección de envío
   c. Sistema llama a /api/shipping/quote con la dirección
      → Backend consulta Skydropx API
      → Devuelve opciones: {Estafeta, DHL, FedEx} con precio y ETA
   d. Usuario selecciona opción de envío (o "Recoger en tienda — GRATIS")
   e. Total se actualiza: subtotal + shipping_cost
5. (Opcional) Usuario activa "Solicitar factura CFDI":
   a. Ingresa RFC, razón social, uso del CFDI
   b. Datos se guardan en el pedido con requires_invoice = true
6. Usuario procede al pago:
   a. Selecciona método: tarjeta / OXXO / SPEI
   b. Se inicializa sesión de pago en Mercado Pago
   c. Usuario completa el pago en la interfaz de MP
7. Mercado Pago dispara webhook → /api/payments/webhook
   a. Backend verifica la firma del webhook
   b. Actualiza order.payment_status = 'confirmed'
   c. Descuenta stock de los productos en Supabase
   d. Si requires_invoice = true → llama a /api/invoice/create
   e. Envía correo de confirmación vía Brevo
8. Usuario ve página de confirmación con número de pedido
```

### Flujo 2: Cotización de Envío (Skydropx)

```
1. Frontend envía POST /api/shipping/quote con:
   {
     destination: { street, number, neighborhood, city, state, zip_code },
     parcel: { weight: [kg estimado], length, width, height }
   }
2. Backend construye el payload para Skydropx:
   {
     origin: { zip_code: "[tienda Irving]" },
     destination: { zip_code: "[CP del comprador]" },
     parcel: { weight, length, width, height }
   }
3. Backend llama a Skydropx API con SKYDROPX_API_KEY (nunca expuesta al cliente)
4. Skydropx responde con array de opciones de paquetería
5. Backend filtra y formatea la respuesta:
   [
     { carrier: "Estafeta", service: "Terrestre", price: 85.00, eta: "3-5 días" },
     { carrier: "DHL", service: "Express", price: 145.00, eta: "1-2 días" },
     { carrier: "FedEx", service: "Economy", price: 110.00, eta: "2-3 días" }
   ]
6. Respuesta llega al frontend → se renderiza en el selector de envío
7. Si Skydropx tarda > 5 segundos → backend devuelve error controlado
   Frontend muestra: "No pudimos cotizar envíos en este momento. Selecciona
   'Recoger en tienda' o intenta de nuevo."
8. Cotización seleccionada se guarda en shipping_quotes con expires_at = now + 15min
```

### Flujo 3: Emisión CFDI (Facturapi)

```
1. Pago confirmado + requires_invoice = true
2. Backend llama a /api/invoice/create con:
   {
     order_id, rfc, razon_social, cfdi_use,
     items: [{ description, quantity, unit_price, tax }]
   }
3. Backend construye el objeto factura para Facturapi SDK:
   {
     customer: { legal_name, tax_id, email },
     items: [...],
     use: cfdi_use,
     payment_form: "28" (SPEI) | "04" (tarjeta) | "03" (OXXO)
   }
4. Facturapi genera el CFDI y timbra ante el SAT
5. Facturapi devuelve { id, pdf_url, xml_url, status: "valid" }
6. Backend guarda en tabla invoices
7. Backend envía email al comprador vía Brevo con PDF y XML adjuntos
8. Si Facturapi falla: se guarda el intento en invoices con status = "draft"
   y se reintenta en el siguiente ciclo (cron job de reintentos)
```

### Flujo 4: Arrival Notification (Brevo)

```
1. Irving publica un nuevo producto desde el panel admin (is_active = true)
2. Supabase Database Webhook (o cron en backend) detecta el nuevo producto
3. Backend llama a Brevo API:
   POST /v3/smtp/email
   {
     templateId: [template "nuevo arrival"],
     to: [lista "Todos los suscriptores"],
     params: { product_name, category, price, url, image }
   }
4. Brevo despacha el email a la lista completa de suscriptores
5. Se registra el envío en el log de Brevo para estadísticas
Nota: si Irving publica múltiples productos en un lapso de 10 minutos,
el backend agrupa las notificaciones en un único email resumen para evitar spam.
```

---

## Variables de Entorno Requeridas

### Backend (`/server/.env`)
```
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=          # service_role key — nunca en frontend

# Skydropx
SKYDROPX_API_KEY=
SKYDROPX_ORIGIN_ZIP=           # CP de la tienda física de Irving

# Facturapi
FACTURAPI_API_KEY=
FACTURAPI_LEGAL_NAME=          # Razón social de Irving como emisor
FACTURAPI_RFC=                 # RFC de Irving

# Brevo
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=
BREVO_ARRIVAL_TEMPLATE_ID=
BREVO_WELCOME_TEMPLATE_ID=
BREVO_ORDER_CONFIRM_TEMPLATE_ID=

# Pasarela de pagos (Mercado Pago o Stripe — definir en kickoff)
PAYMENT_ACCESS_TOKEN=
PAYMENT_WEBHOOK_SECRET=

# General
PORT=3001
NODE_ENV=production
```

### Frontend (`/.env`)
```
# Supabase (anon key — pública, solo lectura controlada por RLS)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# URL del backend
VITE_API_URL=                  # ej. https://api.irvingcards.com.mx

# WhatsApp
VITE_WHATSAPP_NUMBER=          # número de Irving para el botón flotante
```

### `.env.example` (para ambos)
Ambos archivos `.env` deben tener su correspondiente `.env.example` con todos los keys sin valores, comprometidos en el repositorio.

---

## Estructura de Carpetas

```
synergy-double-i/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← CI/CD: dev→staging, main→producción
├── public/
│   └── images/                 ← assets estáticos públicos
├── src/                        ← FRONTEND
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx       ← rareza, condición
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── WhatsAppButton.tsx
│   │   │   └── MadeBy.tsx      ← obligatorio Synergy
│   │   └── sections/
│   │       ├── Hero.tsx
│   │       ├── FeaturedCarousel.tsx
│   │       ├── BestsellerGrid.tsx
│   │       ├── CategoryCards.tsx
│   │       ├── NewsletterSignup.tsx
│   │       └── Footer.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── CatalogPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── OrderConfirmationPage.tsx
│   │   ├── AccountPage.tsx
│   │   ├── BlogPage.tsx
│   │   ├── BlogPostPage.tsx
│   │   ├── ContactPage.tsx
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── ProductsManager.tsx
│   │       ├── OrdersManager.tsx
│   │       └── BlogManager.tsx
│   ├── hooks/
│   │   ├── useCart.ts
│   │   ├── useProducts.ts
│   │   ├── useShippingQuote.ts
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts            ← interfaces TypeScript del dominio
├── server/                     ← BACKEND Express
│   ├── index.ts
│   ├── routes/
│   │   ├── shipping.ts         ← /api/shipping/quote
│   │   ├── invoices.ts         ← /api/invoice/create
│   │   ├── email.ts            ← /api/email/subscribe
│   │   ├── payments.ts         ← /api/payments/webhook
│   │   └── admin.ts            ← /api/admin/*
│   ├── controllers/
│   │   ├── shippingController.ts
│   │   ├── invoiceController.ts
│   │   ├── emailController.ts
│   │   └── paymentController.ts
│   ├── middleware/
│   │   ├── auth.ts             ← verificación JWT Supabase
│   │   └── errorHandler.ts
│   └── lib/
│       ├── supabase.ts         ← cliente con service_role key
│       ├── skydropx.ts         ← wrapper Skydropx API
│       ├── facturapi.ts        ← wrapper Facturapi SDK
│       └── brevo.ts            ← wrapper Brevo API
├── .env.example
├── server/.env.example
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Plan de Trabajo por Fases

### Fase 1: Diagnóstico (Semana 1)
**Objetivo:** entender el negocio de Irving en profundidad y definir los últimos detalles operativos antes de diseñar.

**Entregables:**
- Kickoff completado con Irving — todos los pendientes resueltos (pasarela, dirección, RFC/CSD, dominio, identidad visual, muestra de productos)
- Definición de dimensiones estándar de paquetes para cotización Skydropx (Irving define peso y medidas promedio de sus envíos)
- Acceso a las cuentas de Skydropx, Facturapi y Brevo creadas o transferidas
- Documento de pendientes resueltos firmado por Irving

**Bloqueante si no se resuelve:** la Fase 2 no puede iniciar sin identidad visual. La Fase 3 (checkout) no puede completarse sin RFC/CSD ni pasarela de pagos.

### Fase 2: Diseño y Arquitectura (Semana 2)
**Objetivo:** definir la arquitectura completa y el diseño visual antes de escribir código de producción.

**Entregables:**
- Esquema de base de datos en Supabase creado con todas las tablas y RLS configurado
- Maquetas de alta fidelidad: homepage, catálogo, PDP, checkout (con cotizador y CFDI), panel admin (Figma o equivalente)
- Revisión y aprobación de Emiliano sobre arquitectura y diseño antes de arrancar desarrollo

### Fase 3: Implementación (Semanas 3-6)
**Objetivo:** construir el producto completo en rama `dev`.

**Semana 3 — Backend + datos:**
- Express configurado con todas las rutas
- Integración Skydropx funcional (cotización real)
- Integración Facturapi funcional (CFDI en sandbox)
- Supabase seeded con los 10-15 productos de muestra de Irving

**Semana 4 — Frontend core:**
- Catálogo con filtros completos
- Página de detalle de producto
- Carrito persistente funcional
- Panel admin: gestión de productos y pedidos

**Semana 5 — Checkout y pagos:**
- Flujo de checkout completo: dirección → cotización → método de pago
- Integración pasarela de pagos (sandbox)
- Webhook de confirmación funcionando
- Emisión de CFDI en sandbox

**Semana 6 — Homepage, blog y email:**
- Homepage con carrusel, bestsellers y promociones
- Blog con editor en panel admin
- Integración Brevo: suscripción, arrival notification, correos transaccionales
- SEO: metatags, sitemap.xml, robots.txt

### Fase 4: Activación y QA (Semana 7)
**Objetivo:** verificar que todo funciona en staging y preparar el paso a producción.

**Entregables:**
- QA completo con Playwright MCP: screenshots desktop y mobile de todas las páginas
- Prueba de compra end-to-end en staging (pago real en modo producción, CFDI real)
- Revisión y aprobación de Emiliano en staging
- Deploy a producción en el dominio de Irving
- Entrega de credenciales, documentación y sesión de capacitación con Irving (30-60 min)

---

## Checklist QA Pre-Entrega

### Estándar Synergy
- [ ] `vite build` sin errores ni warnings
- [ ] Sin `console.log` en producción (frontend y backend)
- [ ] Formularios con validación inline y mensajes de error claros
- [ ] Metatags completos en todas las páginas (title, description, og:image)
- [ ] Componente `MadeBy` en el footer de todas las páginas
- [ ] `.env.example` con todas las variables del proyecto
- [ ] `deploy.yml` configurado para staging (`dev`) y producción (`main`)
- [ ] README con instrucciones de setup, secrets y guía de onboarding
- [ ] Suite de screenshots Playwright: desktop 1280×800 y mobile 375×812 por cada página

### Específico TCG Ecommerce
- [ ] Filtros del catálogo funcionan de forma combinada sin recargar página
- [ ] Stock se descuenta correctamente al confirmar un pedido
- [ ] Si stock = 0, el producto aparece como "Agotado" y no se puede agregar al carrito
- [ ] Cotización Skydropx devuelve al menos una opción con precio real
- [ ] Timeout de Skydropx (5s) muestra mensaje de error y no bloquea el checkout
- [ ] Opción "Recoger en tienda — GRATIS" aparece en el selector de envío
- [ ] CFDI se genera correctamente en Facturapi y llega al correo del comprador (PDF + XML)
- [ ] Webhook de pago actualiza el estado del pedido en menos de 10 segundos
- [ ] Correo de confirmación de pedido llega con todos los datos correctos
- [ ] Automación de arrival notification en Brevo se dispara al publicar un producto
- [ ] Panel admin requiere autenticación — una URL directa sin sesión redirige al login
- [ ] RLS de Supabase: un usuario autenticado no puede ver pedidos de otro usuario
- [ ] Carrusel de homepage carga novedades reales (no datos hardcodeados)
- [ ] Sitemap.xml incluye URLs de productos, categorías y entradas de blog
- [ ] El sitio es 100% funcional en iPhone SE (375px) — sin overflow horizontal
- [ ] Botón de WhatsApp flotante abre correctamente en mobile
