import { Link } from 'react-router-dom'
import { MOCK_PROMOTIONS } from '@/lib/mockData'

export function PromotionsSection() {
  const active = MOCK_PROMOTIONS.filter((p) => p.isActive)
  if (active.length === 0) return null

  return (
    <section className="bg-abyss py-12">
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {active.map((promo) => (
            <div
              key={promo.id}
              className="relative overflow-hidden border border-crimson/30 bg-deep group hover:border-crimson/60 transition-colors duration-300"
            >
              {/* Red accent corner */}
              <div
                className="absolute top-0 left-0 w-1 h-full bg-crimson"
                aria-hidden="true"
              />

              <div className="pl-6 pr-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="badge-base bg-crimson/20 border border-crimson/40 text-crimson mb-2 inline-block">
                      {promo.discountType === 'porcentaje'
                        ? `−${promo.discountValue}%`
                        : 'Oferta especial'}
                    </span>
                    <h3 className="font-agency text-lg text-white uppercase tracking-wide">
                      {promo.title}
                    </h3>
                    <p className="font-exo text-ash text-sm mt-1">
                      {promo.description}
                    </p>
                  </div>
                  <Link
                    to="/catalogo"
                    className="flex-shrink-0 font-agency text-xs uppercase tracking-wider text-crimson hover:text-flame transition-colors mt-1"
                  >
                    Ver →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
