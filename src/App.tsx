import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import HomePage from './pages/HomePage'

// Páginas admin — lazy loaded
const LoginPage = lazy(() => import('./pages/admin/LoginPage'))
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const ProductsPage = lazy(() => import('./pages/admin/ProductsPage'))
const ProductFormPage = lazy(() => import('./pages/admin/ProductFormPage'))
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'))
const InvoicesPage = lazy(() => import('./pages/admin/InvoicesPage'))
const SubscribersPage = lazy(() => import('./pages/admin/SubscribersPage'))

// Componentes admin
import RequireAdmin from './components/admin/RequireAdmin'
import AdminLayout from './components/admin/AdminLayout'

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<HomePage />} />

            {/* Login admin — público */}
            <Route path="/admin/login" element={<LoginPage />} />

            {/* Rutas protegidas del panel admin */}
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
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
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  )
}

export default App
