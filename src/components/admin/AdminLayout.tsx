import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

// Mapa de rutas a títulos de página
const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/productos': 'Productos',
  '/admin/productos/nuevo': 'Nuevo producto',
  '/admin/pedidos': 'Pedidos',
  '/admin/facturas': 'Facturas',
  '/admin/suscriptores': 'Suscriptores',
  '/admin/blog': 'Blog',
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.match(/^\/admin\/productos\/.+/)) return 'Editar producto'
  return 'Admin'
}

export default function AdminLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-900">{getPageTitle(pathname)}</h2>
        </header>
        {/* Contenido de la página */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
