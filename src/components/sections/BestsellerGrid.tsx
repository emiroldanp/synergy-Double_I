import { Link } from 'react-router-dom'
import { useBestsellers } from '@/hooks/useProducts'
import { ProductCard } from '@/components/ui/ProductCard'
import { ScrollRevealGrid } from '@/components/ui/ScrollRevealGrid'

export function BestsellerGrid() {
  const products = useBestsellers()

  return (
    <section className="bg-abyss py-16">
      <div className="page-container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-subtitle mb-2">Más vendidos últimos 30 días</p>
            <h2 className="section-title">Bestsellers</h2>
          </div>
          <Link
            to="/catalogo"
            className="hidden sm:block font-agency text-xs uppercase tracking-wider text-dragon hover:text-frost transition-colors"
          >
            Ver todo →
          </Link>
        </div>

        <ScrollRevealGrid className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product, i) => (
            <div
              key={product.id}
              style={{ animation: `slideUp 0.5s ease-out ${i * 0.07}s both` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </ScrollRevealGrid>

        <div className="sm:hidden mt-6 text-center">
          <Link
            to="/catalogo"
            className="btn-secondary text-xs px-6 py-3"
          >
            Ver todo el catálogo
          </Link>
        </div>
      </div>
    </section>
  )
}
