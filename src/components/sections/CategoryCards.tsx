import { Link } from 'react-router-dom'

const CATEGORIES = [
  {
    id: 'pokemon',
    label: 'Pokémon',
    description: 'Base Set, Neo, EX, moderno · Singles y productos sellados',
    color: '#F5C400',
    emoji: '⚡',
    href: '/catalogo?franchise=pokemon',
    bg: 'from-yellow-900/30 to-yellow-950/60',
  },
  {
    id: 'yugioh',
    label: 'Yu-Gi-Oh!',
    description: 'LOB, SDK, moderno OCG/TCG',
    color: '#C8950A',
    emoji: '⚔️',
    href: '/catalogo?franchise=yugioh',
    bg: 'from-amber-900/30 to-amber-950/60',
  },
  {
    id: 'lorcana',
    label: 'Lorcana',
    description: 'The First Chapter, Rise of the Floodborn, Inklands',
    color: '#6B5ECD',
    emoji: '✨',
    href: '/catalogo?franchise=lorcana',
    bg: 'from-purple-900/30 to-purple-950/60',
  },
  {
    id: 'magic',
    label: 'Magic: TG',
    description: 'Bloomburrow, MH3, Commander decks y más',
    color: '#D4502A',
    emoji: '🔮',
    href: '/catalogo?franchise=magic',
    bg: 'from-red-900/30 to-red-950/60',
  },
  {
    id: 'accessories',
    label: 'Accesorios',
    description: 'Sleeves, playmats, deck boxes, binders, dados',
    color: '#6BB8EC',
    emoji: '🎲',
    href: '/catalogo?franchise=accessories',
    bg: 'from-cyan-900/30 to-cyan-950/60',
  },
]

export function CategoryCards() {
  return (
    <section className="bg-brand-navy py-16">
      <div className="page-container">
        <div className="text-center mb-10">
          <p className="section-subtitle mb-2">Explora por franquicia</p>
          <h2 className="section-title">¿Qué coleccionas?</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {CATEGORIES.map((cat, i) => (
            <Link
              key={cat.id}
              to={cat.href}
              className="group relative block overflow-hidden border transition-all duration-300 hover:[animation:cardShuffle_0.5s_ease-in-out]"
              style={{
                borderColor: `${cat.color}40`,
                animation: `slideUp 0.6s ease-out ${i * 0.08}s both`,
              }}
            >
              {/* Background glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(ellipse at center, ${cat.color}18 0%, transparent 70%)`,
                }}
              />

              <div className="relative p-5 md:p-7 flex flex-col items-center text-center">
                <span
                  className="text-4xl mb-3 block transition-transform duration-300 group-hover:scale-110"
                  aria-hidden="true"
                >
                  {cat.emoji}
                </span>

                <h3
                  className="font-agency text-lg md:text-xl uppercase tracking-wider mb-1.5 transition-colors duration-200"
                  style={{ color: cat.color }}
                >
                  {cat.label}
                </h3>

                <p className="font-exo text-ash text-xs leading-relaxed mb-4 hidden sm:block">{cat.description}</p>

                <span
                  className="font-agency text-xs uppercase tracking-widest px-3 py-1.5 border transition-all duration-200 group-hover:text-white"
                  style={{
                    borderColor: `${cat.color}60`,
                    color: cat.color,
                  }}
                >
                  Ver →
                </span>
              </div>

              {/* Corner accent */}
              <div
                className="absolute bottom-0 right-0 w-12 h-12 opacity-20 group-hover:opacity-40 transition-opacity"
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
