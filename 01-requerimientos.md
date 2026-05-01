# Requerimientos del Proyecto — Irving Gallart TCG Ecommerce

**Cliente:** Irving Gallart  
**Proyecto:** Ecommerce de tarjetas coleccionables — Pokémon, Yu-Gi-Oh!, Lorcana  
**Paquete:** PRO  
**Precio:** $35,000 MXN + IVA ($40,600 MXN total)  
**Fecha estimada de inicio:** Mayo 2026  
**Elaborado por:** Synergy Tech MX  
**Versión:** 1.0

---

## Información General

Irving Gallart opera un negocio de compraventa de tarjetas coleccionables TCG (Trading Card Games) en México. El proyecto consiste en un ecommerce especializado que permita a compradores de todo el país adquirir tarjetas de las franquicias Pokémon, Yu-Gi-Oh! y Lorcana, con filtros técnicos propios del mercado coleccionable (rareza, edición, condición, variante). La plataforma incluye cotización de envíos en tiempo real vía API y generación automática de facturas CFDI para compradores que lo requieran.

---

## Requerimientos Funcionales

### Módulo 1: Catálogo y Filtros

| ID | Requerimiento |
|----|---------------|
| RF-001 | El catálogo debe mostrar productos organizados por franquicia: Pokémon, Yu-Gi-Oh!, Lorcana. |
| RF-002 | Cada producto debe poder filtrarse por rareza visual (Común, Poco Común, Rara, Ultra Rara, Secret Rare, etc. según franquicia). |
| RF-003 | Cada producto debe poder filtrarse por edición: 1ª edición, Shadowless, Ilimitada. |
| RF-004 | Cada producto debe poder filtrarse por condición: Mint, Near Mint, Lightly Played. |
| RF-005 | Cada producto debe poder filtrarse por variante: holo, reverse holo, estándar. |
| RF-006 | Cada producto debe poder filtrarse por idioma: español, inglés, japonés (según disponibilidad). |
| RF-007 | El catálogo debe soportar filtros combinados (rareza + condición + precio, etc.) sin recargar la página. |
| RF-008 | Cada producto debe mostrar: nombre, imagen, franquicia, set/edición, condición, variante, idioma, precio en MXN y stock disponible. |
| RF-009 | El catálogo debe incluir ordenamiento por precio (ascendente/descendente) y por más recientes. |
| RF-010 | La búsqueda de texto libre debe filtrar por nombre de carta, número de carta y set. |
| RF-011 | Las imágenes de productos son proporcionadas por Irving — el sistema debe soportar carga desde panel admin. |

### Módulo 2: Carrito y Sesión

| ID | Requerimiento |
|----|---------------|
| RF-012 | El carrito debe persistir entre sesiones del navegador (localStorage o sesión autenticada). |
| RF-013 | El usuario puede agregar, modificar cantidad y eliminar productos del carrito. |
| RF-014 | Si el stock de un producto es 1, el sistema debe impedir agregar más de 1 unidad. |
| RF-015 | El carrito debe mostrar subtotal, cantidad de artículos y acceso rápido desde cualquier página. |
| RF-016 | Los usuarios pueden completar una compra como invitado o con cuenta registrada. |
| RF-017 | Las cuentas de cliente almacenan historial de pedidos y datos de envío guardados. |

### Módulo 3: Checkout

| ID | Requerimiento |
|----|---------------|
| RF-018 | El checkout se realiza completamente en MXN. |
| RF-019 | El formulario de checkout solicita: nombre completo, correo electrónico, teléfono, dirección de envío (calle, número, colonia, ciudad, estado, CP). |
| RF-020 | **Cotizador de envíos:** al ingresar la dirección, el sistema consulta la API de Skydropx y muestra opciones de paquetería disponibles (Estafeta, DHL, FedEx) con costo y tiempo de entrega estimado por cada opción. |
| RF-021 | El costo del envío seleccionado se suma al subtotal antes de proceder al pago. |
| RF-022 | El checkout debe incluir la opción "Recoger en tienda física — GRATIS" como alternativa a los envíos. La dirección de la tienda se define en kickoff con Irving. |
| RF-023 | **Facturación CFDI:** el checkout incluye una sección opcional de facturación. Si el cliente la activa, debe ingresar: RFC, razón social y uso del CFDI. El sistema genera la factura automáticamente vía Facturapi al confirmar el pedido. |
| RF-024 | La factura CFDI se envía al correo del comprador en formato PDF y XML. |
| RF-025 | El sistema debe integrarse con la pasarela de pagos definida en kickoff (Mercado Pago recomendado) y soportar al menos: tarjeta de crédito/débito, OXXO Pay y SPEI. |
| RF-026 | Al completar el pago, el cliente recibe un correo de confirmación del pedido con resumen de artículos, total, método de envío y número de seguimiento (cuando esté disponible). |
| RF-027 | El pedido confirmado descuenta automáticamente las unidades del inventario en Supabase. |

### Módulo 4: Panel Admin

| ID | Requerimiento |
|----|---------------|
| RF-028 | El panel admin es de acceso exclusivo para Irving — requiere autenticación segura. |
| RF-029 | Irving puede dar de alta nuevos productos con todos sus campos: nombre, franquicia, set, rareza, edición, condición, variante, idioma, precio, stock, imágenes. |
| RF-030 | Irving puede editar precio, stock y visibilidad de cualquier producto en tiempo real. |
| RF-031 | Irving puede dar de baja (ocultar) un producto sin eliminarlo del historial de pedidos. |
| RF-032 | El panel muestra el listado de pedidos con estado: pendiente de pago, pago confirmado, en preparación, enviado, entregado, cancelado. |
| RF-033 | Irving puede actualizar el estado de cada pedido y cargar el número de guía de envío. |
| RF-034 | El panel muestra un resumen de ventas: ingresos del día, semana y mes; pedidos por estado. |
| RF-035 | El panel incluye gestión de suscriptores de email marketing (ver lista, eliminar, exportar CSV). |

### Módulo 5: Homepage

| ID | Requerimiento |
|----|---------------|
| RF-036 | La homepage incluye un carrusel visual de novedades: productos recién agregados al catálogo. |
| RF-037 | La homepage incluye una sección de promociones destacadas configurada desde el panel admin. |
| RF-038 | La homepage incluye una sección de bestsellers: los 8 productos con más ventas en los últimos 30 días. |
| RF-039 | La homepage incluye accesos directos por franquicia (Pokémon / Yu-Gi-Oh! / Lorcana) con imagen representativa. |
| RF-040 | La homepage incluye llamada a la acción para suscripción a email marketing. |
| RF-041 | Botón de WhatsApp flotante en la página de contacto y en la homepage. |
| RF-042 | Botones de redes sociales del cliente (Instagram, Facebook, TikTok u otras que Irving confirme) en el footer. |

### Módulo 6: Blog y SEO

| ID | Requerimiento |
|----|---------------|
| RF-043 | El sitio incluye un blog especializado en TCG con entradas editables desde el panel admin. |
| RF-044 | Cada entrada de blog tiene: título, slug único, cuerpo en rich text, imagen destacada, fecha de publicación, categoría (Pokémon / Yu-Gi-Oh! / Lorcana / Coleccionismo general) y etiquetas. |
| RF-045 | Cada página del sitio (homepage, catálogo, PDP, blog, checkout) debe incluir metatags completos: title, description, og:image, og:title, og:description, canonical URL. |
| RF-046 | El blog debe generar páginas estáticas o con SSR para indexación efectiva por Google. |
| RF-047 | El sitemap.xml debe generarse automáticamente e incluir URLs de productos, categorías y entradas de blog. |

### Módulo 7: Email Marketing

| ID | Requerimiento |
|----|---------------|
| RF-048 | La plataforma se integra con Brevo para gestión de listas y automaciones. |
| RF-049 | Al suscribirse un usuario (desde homepage o checkout), se añade automáticamente a la lista en Brevo y recibe un correo de bienvenida. |
| RF-050 | Automación de "arrivals": cuando Irving publica un nuevo producto, se dispara un email a los suscriptores con los detalles de la novedad. |
| RF-051 | Segmentación básica: compradores (han realizado al menos 1 pedido) vs. suscriptores sin compra. |
| RF-052 | El correo de confirmación de pedido y la factura CFDI se envían también vía Brevo para mantener trazabilidad y estadísticas. |

### Módulo 8: Integraciones Externas

| ID | Requerimiento |
|----|---------------|
| RF-053 | **Skydropx:** integración con la API REST para cotización de envíos en tiempo real. El backend construye el payload con origen (tienda de Irving), destino (dirección del comprador) y dimensiones del paquete estimadas por Irving. |
| RF-054 | **Facturapi:** integración con el SDK Node.js para emisión de CFDI 4.0. El certificado CSD del SAT de Irving debe ser cargado en la cuenta Facturapi antes de la activación. |
| RF-055 | **Brevo:** integración via API para alta de contactos, disparo de automaciones y envío de correos transaccionales. |
| RF-056 | **Pasarela de pagos (por definir en kickoff):** integración con Mercado Pago (recomendado) o Stripe. Debe soportar webhook de confirmación de pago para actualizar el estado del pedido automáticamente. |

---

## Requerimientos No Funcionales

| ID | Requerimiento |
|----|---------------|
| RNF-001 | **Performance:** el Time to First Contentful Paint (FCP) en la homepage debe ser menor a 2.5 segundos en conexión 4G promedio en México. Las imágenes de productos deben servirse con lazy loading. |
| RNF-002 | **Mobile-first:** el diseño se construye primero para móvil (375px de referencia) y escala hacia arriba. El 100% de las funcionalidades son operables desde smartphone sin pérdida de funcionalidad. |
| RNF-003 | **Seguridad:** todas las API keys de terceros (Skydropx, Facturapi, Brevo, pasarela de pagos) se almacenan exclusivamente en el backend como variables de entorno — nunca expuestas al frontend. La comunicación entre frontend y backend usa HTTPS. |
| RNF-004 | **Seguridad de datos:** Supabase RLS (Row Level Security) habilitado en todas las tablas con datos de clientes y pedidos. Solo el admin autenticado accede al panel de gestión. |
| RNF-005 | **Disponibilidad:** el sitio debe tolerar picos de tráfico durante lanzamientos de nuevas colecciones. El backend en Hostinger debe configurarse con reintentos en las llamadas a APIs externas. |
| RNF-006 | **Accesibilidad básica:** contraste de texto mínimo WCAG AA, etiquetas alt en todas las imágenes de producto, formularios con labels correctos y mensajes de error inline legibles. |
| RNF-007 | **SEO técnico:** URLs amigables (slugs), sin parámetros GET en URLs de catálogo, sitemap.xml y robots.txt configurados. Sin bloqueos de indexación en producción. |
| RNF-008 | **Confiabilidad del checkout:** si la API de Skydropx no responde en más de 5 segundos, el sistema muestra un mensaje de error claro y permite continuar eligiendo "Recoger en tienda" o reintentar. El checkout no debe bloquearse indefinidamente por una API externa. |

---

## Exclusiones Explícitas

Las siguientes funcionalidades quedan fuera del alcance del paquete PRO contratado:

1. Fotografía profesional de productos — Irving proporciona todas las imágenes.
2. Gestión de campañas de pauta publicitaria (Meta Ads, Google Ads) — no incluida.
3. Mantenimiento correctivo o evolutivo posterior a los 30 días post-lanzamiento — requiere contrato de mantenimiento separado.
4. Integración con marketplaces externos (MercadoLibre, Amazon) — fuera de alcance.
5. Sistema de subasta o precio dinámico por puja — no incluido en esta versión.
6. App móvil nativa (iOS / Android) — el sitio es web responsive, no app nativa.
7. Sistema de afiliados o programa de puntos — no incluido.

---

## Pendientes de Kickoff con Irving

Los siguientes puntos deben resolverse en la sesión de kickoff antes de iniciar el desarrollo. Son bloqueantes para las fases indicadas.

1. **Pasarela de pagos:** confirmar si se usará Mercado Pago o Stripe. Impacta la implementación del backend de checkout.
2. **Dirección de tienda física:** dirección completa para la opción "Recoger en tienda — GRATIS" y como origen de envíos en la API de Skydropx.
3. **RFC y CSD del SAT:** RFC del emisor de facturas, Certificado de Sello Digital (.cer y .key) y contraseña del CSD. Necesarios para configurar Facturapi como emisor de CFDI 4.0.
4. **Dominio:** dominio deseado para el sitio (ej. irvingcards.com.mx). Synergy gestiona el alta si Irving no lo tiene.
5. **Identidad visual:** paleta de colores, logotipo en formato vectorial (SVG o AI), tipografías preferidas. Si Irving no tiene identidad definida, Synergy puede proponer una como alcance adicional.
6. **Muestra inicial de productos:** mínimo 10-15 productos con nombre, franquicia, set, rareza, edición, condición, variante, idioma, precio y fotografía — para poblar el catálogo en staging.
