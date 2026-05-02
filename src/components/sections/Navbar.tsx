import { Link } from 'react-router-dom'

export function Navbar() {
  return (
    <header className="bg-gray-900 py-4 px-4 border-b border-gray-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-white">
          {/* [PLACEHOLDER — logotipo de Irving] */}
          Irving TCG
        </Link>
        <nav className="hidden md:flex gap-6 text-sm text-gray-300">
          <Link to="/catalogo" className="hover:text-white transition-colors">Catálogo</Link>
          <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
          <Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link>
        </nav>
        <div className="flex items-center gap-3">
          {/* [PLACEHOLDER — botón carrito e icono usuario con Clerk] */}
        </div>
      </div>
    </header>
  )
}
