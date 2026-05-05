# Admin Panel — Design Spec

**Fecha:** 2026-05-05  
**Proyecto:** Irving Gallart TCG Ecommerce  
**Branch:** feature/admin-panel

---

## Decisiones de diseño

- **Navegación:** Sidebar expandido fijo (240px) con ícono + texto siempre visible
- **Tema:** Light mode, acento azul (`blue-600`), fondo gris claro (`gray-50`)
- **Vista de productos:** Tabla densa con imagen miniatura, badges de color para stock y estado

---

## Rutas

```
/admin/login           → LoginPage (Clerk SignIn)
/admin                 → redirige a /admin/dashboard
/admin/dashboard       → DashboardPage
/admin/productos       → ProductsPage
/admin/productos/nuevo → ProductFormPage (alta)
/admin/productos/:id   → ProductFormPage (edición)
/admin/pedidos         → OrdersPage
/admin/facturas        → InvoicesPage
/admin/suscriptores    → SubscribersPage
```

---

## Componentes

### AdminLayout
Envoltorio de todas las rutas admin. Sidebar fijo a la izquierda (240px) + área de contenido. El sidebar contiene:
- Logo / nombre "TCG Admin"
- Info del usuario autenticado (nombre + avatar de Clerk)
- Links de navegación: Dashboard, Productos, Pedidos, Facturas, Suscriptores
- Botón de cerrar sesión al fondo

Link activo: `bg-blue-50 text-blue-700 font-medium`. Link inactivo: `text-gray-600 hover:bg-gray-100`.

El área de contenido tiene topbar con el título de la página actual.

### RequireAdmin
Guard de rutas. Usa `useUser()` de Clerk. Si no hay sesión → redirige a `/admin/login`. Si hay sesión pero el rol en `publicMetadata.role !== 'admin'` → muestra pantalla de acceso denegado.

---

## Secciones

### Dashboard
4 métricas en cards: ingresos hoy, semana, mes, pedidos pendientes.  
Fuente: `GET /api/admin/dashboard`.  
Tabla de últimos 5 pedidos con columnas: ID, cliente, monto, estado.

### Productos
Tabla con columnas: imagen miniatura (28×28px), nombre + franquicia (subcopia), precio, stock (badge), estado (badge), acciones (editar, toggle activo/inactivo).

- Badge de stock: rojo `stock === 0`, amarillo `stock <= 3`, verde `stock > 3`
- Badge de estado: azul "Activo", gris "Inactivo"
- Buscador por nombre (debounce 300ms)
- Filtro por franquicia (select)
- Botón "Nuevo producto" en topbar

### Formulario de producto (alta y edición)
Campos: nombre, slug (auto-generado, editable), franquicia (select con categorías de la DB), número de carta, set, edición (enum), idioma (enum), rareza (texto), condición (enum), variante (enum), precio, stock, descripción (textarea), activo (toggle).

Sección de imágenes: upload por URL o archivo base64, marcar imagen primaria, eliminar imagen.

Validación: React Hook Form + Zod. Al guardar → `POST /api/admin/products` o `PATCH /api/admin/products/:id`.

### Pedidos
Tabla: ID (truncado), email del cliente, fecha, total, estado (badge con color), número de guía.  
Filtro por estado (select).  
Click en fila → drawer lateral con detalle completo + controles:
- Select para cambiar estado
- Input para número de guía
- Botón "Guardar" → `PATCH /api/admin/orders/:id`

Colores de badge por estado:
- `pending_payment` → amarillo
- `confirmed` → azul
- `preparing` → índigo
- `shipped` → púrpura
- `delivered` → verde
- `cancelled` → rojo

### Facturas
Tabla: orden ID, RFC, razón social, fecha, estado (badge).  
Filtro por estado.  
Si `status === 'draft'` → botón "Reintentar CFDI" → `POST /api/admin/invoices/:orderId/retry`.  
Si `status === 'valid'` → links "PDF" y "XML" que abren en nueva pestaña.

### Suscriptores
Tabla: email, nombre, fuente, comprador (sí/no), fecha.  
Botón eliminar por fila → confirmación con `window.confirm` → `DELETE /api/admin/subscribers/:id`.

---

## Autenticación

`<ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>` en `main.tsx`.  
`RequireAdmin` envuelve todas las rutas `/admin/*` excepto `/admin/login`.  
El token de Clerk se adjunta en cada llamada al backend via `getToken()` en un hook `useAdminApi`.

---

## Variables de entorno necesarias

```
VITE_CLERK_PUBLISHABLE_KEY=
VITE_API_URL=http://localhost:3001
```
