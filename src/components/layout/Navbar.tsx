import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useDeckAnimation } from '@/context/DeckAnimationContext'
import { CartDrawer } from '@/components/ui/CartDrawer'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { label: 'Pokémon', href: '/catalogo?franchise=pokemon', color: '#F5C400' },
  { label: 'Lorcana', href: '/catalogo?franchise=lorcana', color: '#6B5ECD' },
  { label: 'Magic', href: '/catalogo?franchise=magic', color: '#A82FBB' },
  { label: 'Accesorios', href: '/catalogo?productType=accessory', color: '#6BB8EC' },
]

function DeckIconButton({
  count,
  deckRef,
  onClick,
}: {
  count: number
  deckRef: React.RefObject<HTMLButtonElement | null>
  onClick: () => void
}) {
  const prevCount = useRef(count)
  const [bounce, setBounce] = useState(false)

  useEffect(() => {
    if (count > prevCount.current) {
      setBounce(true)
      const t = setTimeout(() => setBounce(false), 450)
      prevCount.current = count
      return () => clearTimeout(t)
    }
    prevCount.current = count
  }, [count])

  return (
    <button
      ref={deckRef as React.RefObject<HTMLButtonElement>}
      onClick={onClick}
      aria-label={`Carrito (${count} artículos)`}
      className={cn(
        'relative text-ash hover:text-white transition-colors p-1',
        bounce && 'animate-bounce-once'
      )}
      style={bounce ? { animation: 'deckBounce 0.4s ease-out' } : undefined}
    >
      {/* Card deck SVG */}
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="5" width="12" height="16" rx="1.5" />
        <rect x="7" y="3" width="12" height="16" rx="1.5" className="stroke-current opacity-60" />
        <line x1="7" y1="10" x2="13" y2="10" />
        <line x1="7" y1="13" x2="11" y2="13" />
      </svg>
      <AnimatePresence mode="popLayout">
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="absolute -top-1 -right-1 bg-crimson text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
          >
            {count > 9 ? '9+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
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
          scrolled || mobileOpen
            ? 'bg-void/95 backdrop-blur-md border-b border-navy/50 shadow-lg shadow-black/40'
            : 'bg-gradient-to-b from-void/80 to-transparent'
        )}
      >
        <div className="page-container">
          <div className="flex items-center justify-between h-24 md:h-32">
            {/* Logo — bigger and with glow */}
            <Link
              to="/"
              className="flex items-center gap-3 flex-shrink-0 group"
              aria-label="Double-I TCG — Inicio"
            >
              <img
                src="/logo-color.png"
                alt="Double-I TCG"
                className="h-20 md:h-28 w-auto drop-shadow-[0_0_12px_rgba(107,184,236,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(107,184,236,0.8)] transition-all duration-300"
              />
              <div className="hidden sm:flex flex-col leading-none">
                <span className="font-agency text-xs text-dragon tracking-[0.3em] uppercase">Double-I</span>
                <span className="font-agency text-[10px] text-ash/70 tracking-[0.2em] uppercase">Trading Card Game</span>
              </div>
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
              <DeckIconButton
                count={totalItems}
                deckRef={deckIconRef}
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
                aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
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

          {/* Categories bar — desktop */}
          <div className="hidden md:flex items-center gap-0.5 pb-2 overflow-x-auto scrollbar-none border-t border-navy/20 pt-1">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                to={cat.href}
                className="font-agency text-[11px] uppercase tracking-widest px-3 py-0.5 transition-colors whitespace-nowrap flex-shrink-0 hover:text-white"
                style={{ color: cat.color + 'CC' }}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            'md:hidden bg-void border-b border-navy/50 overflow-hidden transition-all duration-300 ease-in-out',
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
            <div className="pt-3 pb-1">
              <p className="font-agency text-[10px] text-ash/50 uppercase tracking-widest mb-2">
                Franquicias y accesorios
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.label}
                    to={cat.href}
                    className="font-agency text-[11px] uppercase tracking-wider border px-2.5 py-1 transition-colors hover:text-white"
                    style={{ borderColor: cat.color + '60', color: cat.color + 'CC' }}
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
