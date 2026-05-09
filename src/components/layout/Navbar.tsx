import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useDeckAnimation } from '@/context/DeckAnimationContext'
import { CartDrawer } from '@/components/ui/CartDrawer'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { label: 'Pokémon', href: '/catalogo?franchise=pokemon', color: '#F5C400' },
  { label: 'Yu-Gi-Oh!', href: '/catalogo?franchise=yugioh', color: '#C8950A' },
  { label: 'Lorcana', href: '/catalogo?franchise=lorcana', color: '#6B5ECD' },
  { label: 'Sleeves', href: '/catalogo?productType=sleeve', color: '#6BB8EC' },
  { label: 'Playmats', href: '/catalogo?productType=playmat', color: '#6BB8EC' },
  { label: 'ETBs', href: '/catalogo?productType=etb', color: '#6BB8EC' },
]

function DeckIcon({ count, buttonRef, onClick }: {
  count: number
  buttonRef: React.RefObject<HTMLButtonElement | null>
  onClick: () => void
}) {
  const [bounce, setBounce] = useState(false)

  useEffect(() => {
    if (count > 0) {
      setBounce(true)
      const t = setTimeout(() => setBounce(false), 400)
      return () => clearTimeout(t)
    }
  }, [count])

  return (
    <motion.button
      ref={buttonRef}
      onClick={onClick}
      aria-label={`Carrito (${count} artículos)`}
      className="relative text-ash hover:text-white transition-colors p-1"
      animate={bounce ? { y: [-4, 0, -2, 0] } : {}}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Card deck SVG icon */}
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="13" height="17" rx="1.5" />
        <rect x="6" y="3" width="13" height="17" rx="1.5" className="text-ash/60" />
        <line x1="6" y1="10" x2="13" y2="10" />
        <line x1="6" y1="13" x2="11" y2="13" />
      </svg>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 bg-crimson text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
          >
            {count > 9 ? '9+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export function Navbar() {
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isSignedIn, isAdmin, signOut } = useAuth()
  const { totalItems } = useCart()
  const { deckIconRef } = useDeckAnimation()
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
              <DeckIcon
                count={totalItems}
                buttonRef={deckIconRef}
                onClick={() => setCartOpen(true)}
              />

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

          {/* Categories bar — desktop only */}
          <div className="hidden md:flex items-center gap-1 pb-1.5 -mt-0.5 overflow-x-auto scrollbar-none">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                to={cat.href}
                className="font-agency text-[11px] uppercase tracking-widest text-ash/70 hover:text-white px-3 py-1 transition-colors whitespace-nowrap flex-shrink-0"
                style={{ '--cat-color': cat.color } as React.CSSProperties}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            'md:hidden bg-void/98 border-b border-navy/50 overflow-hidden transition-all duration-300 ease-in-out',
            mobileOpen ? 'max-h-screen' : 'max-h-0'
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

            {/* Mobile categories */}
            <div className="pt-2 pb-1">
              <p className="font-agency text-[10px] text-ash/50 uppercase tracking-widest mb-2">Categorías</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.label}
                    to={cat.href}
                    className="font-agency text-[11px] uppercase tracking-wider text-ash/70 hover:text-white border border-navy/40 px-2.5 py-1 transition-colors"
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>

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
