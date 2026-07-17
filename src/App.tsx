import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useParams } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'

// Code splitting: cada página se carga en su propio chunk mediante import dinámico.
// Reduce el bundle inicial — el navegador solo descarga la página visitada.
const HomePage = lazy(() => import('@/pages/HomePage'))
const CatalogPage = lazy(() => import('@/pages/CatalogPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmationPage'))
const OrderPendingPage = lazy(() => import('@/pages/OrderPendingPage'))
const AccountPage = lazy(() => import('@/pages/AccountPage'))
const BlogPage = lazy(() => import('@/pages/BlogPage'))
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))

// Panel admin — todo su árbol queda fuera del bundle público.
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const ProductsPage = lazy(() => import('@/pages/admin/ProductsPage'))
const ProductFormPage = lazy(() => import('@/pages/admin/ProductFormPage'))
const OrdersPage = lazy(() => import('@/pages/admin/OrdersPage'))
const InvoicesPage = lazy(() => import('@/pages/admin/InvoicesPage'))
const SubscribersPage = lazy(() => import('@/pages/admin/SubscribersPage'))
const BlogManager = lazy(() => import('@/pages/admin/BlogManager'))
const BannerManager = lazy(() => import('@/pages/admin/BannerManager'))
const DiscountCodesManager = lazy(() => import('@/pages/admin/DiscountCodesManager'))
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'))
const BannerEditorLayout = lazy(() => import('@/components/admin/BannerEditorLayout'))

import { CardFlipFlyPortal } from '@/components/ui/CardFlipFlyPortal'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import RequireAdmin from '@/components/admin/RequireAdmin'
import RequireBannerEditor from '@/components/admin/RequireBannerEditor'

// Fallback de carga simple mientras se descarga el chunk de la página.
function PageLoader() {
  return (
    <div
      className="flex items-center justify-center py-32"
      role="status"
      aria-label="Cargando"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-dragon/70 rounded-full"
            style={{ animation: `deckBounce 0.8s ease-in-out ${i * 0.15}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}

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

// Franquicias con ruta limpia propia (/catalogo/pokemon, etc.)
const FRANCHISE_SLUGS = ['pokemon', 'lorcana', 'magic'] as const

function CatalogPageWrapper() {
  const { search } = useLocation()
  // Incluye el segmento de franquicia en la key para remontar al cambiar entre
  // /catalogo/:franchise y re-aplicar los filtros iniciales del catálogo.
  const { slug } = useParams<{ slug?: string }>()
  return <CatalogPage key={`${slug ?? ''}::${search}`} />
}

// Dispatcher para /catalogo/:slug — distingue franquicia vs. slug de producto.
function CatalogOrProductRoute() {
  const { slug } = useParams<{ slug?: string }>()
  const isFranchise =
    !!slug && (FRANCHISE_SLUGS as readonly string[]).includes(slug)
  return isFranchise ? <CatalogPageWrapper /> : <ProductDetailPage />
}

function AppContent() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  return (
    <>
      <CardFlipFlyPortal />
      {!isAdmin && <WhatsAppButton />}
      <Suspense fallback={<Layout><PageLoader /></Layout>}>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/catalogo" element={<Layout><CatalogPageWrapper /></Layout>} />
        {/* Un único segmento dinámico /catalogo/:slug. El dispatcher decide:
            si el segmento es una franquicia válida (pokemon/lorcana/magic) muestra
            el catálogo prefiltrado; si no, lo trata como slug de producto. */}
        <Route path="/catalogo/:slug" element={<Layout><CatalogOrProductRoute /></Layout>} />
        <Route path="/carrito" element={<Layout><CartPage /></Layout>} />
        <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
        <Route path="/pedido/confirmacion" element={<Layout><OrderConfirmationPage /></Layout>} />
        <Route path="/pedido/pendiente" element={<Layout><OrderPendingPage /></Layout>} />
        <Route path="/mi-cuenta" element={<Layout><AccountPage /></Layout>} />
        <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
        <Route path="/blog/:slug" element={<Layout><BlogPostPage /></Layout>} />
        <Route path="/contacto" element={<Layout><ContactPage /></Layout>} />
        <Route path="/admin/login" element={<Layout><LoginPage /></Layout>} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
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
          <Route path="descuentos" element={<DiscountCodesManager />} />
        </Route>
        <Route
          path="/banner-editor"
          element={
            <RequireBannerEditor>
              <BannerEditorLayout />
            </RequireBannerEditor>
          }
        >
          <Route index element={<BannerManager />} />
        </Route>
      </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
