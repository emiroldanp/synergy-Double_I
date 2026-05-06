import { Link } from 'react-router-dom'
import { useBestsellers } from '@/hooks/useProducts'
import { ProductCard } from '@/components/ui/ProductCard'
import { ScrollRevealGrid } from '@/components/ui/ScrollRevealGrid'

export function BestsellerGrid() {
  const products = useBestsellers()

  return (
    <section className="bg-brand-sky py-16">
      <div className="page-container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-subtitle mb-2 text-slate-600">Más vendidos últimos 30 días</p>
            <h2 className="font-agency text-3xl md:text-4xl text-slate-900 tracking-wider uppercase">
              Bestsellers
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="hidden sm:block font-agency text-xs uppercase tracking-wider text-brand-navy hover:text-brand-red transition-colors"
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
              <ProductCard product={product} light />
            </div>
          ))}
        </ScrollRevealGrid>

        <div className="sm:hidden mt-6 text-center">
          <Link
            to="/catalogo"
            className="font-agency text-xs uppercase tracking-wider border border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white px-6 py-3 transition-all duration-200 inline-block"
          >
            Ver todo el catálogo
          </Link>
        </div>
      </div>
    </section>
  )
}
