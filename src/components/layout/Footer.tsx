import { Link } from 'react-router-dom'
import { MadeBy } from '@/components/ui/MadeBy'

export function Footer() {
  return (
    <footer className="bg-void border-t border-navy/40 mt-auto">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/">
              <img src="/logo-color.png" alt="Double-I TCG" className="h-14 w-auto mb-4" />
            </Link>
            <p className="text-ash text-sm font-exo leading-relaxed">
              Tu tienda especialista en tarjetas coleccionables TCG en México.
            </p>
          </div>

          {/* Tienda */}
          <div>
            <h3 className="font-agency text-xs text-ash uppercase tracking-widest mb-4">Tienda</h3>
            <ul className="space-y-2">
              {[
                { to: '/catalogo', label: 'Catálogo' },
                { to: '/catalogo/pokemon', label: 'Pokémon' },
                { to: '/catalogo/lorcana', label: 'Lorcana' },
                { to: '/catalogo/magic', label: 'Magic: TG' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-ash hover:text-frost text-sm font-exo transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Información */}
          <div>
            <h3 className="font-agency text-xs text-ash uppercase tracking-widest mb-4">Información</h3>
            <ul className="space-y-2">
              {[
                { to: '/blog', label: 'Blog TCG' },
                { to: '/contacto', label: 'Contacto' },
                { to: '/mi-cuenta', label: 'Mi cuenta' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-ash hover:text-frost text-sm font-exo transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="font-agency text-xs text-ash uppercase tracking-widest mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm font-exo text-ash">
              <li>
                <a
                  href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || '5200000000000'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#25D366] transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <MadeBy />
      </div>
    </footer>
  )
}
