import { NavLink, useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/productos', label: 'Productos', icon: '🃏' },
  { to: '/admin/pedidos', label: 'Pedidos', icon: '📦' },
  { to: '/admin/facturas', label: 'Facturas', icon: '🧾' },
  { to: '/admin/suscriptores', label: 'Suscriptores', icon: '📧' },
  { to: '/admin/blog', label: 'Blog', icon: '✏️' },
]

export default function Sidebar() {
  const { signOut } = useClerk()
  const { user } = useUser()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-white border-r border-gray-200 flex flex-col z-10">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">TCG Admin</h1>
      </div>

      {/* Información del usuario */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="avatar" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
              {user?.firstName?.[0] ?? '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName ?? 'Admin'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
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

      {/* Cerrar sesión */}
      <div className="px-3 py-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <span className="text-base">🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
