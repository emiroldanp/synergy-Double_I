import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { CartDrawer } from '@/components/ui/CartDrawer'
import { cn } from '@/lib/utils'

export function Navbar() {
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isSignedIn, isAdmin, signOut } = useAuth()
  const { totalItems } = useCart()
  const location = useLocation()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setCartOpen(false)
  }, [location.pathname])

  const navLinks = [
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/blog', label: 'Blog' },
    { to: '/contacto', label: 'Contacto' },
  ]

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-30 transition-all duration-300',
          scrolled
            ? 'bg-void/95 backdrop-blur-md border-b border-navy/50 shadow-lg'
            : 'bg-gradient-to-b from-void/90 to-transparent'
        )}
      >
        <div className="page-container">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img
                src="/logo-color.png"
                alt="Double-I Trading Card Game"
                className="h-10 md:h-12 w-auto"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'font-agency text-sm uppercase tracking-widest transition-colors duration-200',
                      isActive ? 'text-dragon' : 'text-ash hover:text-white'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn(
                      'font-agency text-sm uppercase tracking-widest transition-colors',
                      isActive ? 'text-crimson' : 'text-crimson/70 hover:text-crimson'
                    )
                  }
                >
                  Admin
                </NavLink>
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* Cart button */}
              <button
                onClick={() => setCartOpen(true)}
                aria-label={`Carrito (${totalItems} artículos)`}
                className="relative text-ash hover:text-white transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-crimson text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </button>

              {/* Auth */}
              {isSignedIn ? (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    to="/mi-cuenta"
                    className="font-agency text-xs uppercase tracking-wider text-ash hover:text-white transition-colors"
                  >
                    Mi cuenta
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="font-agency text-xs uppercase tracking-wider text-ash/60 hover:text-ash transition-colors"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <Link
                  to="/mi-cuenta"
                  className="hidden md:block font-agency text-xs uppercase tracking-wider text-ash hover:text-white transition-colors"
                >
                  Ingresar
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menú"
                className="md:hidden text-ash hover:text-white transition-colors p-1"
              >
                {mobileOpen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            'md:hidden bg-void/98 border-b border-navy/50 overflow-hidden transition-all duration-300 ease-in-out',
            mobileOpen ? 'max-h-96' : 'max-h-0'
          )}
        >
          <div className="page-container py-4 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'block font-agency text-sm uppercase tracking-widest py-3 border-b border-navy/30 transition-colors',
                    isActive ? 'text-dragon' : 'text-ash hover:text-white'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className="block font-agency text-sm uppercase tracking-widest py-3 border-b border-navy/30 text-crimson"
              >
                Admin Panel
              </NavLink>
            )}
            {isSignedIn ? (
              <>
                <NavLink
                  to="/mi-cuenta"
                  className="block font-agency text-sm uppercase tracking-widest py-3 border-b border-navy/30 text-ash hover:text-white"
                >
                  Mi cuenta
                </NavLink>
                <button
                  onClick={() => signOut()}
                  className="block font-agency text-sm uppercase tracking-widest py-3 text-ash/60 hover:text-ash"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <NavLink
                to="/mi-cuenta"
                className="block font-agency text-sm uppercase tracking-widest py-3 text-ash hover:text-white"
              >
                Ingresar
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
