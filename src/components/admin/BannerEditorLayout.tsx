import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function BannerEditorLayout() {
  const { user, signOut } = useAuth()
  const nombre = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'Editor'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-color.png" alt="Double-I TCG" className="h-10 w-auto" />
          <span className="text-sm font-semibold text-gray-700">Panel Banners</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Hola, {nombre}</span>
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
