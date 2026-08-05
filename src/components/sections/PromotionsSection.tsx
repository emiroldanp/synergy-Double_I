import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Promotion } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function PromotionsSection() {
  const [promotions, setPromotions] = useState<Promotion[]>([])

  useEffect(() => {
    fetch(`${API_URL}/api/promotions`)
      .then((r) => r.json())
      .then((json) => setPromotions((json.data as Promotion[]) ?? []))
      .catch(() => { /* sin promos activas si falla, la sección simplemente no se muestra */ })
  }, [])

  const active = promotions.filter((p) => p.isActive)
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
                      {promo.badgeLabel}
                    </span>
                    <h3 className="font-agency text-lg text-white uppercase tracking-wide">
                      {promo.title}
                    </h3>
                    <p className="font-exo text-ash text-sm mt-1">
                      {promo.description}
                    </p>
                  </div>
                  <Link
                    to={promo.ctaHref}
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
