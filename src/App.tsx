import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

import HomePage from '@/pages/HomePage'
import CatalogPage from '@/pages/CatalogPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import OrderConfirmationPage from '@/pages/OrderConfirmationPage'
import AccountPage from '@/pages/AccountPage'
import BlogPage from '@/pages/BlogPage'
import BlogPostPage from '@/pages/BlogPostPage'
import ContactPage from '@/pages/ContactPage'

import AdminDashboard from '@/pages/admin/AdminDashboard'
import ProductsManager from '@/pages/admin/ProductsManager'
import OrdersManager from '@/pages/admin/OrdersManager'
import BlogManager from '@/pages/admin/BlogManager'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-night">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/catalogo" element={<Layout><CatalogPage /></Layout>} />
        <Route path="/catalogo/:slug" element={<Layout><ProductDetailPage /></Layout>} />
        <Route path="/carrito" element={<Layout><CartPage /></Layout>} />
        <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
        <Route path="/pedido/confirmacion" element={<Layout><OrderConfirmationPage /></Layout>} />
        <Route path="/mi-cuenta" element={<Layout><AccountPage /></Layout>} />
        <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
        <Route path="/blog/:slug" element={<Layout><BlogPostPage /></Layout>} />
        <Route path="/contacto" element={<Layout><ContactPage /></Layout>} />
        <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
        <Route path="/admin/productos" element={<Layout><ProductsManager /></Layout>} />
        <Route path="/admin/pedidos" element={<Layout><OrdersManager /></Layout>} />
        <Route path="/admin/blog" element={<Layout><BlogManager /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
