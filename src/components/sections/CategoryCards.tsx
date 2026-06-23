import { Link } from 'react-router-dom'

const CATEGORIES = [
  {
    id: 'pokemon',
    label: 'Pokémon',
    description: 'Base Set, Neo, EX, Scarlet & Violet',
    color: '#F5C400',
    image: null as string | null,
    href: '/catalogo?franchise=pokemon',
    bg: 'from-yellow-900/30 to-yellow-950/60',
  },
  {
    id: 'yugioh',
    label: 'Yu-Gi-Oh!',
    description: 'LOB, SDK, TCG/OCG moderno',
    color: '#C8950A',
    image: null as string | null,
    href: '/catalogo?franchise=yugioh',
    bg: 'from-amber-900/30 to-amber-950/60',
  },
  {
    id: 'lorcana',
    label: 'Disney Lorcana',
    description: 'The First Chapter, Rise of the Floodborn',
    color: '#6B5ECD',
    image: null as string | null,
    href: '/catalogo?franchise=lorcana',
    bg: 'from-purple-900/30 to-purple-950/60',
  },
  {
    id: 'magic',
    label: 'Magic: TG',
    description: 'Alpha, Beta, Dual Lands, Modern',
    color: '#A82FBB',
    image: null as string | null,
    href: '/catalogo?franchise=magic',
    bg: 'from-fuchsia-900/30 to-fuchsia-950/60',
  },
]

export function CategoryCards() {
  return (
    <section className="bg-night py-16">
      <div className="page-container">
        <div className="text-center mb-10">
          <p className="section-subtitle mb-2">Explora por franquicia</p>
          <h2 className="section-title">¿Qué coleccionas?</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {CATEGORIES.map((cat, i) => (
            <Link
              key={cat.id}
              to={cat.href}
              className="group relative block overflow-hidden border border-navy/40 hover:border-current transition-all duration-300"
              style={{
                borderColor: `${cat.color}40`,
                animation: `slideUp 0.6s ease-out ${i * 0.12}s both`,
              }}
            >
              {/* Background */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(ellipse at center, ${cat.color}15 0%, transparent 70%)`,
                }}
              />

              <div className="relative p-8 md:p-10 flex flex-col items-center text-center">
                <div
                  className="w-20 h-20 mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  aria-hidden="true"
                >
                  {cat.image ? (
                    <img src={cat.image} alt={cat.label} className="w-full h-full object-contain" />
                  ) : (
                    <div
                      className="w-full h-full border flex items-center justify-center"
                      style={{ borderColor: `${cat.color}40`, background: `${cat.color}10` }}
                    >
                      <span className="font-agency text-[10px] text-center opacity-50 px-1 leading-tight uppercase tracking-wide">
                        Imagen<br />{cat.label}
                      </span>
                    </div>
                  )}
                </div>

                <h3
                  className="font-agency text-2xl md:text-3xl uppercase tracking-wider mb-2 transition-colors duration-200"
                  style={{ color: cat.color }}
                >
                  {cat.label}
                </h3>

                <p className="font-exo text-ash text-sm mb-5">{cat.description}</p>

                <span
                  className="font-agency text-xs uppercase tracking-widest px-4 py-2 border transition-all duration-200 group-hover:text-white"
                  style={{
                    borderColor: `${cat.color}60`,
                    color: cat.color,
                  }}
                >
                  Ver colección →
                </span>
              </div>

              {/* Corner accent */}
              <div
                className="absolute bottom-0 right-0 w-16 h-16 opacity-20 group-hover:opacity-40 transition-opacity"
                style={{
                  background: `linear-gradient(135deg, transparent 50%, ${cat.color} 50%)`,
                }}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
