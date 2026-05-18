import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'

import HomePage from '@/pages/HomePage'
import CatalogPage from '@/pages/CatalogPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import OrderConfirmationPage from '@/pages/OrderConfirmationPage'
import OrderPendingPage from '@/pages/OrderPendingPage'
import AccountPage from '@/pages/AccountPage'
import BlogPage from '@/pages/BlogPage'
import BlogPostPage from '@/pages/BlogPostPage'
import ContactPage from '@/pages/ContactPage'

import AdminLayout from '@/components/admin/AdminLayout'
import DashboardPage from '@/pages/admin/DashboardPage'
import ProductsPage from '@/pages/admin/ProductsPage'
import ProductFormPage from '@/pages/admin/ProductFormPage'
import OrdersPage from '@/pages/admin/OrdersPage'
import InvoicesPage from '@/pages/admin/InvoicesPage'
import SubscribersPage from '@/pages/admin/SubscribersPage'
import BlogManager from '@/pages/admin/BlogManager'
import BannerManager from '@/pages/admin/BannerManager'
import LoginPage from '@/pages/admin/LoginPage'
import { CardFlipFlyPortal } from '@/components/ui/CardFlipFlyPortal'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col min-h-screen bg-night">
      <ParticleCanvas />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  )
}

function CatalogPageWrapper() {
  const { search } = useLocation()
  return <CatalogPage key={search} />
}

export default function App() {
  return (
    <BrowserRouter>
      <CardFlipFlyPortal />
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/catalogo" element={<Layout><CatalogPageWrapper /></Layout>} />
        <Route path="/catalogo/:slug" element={<Layout><ProductDetailPage /></Layout>} />
        <Route path="/carrito" element={<Layout><CartPage /></Layout>} />
        <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
        <Route path="/pedido/confirmacion" element={<Layout><OrderConfirmationPage /></Layout>} />
        <Route path="/pedido/pendiente" element={<Layout><OrderPendingPage /></Layout>} />
        <Route path="/mi-cuenta" element={<Layout><AccountPage /></Layout>} />
        <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
        <Route path="/blog/:slug" element={<Layout><BlogPostPage /></Layout>} />
        <Route path="/contacto" element={<Layout><ContactPage /></Layout>} />
        <Route path="/admin/login" element={<Layout><LoginPage /></Layout>} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="productos" element={<ProductsPage />} />
          <Route path="productos/nuevo" element={<ProductFormPage />} />
          <Route path="productos/:id/editar" element={<ProductFormPage />} />
          <Route path="pedidos" element={<OrdersPage />} />
          <Route path="facturas" element={<InvoicesPage />} />
          <Route path="suscriptores" element={<SubscribersPage />} />
          <Route path="blog" element={<BlogManager />} />
          <Route path="banners" element={<BannerManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
