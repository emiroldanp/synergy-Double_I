# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el panel de administración completo de Irving TCG — dashboard, productos, pedidos, facturas y suscriptores — con autenticación Clerk y sidebar expandido en light mode azul.

**Architecture:** Rutas protegidas bajo `/admin/*` envueltas en `RequireAdmin` (guard Clerk). `AdminLayout` provee sidebar + topbar compartidos. Cada sección tiene su propia página y un hook `useAdminApi` centraliza las llamadas al backend con el token de Clerk adjunto.

**Tech Stack:** React 18, React Router v6, Clerk React v5, React Hook Form + Zod, Tailwind CSS, TypeScript.

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/main.tsx` | Agregar `ClerkProvider` |
| `src/App.tsx` | Agregar rutas `/admin/*` |
| `src/types/admin.ts` | Tipos exclusivos del admin (Invoice, Subscriber, DashboardData) |
| `src/hooks/useAdminApi.ts` | Wrapper fetch con token Clerk — todas las llamadas al backend |
| `src/components/admin/AdminLayout.tsx` | Sidebar + topbar |
| `src/components/admin/RequireAdmin.tsx` | Guard de autenticación |
| `src/components/admin/Sidebar.tsx` | Lista de links de navegación |
| `src/components/admin/StatsCard.tsx` | Card de métrica del dashboard |
| `src/components/admin/StatusBadge.tsx` | Badge reutilizable (pedidos, facturas, stock) |
| `src/components/admin/DataTable.tsx` | Tabla genérica con columnas configurables |
| `src/components/admin/OrderDrawer.tsx` | Drawer lateral de detalle de pedido |
| `src/components/admin/ImageUploader.tsx` | Upload de imágenes por URL o archivo |
| `src/pages/admin/LoginPage.tsx` | Clerk SignIn embebido |
| `src/pages/admin/DashboardPage.tsx` | Métricas + últimos pedidos |
| `src/pages/admin/ProductsPage.tsx` | Tabla de productos + filtros |
| `src/pages/admin/ProductFormPage.tsx` | Alta y edición de producto |
| `src/pages/admin/OrdersPage.tsx` | Tabla de pedidos + drawer |
| `src/pages/admin/InvoicesPage.tsx` | Tabla de facturas + retry |
| `src/pages/admin/SubscribersPage.tsx` | Tabla de suscriptores |
| `.env.example` | Agregar `VITE_CLERK_PUBLISHABLE_KEY` |

---

## Task 1: Branch y variables de entorno

**Files:**
- Modify: `.env.example`

- [ ] **Crear la branch**

```bash
git checkout dev
git checkout -b feature/admin-panel
```

- [ ] **Agregar variables al `.env.example`**

Abrir `.env.example` y agregar al final:

```env
# Clerk — autenticación del panel admin
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
```

- [ ] **Crear `.env` local con el valor real**

Copiar `.env.example` a `.env` si no existe. Pegar la publishable key real de Clerk (no la secret key — la publishable key es pública y tiene prefijo `pk_`).

- [ ] **Commit**

```bash
git add .env.example
git commit -m "chore: agregar VITE_CLERK_PUBLISHABLE_KEY a env.example"
```

---

## Task 2: Tipos del admin

**Files:**
- Create: `src/types/admin.ts`

- [ ] **Crear el archivo de tipos**

```typescript
// src/types/admin.ts

export interface Invoice {
  id: string
  orderId: string
  rfc: string
  razonSocial: string
  cfdiUse: string
  facturapiInvoiceId: string | null
  pdfUrl: string | null
  xmlUrl: string | null
  status: 'draft' | 'valid' | 'cancelled'
  createdAt: string
  order: {
    id: string
    guestEmail: string | null
    total: number
    createdAt: string
    customer: { email: string; fullName: string | null } | null
  }
}

export interface EmailSubscriber {
  id: string
  email: string
  fullName: string | null
  isBuyer: boolean
  source: 'homepage_form' | 'checkout' | 'manual'
  subscribedAt: string
  unsubscribedAt: string | null
}

export interface DashboardData {
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
  ordersByStatus: Record<string, number>
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { page: number; limit: number; total: number }
}
```

- [ ] **Commit**

```bash
git add src/types/admin.ts
git commit -m "feat: agregar tipos TypeScript del panel admin"
```

---

## Task 3: Hook `useAdminApi`

**Files:**
- Create: `src/hooks/useAdminApi.ts`

El hook centraliza todas las llamadas al backend admin. Adjunta el token JWT de Clerk en cada request via `Authorization: Bearer <token>`.

- [ ] **Crear el hook**

```typescript
// src/hooks/useAdminApi.ts
import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function useAdminApi() {
  const { getToken } = useAuth()

  const request = useCallback(
    async <T>(path: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken()
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Error ${res.status}`)
      }
      return res.json() as Promise<T>
    },
    [getToken]
  )

  return { request }
}
```

- [ ] **Commit**

```bash
git add src/hooks/useAdminApi.ts
git commit -m "feat: agregar hook useAdminApi con token Clerk"
```

---

## Task 4: ClerkProvider en `main.tsx` y rutas en `App.tsx`

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

- [ ] **Envolver la app con ClerkProvider en `main.tsx`**

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { App } from './App'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Falta VITE_CLERK_PUBLISHABLE_KEY en las variables de entorno')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>
)
```

- [ ] **Agregar rutas admin en `App.tsx`**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/admin/LoginPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { ProductsPage } from './pages/admin/ProductsPage'
import { ProductFormPage } from './pages/admin/ProductFormPage'
import { OrdersPage } from './pages/admin/OrdersPage'
import { InvoicesPage } from './pages/admin/InvoicesPage'
import { SubscribersPage } from './pages/admin/SubscribersPage'
import { AdminLayout } from './components/admin/AdminLayout'
import { RequireAdmin } from './components/admin/RequireAdmin'

export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<HomePage />} />

          {/* Login admin — sin guard */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Rutas protegidas del admin */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="productos" element={<ProductsPage />} />
            <Route path="productos/nuevo" element={<ProductFormPage />} />
            <Route path="productos/:id" element={<ProductFormPage />} />
            <Route path="pedidos" element={<OrdersPage />} />
            <Route path="facturas" element={<InvoicesPage />} />
            <Route path="suscriptores" element={<SubscribersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  )
}
```

- [ ] **Verificar que el servidor de desarrollo arranca sin errores**

```bash
npm run dev
```

Esperado: sin errores de compilación. La ruta `/` sigue funcionando.

- [ ] **Commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: integrar ClerkProvider y rutas del panel admin"
```

---

## Task 5: `RequireAdmin` — guard de autenticación

**Files:**
- Create: `src/components/admin/RequireAdmin.tsx`

- [ ] **Crear el componente guard**

```tsx
// src/components/admin/RequireAdmin.tsx
import { useUser } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

interface Props {
  children: React.ReactNode
}

export function RequireAdmin({ children }: Props) {
  const { isLoaded, isSignedIn, user } = useUser()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/admin/login" replace />
  }

  const role = (user.publicMetadata as { role?: string }).role
  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg font-medium text-gray-900">Acceso denegado</p>
        <p className="text-sm text-gray-500">Tu cuenta no tiene permisos de administrador.</p>
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Commit**

```bash
git add src/components/admin/RequireAdmin.tsx
git commit -m "feat: agregar guard RequireAdmin con verificación de rol Clerk"
```

---

## Task 6: `AdminLayout` y `Sidebar`

**Files:**
- Create: `src/components/admin/Sidebar.tsx`
- Create: `src/components/admin/AdminLayout.tsx`

- [ ] **Crear `Sidebar.tsx`**

```tsx
// src/components/admin/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/admin/productos', label: 'Productos', icon: '🃏' },
  { to: '/admin/pedidos', label: 'Pedidos', icon: '📦' },
  { to: '/admin/facturas', label: 'Facturas', icon: '🧾' },
  { to: '/admin/suscriptores', label: 'Suscriptores', icon: '✉️' },
]

export function Sidebar() {
  const { signOut } = useClerk()
  const { user } = useUser()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut(() => navigate('/admin/login'))
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-lg font-bold text-gray-900">TCG Admin</span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + cerrar sesión */}
      <div className="px-4 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 truncate mb-2">
          {user?.primaryEmailAddress?.emailAddress}
        </p>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-sm text-red-600 hover:text-red-700"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Crear `AdminLayout.tsx`**

```tsx
// src/components/admin/AdminLayout.tsx
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/productos': 'Productos',
  '/admin/productos/nuevo': 'Nuevo producto',
  '/admin/pedidos': 'Pedidos',
  '/admin/facturas': 'Facturas',
  '/admin/suscriptores': 'Suscriptores',
}

export function AdminLayout() {
  const { pathname } = useLocation()
  const title =
    PAGE_TITLES[pathname] ??
    (pathname.includes('/productos/') ? 'Editar producto' : 'Admin')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </header>
        {/* Contenido */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Verificar en el navegador**

Ir a `http://localhost:5173/admin/login`. Debe cargar sin errores. Al autenticarse con Clerk debe redirigir a `/admin/dashboard` con el sidebar visible.

- [ ] **Commit**

```bash
git add src/components/admin/Sidebar.tsx src/components/admin/AdminLayout.tsx
git commit -m "feat: agregar AdminLayout con sidebar expandido y topbar"
```

---

## Task 7: `LoginPage`

**Files:**
- Create: `src/pages/admin/LoginPage.tsx`

- [ ] **Crear la página de login**

```tsx
// src/pages/admin/LoginPage.tsx
import { SignIn } from '@clerk/clerk-react'

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-gray-900">TCG Admin</h1>
        <SignIn
          routing="hash"
          afterSignInUrl="/admin/dashboard"
          appearance={{
            elements: {
              rootBox: 'shadow-md rounded-xl',
              card: 'rounded-xl',
            },
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Verificar en el navegador**

`http://localhost:5173/admin/login` debe mostrar el formulario de Clerk centrado en pantalla.

- [ ] **Commit**

```bash
git add src/pages/admin/LoginPage.tsx
git commit -m "feat: agregar LoginPage con Clerk SignIn"
```

---

## Task 8: Componentes UI reutilizables del admin

**Files:**
- Create: `src/components/admin/StatsCard.tsx`
- Create: `src/components/admin/StatusBadge.tsx`

- [ ] **Crear `StatsCard.tsx`**

```tsx
// src/components/admin/StatsCard.tsx
import { formatMXN } from '../../lib/utils'

interface Props {
  label: string
  value: number
  format?: 'currency' | 'number'
}

export function StatsCard({ label, value, format = 'currency' }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">
        {format === 'currency' ? formatMXN(value) : value.toLocaleString('es-MX')}
      </p>
    </div>
  )
}
```

- [ ] **Crear `StatusBadge.tsx`**

```tsx
// src/components/admin/StatusBadge.tsx
import { cn } from '../../lib/utils'

type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

type InvoiceStatus = 'draft' | 'valid' | 'cancelled'

type StockLevel = 'out' | 'low' | 'ok'

type BadgeVariant = OrderStatus | InvoiceStatus | StockLevel | 'active' | 'inactive'

const STYLES: Record<BadgeVariant, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  draft: 'bg-yellow-100 text-yellow-800',
  valid: 'bg-green-100 text-green-800',
  out: 'bg-red-100 text-red-800',
  low: 'bg-yellow-100 text-yellow-800',
  ok: 'bg-green-100 text-green-800',
  active: 'bg-blue-100 text-blue-800',
  inactive: 'bg-gray-100 text-gray-600',
}

const LABELS: Record<BadgeVariant, string> = {
  pending_payment: 'Pago pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  draft: 'Borrador',
  valid: 'Válida',
  out: 'Agotado',
  low: 'Bajo',
  ok: 'OK',
  active: 'Activo',
  inactive: 'Inactivo',
}

interface Props {
  variant: BadgeVariant
  label?: string
}

export function StatusBadge({ variant, label }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        STYLES[variant]
      )}
    >
      {label ?? LABELS[variant]}
    </span>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/admin/StatsCard.tsx src/components/admin/StatusBadge.tsx
git commit -m "feat: agregar StatsCard y StatusBadge reutilizables"
```

---

## Task 9: `DashboardPage`

**Files:**
- Create: `src/pages/admin/DashboardPage.tsx`

- [ ] **Crear la página**

```tsx
// src/pages/admin/DashboardPage.tsx
import { useEffect, useState } from 'react'
import { useAdminApi } from '../../hooks/useAdminApi'
import { StatsCard } from '../../components/admin/StatsCard'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { formatMXN } from '../../lib/utils'
import type { DashboardData } from '../../types/admin'
import type { Order } from '../../types'

export function DashboardPage() {
  const { request } = useAdminApi()
  const [stats, setStats] = useState<DashboardData | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      request<{ data: DashboardData }>('/api/admin/dashboard'),
      request<{ data: Order[] }>('/api/admin/orders?limit=5'),
    ])
      .then(([dashRes, ordersRes]) => {
        setStats(dashRes.data)
        setOrders(ordersRes.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [request])

  if (loading) {
    return <div className="text-sm text-gray-500">Cargando...</div>
  }

  if (error) {
    return <div className="text-sm text-red-600">Error: {error}</div>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Ingresos hoy" value={stats!.revenueToday} />
        <StatsCard label="Ingresos esta semana" value={stats!.revenueWeek} />
        <StatsCard label="Ingresos este mes" value={stats!.revenueMonth} />
        <StatsCard
          label="Pedidos pendientes de pago"
          value={stats!.ordersByStatus.pending_payment ?? 0}
          format="number"
        />
      </div>

      {/* Últimos pedidos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Últimos pedidos</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}…</td>
                <td className="px-5 py-3 text-gray-900">{order.guestEmail ?? '—'}</td>
                <td className="px-5 py-3 text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('es-MX')}
                </td>
                <td className="px-5 py-3 text-gray-900">{formatMXN(order.total)}</td>
                <td className="px-5 py-3">
                  <StatusBadge variant={order.orderStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Verificar en el navegador**

`/admin/dashboard` debe mostrar 4 cards de métricas y la tabla de pedidos recientes.

- [ ] **Commit**

```bash
git add src/pages/admin/DashboardPage.tsx
git commit -m "feat: agregar DashboardPage con métricas y últimos pedidos"
```

---

## Task 10: `ProductsPage`

**Files:**
- Create: `src/pages/admin/ProductsPage.tsx`

- [ ] **Crear la página**

```tsx
// src/pages/admin/ProductsPage.tsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminApi } from '../../hooks/useAdminApi'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { formatMXN } from '../../lib/utils'
import type { Product, Category } from '../../types'
import type { PaginatedResponse } from '../../types/admin'

function stockVariant(stock: number): 'out' | 'low' | 'ok' {
  if (stock === 0) return 'out'
  if (stock <= 3) return 'low'
  return 'ok'
}

export function ProductsPage() {
  const { request } = useAdminApi()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (categoryId) params.set('categoryId', categoryId)
      const res = await request<PaginatedResponse<Product>>(
        `/api/admin/products?${params}`
      )
      setProducts(res.data)
      setTotal(res.meta.total)
    } finally {
      setLoading(false)
    }
  }, [request, page, search, categoryId])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    request<{ data: Category[] }>('/api/products/categories')
      .then((res) => setCategories(res.data))
      .catch(() => {})
  }, [request])

  async function toggleActive(product: Product) {
    await request(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !product.isActive }),
    })
    fetchProducts()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las franquicias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={() => navigate('/admin/productos/nuevo')}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Cargando...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Sin productos
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const primaryImage = product.images?.find((i) => i.isPrimary) ?? product.images?.[0]
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {primaryImage ? (
                          <img
                            src={primaryImage.url}
                            alt={product.name}
                            className="w-8 h-8 object-cover rounded"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">
                            —
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.category?.name ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{formatMXN(product.price)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={stockVariant(product.stock)} label={String(product.stock)} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={product.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/productos/${product.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActive(product)}
                          className="text-gray-500 hover:text-gray-700 text-xs"
                        >
                          {product.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Paginación */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
            <span>{total} productos en total</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/pages/admin/ProductsPage.tsx
git commit -m "feat: agregar ProductsPage con tabla, filtros y paginación"
```

---

## Task 11: `ProductFormPage`

**Files:**
- Create: `src/pages/admin/ProductFormPage.tsx`
- Create: `src/components/admin/ImageUploader.tsx`

- [ ] **Crear `ImageUploader.tsx`**

```tsx
// src/components/admin/ImageUploader.tsx
import { useState } from 'react'
import { useAdminApi } from '../../hooks/useAdminApi'
import type { ProductImage } from '../../types'

interface Props {
  productId: string
  images: ProductImage[]
  onUpdate: () => void
}

export function ImageUploader({ productId, images, onUpdate }: Props) {
  const { request } = useAdminApi()
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadByUrl() {
    if (!imageUrl.trim()) return
    setUploading(true)
    setError(null)
    try {
      await request(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: JSON.stringify({ imageUrl, isPrimary: images.length === 0 }),
      })
      setImageUrl('')
      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function uploadByFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await request(`/api/admin/products/${productId}/images`, {
        method: 'POST',
        body: JSON.stringify({
          base64,
          mimeType: file.type,
          isPrimary: images.length === 0,
        }),
      })
      onUpdate()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function setPrimary(imageId: string) {
    await request(`/api/admin/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify({ imageId, isPrimary: true }),
    })
    onUpdate()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Imágenes existentes */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.url}
                alt="Imagen del producto"
                className="w-20 h-20 object-cover rounded border border-gray-200"
                loading="lazy"
              />
              {img.isPrimary && (
                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1 rounded">
                  Principal
                </span>
              )}
              {!img.isPrimary && (
                <button
                  onClick={() => setPrimary(img.id)}
                  className="absolute inset-0 bg-black/40 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
                >
                  Hacer principal
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload por URL */}
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://... URL de imagen"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={uploadByUrl}
          disabled={uploading || !imageUrl.trim()}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? '...' : 'Agregar'}
        </button>
      </div>

      {/* Upload por archivo */}
      <div>
        <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
          <input type="file" accept="image/*" onChange={uploadByFile} className="hidden" />
          ↑ Subir desde archivo
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Crear `ProductFormPage.tsx`**

```tsx
// src/pages/admin/ProductFormPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAdminApi } from '../../hooks/useAdminApi'
import { ImageUploader } from '../../components/admin/ImageUploader'
import { slugify } from '../../lib/utils'
import type { Product, Category } from '../../types'

const schema = z.object({
  name: z.string().min(1, 'Requerido'),
  slug: z.string().min(1, 'Requerido'),
  categoryId: z.string().min(1, 'Selecciona una franquicia'),
  cardNumber: z.string().optional(),
  setName: z.string().optional(),
  edition: z.enum(['first_edition', 'shadowless', 'unlimited']).optional(),
  language: z.enum(['es', 'en', 'jp']).optional(),
  rarity: z.string().optional(),
  condition: z.enum(['mint', 'near_mint', 'lightly_played']).optional(),
  variant: z.enum(['standard', 'holo', 'reverse_holo']).optional(),
  price: z.coerce.number().positive('Debe ser mayor a 0'),
  stock: z.coerce.number().int().min(0),
  description: z.string().optional(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { request } = useAdminApi()
  const [categories, setCategories] = useState<Category[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, stock: 0 },
  })

  // Auto-generar slug desde el nombre
  const name = watch('name')
  useEffect(() => {
    if (!isEdit) setValue('slug', slugify(name || ''))
  }, [name, isEdit, setValue])

  // Cargar categorías y producto (modo edición)
  useEffect(() => {
    request<{ data: Category[] }>('/api/products/categories')
      .then((res) => setCategories(res.data))
      .catch(() => {})

    if (isEdit && id) {
      request<{ data: Product }>(`/api/admin/products/${id}`)
        .then((res) => {
          setProduct(res.data)
          const p = res.data
          reset({
            name: p.name,
            slug: p.slug,
            categoryId: p.categoryId,
            cardNumber: p.cardNumber ?? '',
            setName: p.setName ?? '',
            edition: p.edition ?? undefined,
            language: p.language ?? undefined,
            rarity: p.rarity ?? '',
            condition: p.condition ?? undefined,
            variant: p.variant ?? undefined,
            price: p.price,
            stock: p.stock,
            description: p.description ?? '',
            isActive: p.isActive,
          })
        })
        .catch((err) => setError(err.message))
    }
  }, [request, id, isEdit, reset])

  async function onSubmit(values: FormValues) {
    setSaving(true)
    setError(null)
    try {
      if (isEdit && id) {
        await request(`/api/admin/products/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        })
      } else {
        await request('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(values),
        })
      }
      navigate('/admin/productos')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function refreshProduct() {
    if (id) {
      request<{ data: Product }>(`/api/admin/products/${id}`)
        .then((res) => setProduct(res.data))
        .catch(() => {})
    }
  }

  const field = (label: string, key: keyof FormValues, type = 'text') => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        {...register(key)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors[key] && <p className="text-xs text-red-600">{errors[key]?.message as string}</p>}
    </div>
  )

  const selectField = (label: string, key: keyof FormValues, options: { value: string; label: string }[]) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        {...register(key)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— Sin especificar —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {errors[key] && <p className="text-xs text-red-600">{errors[key]?.message as string}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-3xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
          Información general
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Nombre', 'name')}
          {field('Slug (URL)', 'slug')}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Franquicia</label>
          <select
            {...register('categoryId')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una franquicia</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.categoryId && <p className="text-xs text-red-600">{errors.categoryId.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Número de carta', 'cardNumber')}
          {field('Set / Expansión', 'setName')}
          {field('Rareza', 'rarity')}
          {selectField('Edición', 'edition', [
            { value: 'first_edition', label: '1ª Edición' },
            { value: 'shadowless', label: 'Shadowless' },
            { value: 'unlimited', label: 'Ilimitada' },
          ])}
          {selectField('Idioma', 'language', [
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'Inglés' },
            { value: 'jp', label: 'Japonés' },
          ])}
          {selectField('Condición', 'condition', [
            { value: 'mint', label: 'Mint' },
            { value: 'near_mint', label: 'Near Mint' },
            { value: 'lightly_played', label: 'Lightly Played' },
          ])}
          {selectField('Variante', 'variant', [
            { value: 'standard', label: 'Estándar' },
            { value: 'holo', label: 'Holo' },
            { value: 'reverse_holo', label: 'Reverse Holo' },
          ])}
          {field('Precio (MXN)', 'price', 'number')}
          {field('Stock', 'stock', 'number')}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            {...register('description')}
            rows={3}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="isActive" {...register('isActive')} className="w-4 h-4 text-blue-600" />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            Producto activo (visible en la tienda)
          </label>
        </div>
      </div>

      {/* Imágenes — solo en modo edición */}
      {isEdit && product && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Imágenes
          </h2>
          <ImageUploader
            productId={product.id}
            images={product.images ?? []}
            onUpdate={refreshProduct}
          />
        </div>
      )}

      {isEdit === false && (
        <p className="text-xs text-gray-400">
          Podrás agregar imágenes después de crear el producto.
        </p>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white text-sm px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin/productos')}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Commit**

```bash
git add src/pages/admin/ProductFormPage.tsx src/components/admin/ImageUploader.tsx
git commit -m "feat: agregar ProductFormPage e ImageUploader con validación Zod"
```

---

## Task 12: `OrdersPage` con drawer lateral

**Files:**
- Create: `src/components/admin/OrderDrawer.tsx`
- Create: `src/pages/admin/OrdersPage.tsx`

- [ ] **Crear `OrderDrawer.tsx`**

```tsx
// src/components/admin/OrderDrawer.tsx
import { useState } from 'react'
import { useAdminApi } from '../../hooks/useAdminApi'
import { StatusBadge } from './StatusBadge'
import { formatMXN } from '../../lib/utils'
import type { Order } from '../../types'

const ORDER_STATUSES = [
  { value: 'pending_payment', label: 'Pago pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
]

interface Props {
  order: Order | null
  onClose: () => void
  onUpdate: () => void
}

export function OrderDrawer({ order, onClose, onUpdate }: Props) {
  const { request } = useAdminApi()
  const [status, setStatus] = useState(order?.orderStatus ?? '')
  const [tracking, setTracking] = useState(order?.trackingNumber ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!order) return null

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await request(`/api/admin/orders/${order!.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          orderStatus: status,
          trackingNumber: tracking || undefined,
        }),
      })
      onUpdate()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">
            Pedido {order.id.slice(0, 8)}…
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Cliente */}
          <section>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Cliente</p>
            <p className="text-sm text-gray-900">{order.guestEmail ?? '—'}</p>
            {order.guestName && <p className="text-sm text-gray-500">{order.guestName}</p>}
          </section>

          {/* Monto */}
          <section>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total</p>
            <p className="text-lg font-bold text-gray-900">{formatMXN(order.total)}</p>
          </section>

          {/* Estado actual */}
          <section>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Estado actual</p>
            <StatusBadge variant={order.orderStatus} />
          </section>

          {/* Cambiar estado */}
          <section>
            <label className="text-xs text-gray-500 uppercase font-medium block mb-1">
              Cambiar estado
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </section>

          {/* Número de guía */}
          <section>
            <label className="text-xs text-gray-500 uppercase font-medium block mb-1">
              Número de guía
            </label>
            <input
              type="text"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Ej. 1Z999AA10123456784"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-blue-600 text-white text-sm py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Crear `OrdersPage.tsx`**

```tsx
// src/pages/admin/OrdersPage.tsx
import { useEffect, useState, useCallback } from 'react'
import { useAdminApi } from '../../hooks/useAdminApi'
import { StatusBadge } from '../../components/admin/StatusBadge'
import { OrderDrawer } from '../../components/admin/OrderDrawer'
import { formatMXN } from '../../lib/utils'
import type { Order } from '../../types'
import type { PaginatedResponse } from '../../types/admin'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending_payment', label: 'Pago pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
]

export function OrdersPage() {
  const { request } = useAdminApi()
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await request<PaginatedResponse<Order>>(`/api/admin/orders?${params}`)
      setOrders(res.data)
      setTotal(res.meta.total)
    } finally {
      setLoading(false)
    }
  }, [request, page, statusFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Filtro por estado */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guía</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">Cargando...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">Sin pedidos</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelected(order)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}…</td>
                    <td className="px-5 py-3 text-gray-900">{order.guestEmail ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-5 py-3 text-gray-900">{formatMXN(order.total)}</td>
                    <td className="px-5 py-3"><StatusBadge variant={order.orderStatus} /></td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{order.trackingNumber ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {total > 20 && (
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
              <span>{total} pedidos en total</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <OrderDrawer
        order={selected}
        onClose={() => setSelected(null)}
        onUpdate={fetchOrders}
      />
    </>
  )
}
```

- [ ] **Commit**

```bash
git add src/components/admin/OrderDrawer.tsx src/pages/admin/OrdersPage.tsx
git commit -m "feat: agregar OrdersPage con tabla y drawer lateral de detalle"
```

---

## Task 13: `InvoicesPage`

**Files:**
- Create: `src/pages/admin/InvoicesPage.tsx`

- [ ] **Crear la página**

```tsx
// src/pages/admin/InvoicesPage.tsx
import { useEffect, useState, useCallback } from 'react'
import { useAdminApi } from '../../hooks/useAdminApi'
import { StatusBadge } from '../../components/admin/StatusBadge'
import type { Invoice, PaginatedResponse } from '../../types/admin'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borrador' },
  { value: 'valid', label: 'Válida' },
  { value: 'cancelled', label: 'Cancelada' },
]

export function InvoicesPage() {
  const { request } = useAdminApi()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await request<PaginatedResponse<Invoice>>(`/api/admin/invoices?${params}`)
      setInvoices(res.data)
      setTotal(res.meta.total)
    } finally {
      setLoading(false)
    }
  }, [request, page, statusFilter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  async function retry(orderId: string) {
    setRetrying(orderId)
    try {
      await request(`/api/admin/invoices/${orderId}/retry`, { method: 'POST' })
      fetchInvoices()
    } catch (err: any) {
      alert(`Error al reintentar: ${err.message}`)
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">RFC</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razón social</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Archivos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">Cargando...</td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">Sin facturas</td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-500">
                    {inv.orderId.slice(0, 8)}…
                  </td>
                  <td className="px-5 py-3 text-gray-900">{inv.rfc}</td>
                  <td className="px-5 py-3 text-gray-900">{inv.razonSocial}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(inv.createdAt).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge variant={inv.status} />
                  </td>
                  <td className="px-5 py-3">
                    {inv.status === 'draft' && (
                      <button
                        onClick={() => retry(inv.orderId)}
                        disabled={retrying === inv.orderId}
                        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {retrying === inv.orderId ? 'Reintentando...' : 'Reintentar CFDI'}
                      </button>
                    )}
                    {inv.status === 'valid' && (
                      <div className="flex gap-3">
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            PDF
                          </a>
                        )}
                        {inv.xmlUrl && (
                          <a
                            href={inv.xmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            XML
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > 20 && (
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
            <span>{total} facturas en total</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/pages/admin/InvoicesPage.tsx
git commit -m "feat: agregar InvoicesPage con reintento de CFDI y links de descarga"
```

---

## Task 14: `SubscribersPage`

**Files:**
- Create: `src/pages/admin/SubscribersPage.tsx`

- [ ] **Crear la página**

```tsx
// src/pages/admin/SubscribersPage.tsx
import { useEffect, useState, useCallback } from 'react'
import { useAdminApi } from '../../hooks/useAdminApi'
import type { EmailSubscriber, PaginatedResponse } from '../../types/admin'

const SOURCE_LABELS: Record<string, string> = {
  homepage_form: 'Homepage',
  checkout: 'Checkout',
  manual: 'Manual',
}

export function SubscribersPage() {
  const { request } = useAdminApi()
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchSubscribers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      const res = await request<PaginatedResponse<EmailSubscriber>>(
        `/api/admin/subscribers?${params}`
      )
      setSubscribers(res.data)
      setTotal(res.meta.total)
    } finally {
      setLoading(false)
    }
  }, [request, page])

  useEffect(() => { fetchSubscribers() }, [fetchSubscribers])

  async function deleteSubscriber(id: string, email: string) {
    if (!window.confirm(`¿Eliminar a ${email} de la lista?`)) return
    setDeleting(id)
    try {
      await request(`/api/admin/subscribers/${id}`, { method: 'DELETE' })
      fetchSubscribers()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuente</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comprador</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">Cargando...</td>
              </tr>
            ) : subscribers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">Sin suscriptores</td>
              </tr>
            ) : (
              subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-900">{sub.email}</td>
                  <td className="px-5 py-3 text-gray-500">{sub.fullName ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {SOURCE_LABELS[sub.source] ?? sub.source}
                  </td>
                  <td className="px-5 py-3">
                    {sub.isBuyer ? (
                      <span className="text-green-600 text-xs font-medium">Sí</span>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(sub.subscribedAt).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => deleteSubscriber(sub.id, sub.email)}
                      disabled={deleting === sub.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {deleting === sub.id ? '...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > 20 && (
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
            <span>{total} suscriptores en total</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add src/pages/admin/SubscribersPage.tsx
git commit -m "feat: agregar SubscribersPage con eliminación confirmada"
```

---

## Task 15: Agregar ruta pública de categorías al backend

**Files:**
- Modify: `server/controllers/productsController.ts`
- Modify: `server/routes/products.ts`

El formulario de producto necesita cargar las categorías (Pokémon, Yu-Gi-Oh!, Lorcana). Esta ruta es pública — no requiere autenticación.

- [ ] **Agregar función `listCategories` en `productsController.ts`**

Abrir [server/controllers/productsController.ts](server/controllers/productsController.ts) y agregar al final:

```typescript
export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    res.json({ data: categories })
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Registrar la ruta en `products.ts`**

Abrir [server/routes/products.ts](server/routes/products.ts) y agregar:

```typescript
import { listCategories } from '../controllers/productsController'
// ... rutas existentes ...
productsRoutes.get('/categories', listCategories)
```

- [ ] **Verificar que el servidor responde**

Con el servidor corriendo (`npm run dev` en `/server`):

```bash
curl http://localhost:3001/api/products/categories
```

Esperado: `{"data":[{"id":"...","name":"Lorcana",...},...]}`

- [ ] **Commit**

```bash
git add server/controllers/productsController.ts server/routes/products.ts
git commit -m "feat: agregar ruta pública GET /api/products/categories"
```

---

## Task 16: Agregar ruta de detalle de producto al admin

**Files:**
- Modify: `server/routes/admin.ts`
- Modify: `server/controllers/adminController.ts`

El formulario de edición necesita cargar un producto por ID incluyendo sus imágenes.

- [ ] **Agregar función `getProduct` en `adminController.ts`**

Agregar antes de la sección de PEDIDOS:

```typescript
export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    })
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json({ data: product })
  } catch (error) {
    next(error)
  }
}
```

- [ ] **Registrar la ruta en `admin.ts`**

```typescript
import { getProduct, ... } from '../controllers/adminController'
// después de adminRoutes.post('/products', createProduct)
adminRoutes.get('/products/:id', getProduct)
```

- [ ] **Commit**

```bash
git add server/controllers/adminController.ts server/routes/admin.ts
git commit -m "feat: agregar GET /api/admin/products/:id para el formulario de edición"
```

---

## Task 17: Build final y verificación

- [ ] **Agregar `.superpowers/` al `.gitignore`**

Abrir `.gitignore` y agregar:

```
# Visual companion brainstorming
.superpowers/
```

- [ ] **Verificar TypeScript del frontend sin errores**

```bash
npm run build
```

Esperado: sin errores de tipo. `dist/` generado correctamente.

- [ ] **Verificar TypeScript del backend sin errores**

```bash
cd server && npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Commit final**

```bash
git add .gitignore
git commit -m "chore: agregar .superpowers/ al .gitignore"
```

- [ ] **Push de la branch**

```bash
git push origin feature/admin-panel
```

---

## Checklist de spec

- [x] Dashboard con 4 métricas → Task 9
- [x] Productos: tabla, filtros, alta, edición, stock, imágenes → Tasks 10, 11, 15, 16
- [x] Pedidos: tabla, filtro por estado, cambio de estado, número de guía → Task 12
- [x] Facturas: tabla, filtro, retry CFDI, links PDF/XML → Task 13
- [x] Suscriptores: tabla, eliminar con confirmación → Task 14
- [x] Autenticación Clerk con guard de rol → Tasks 4, 5
- [x] Sidebar expandido light mode azul → Tasks 6, 7
- [x] Ruta pública de categorías (necesaria para el formulario) → Task 15
- [x] Ruta de detalle de producto para edición → Task 16
