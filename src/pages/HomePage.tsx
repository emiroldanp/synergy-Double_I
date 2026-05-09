import { Helmet } from 'react-helmet-async'
import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HeroBanner } from '@/components/sections/HeroBanner'
import { BenefitsBar } from '@/components/sections/BenefitsBar'
import { PromotionsSection } from '@/components/sections/PromotionsSection'
import { FeaturedCarousel } from '@/components/sections/FeaturedCarousel'
import { BestsellerGrid } from '@/components/sections/BestsellerGrid'
import { CategoryCards } from '@/components/sections/CategoryCards'
import { NewsletterSignup } from '@/components/sections/NewsletterSignup'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { fadeUp, staggerContainer } from '@/lib/animations'

const FRANCHISE_QUICKLINKS = [
  {
    id: 'pokemon',
    label: 'Pokémon',
    sub: 'Base Set · Neo · EX · Scarlet & Violet',
    href: '/catalogo?franchise=pokemon',
    color: '#F5C400',
    accent: 'from-yellow-900/20 to-yellow-950/40',
  },
  {
    id: 'yugioh',
    label: 'Yu-Gi-Oh!',
    sub: 'LOB · SDK · TCG/OCG moderno',
    href: '/catalogo?franchise=yugioh',
    color: '#C8950A',
    accent: 'from-amber-900/20 to-amber-950/40',
  },
  {
    id: 'lorcana',
    label: 'Disney Lorcana',
    sub: 'The First Chapter · Floodborn',
    href: '/catalogo?franchise=lorcana',
    color: '#6B5ECD',
    accent: 'from-purple-900/20 to-purple-950/40',
  },
]

const TESTIMONIALS = [
  {
    name: 'Carlos R.',
    city: 'CDMX',
    text: 'Recibí mi Charizard de 1ª Ed. en perfectas condiciones. El empaque fue impecable y el envío llegó antes de lo esperado.',
    rating: 5,
  },
  {
    name: 'Daniela M.',
    city: 'Monterrey',
    text: 'Por fin una tienda que verifica la condición de verdad. Mis cartas llegaron exactamente como las describieron.',
    rating: 5,
  },
  {
    name: 'Emilio V.',
    city: 'Guadalajara',
    text: 'Excelente atención vía WhatsApp, resolvieron todas mis dudas antes de comprar. Totalmente recomendado.',
    rating: 5,
  },
]

const META_FEATURES = [
  {
    icon: '◈',
    title: 'Condición verificada',
    desc: 'Cada carta es revisada bajo luz directa y lupa antes de listarse.',
  },
  {
    icon: '◈',
    title: 'Empaque seguro',
    desc: 'Sleeve + toploader + sobre burbuja en cada envío, sin excepciones.',
  },
  {
    icon: '◈',
    title: 'Factura CFDI',
    desc: 'Emitimos factura electrónica con tu RFC en todas las compras.',
  },
  {
    icon: '◈',
    title: 'Asesoría TCG',
    desc: 'Te ayudamos a encontrar lo que buscas y a evaluar el estado de tus cartas.',
  },
]

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} de 5 estrellas`}>
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-dragon" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { pathname } = useLocation()

  return (
    <>
      <Helmet>
        <title>Double-I TCG — Tu tienda especialista en tarjetas coleccionables</title>
        <meta
          name="description"
          content="Pokémon, Yu-Gi-Oh! y Lorcana — cartas individuales con condición verificada. Envíos a todo México."
        />
        <meta property="og:title" content="Double-I TCG — Trading Card Game Mexico" />
        <meta property="og:description" content="Tu tienda especialista en tarjetas coleccionables TCG" />
        <meta property="og:image" content="/logo-color.png" />
        <link rel="canonical" href={`[PLACEHOLDER — confirmar dominio con Irving]${pathname}`} />
      </Helmet>

      <HeroBanner />
      <BenefitsBar />
      <PromotionsSection />
      <FeaturedCarousel />

      {/* Franchise quicklinks */}
      <section className="bg-void py-16">
        <div className="page-container">
          <motion.div
            className="text-center mb-10"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <p className="section-subtitle mb-2">Explora por franquicia</p>
            <h2 className="section-title">¿Qué coleccionas?</h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {FRANCHISE_QUICKLINKS.map((fr) => (
              <motion.div key={fr.id} variants={fadeUp}>
                <Link
                  to={fr.href}
                  className={`group block relative overflow-hidden border p-8 transition-all duration-300 bg-gradient-to-br ${fr.accent}`}
                  style={{ borderColor: `${fr.color}40` }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(ellipse at center, ${fr.color}15 0%, transparent 70%)` }}
                  />
                  <h3
                    className="font-agency text-2xl uppercase tracking-wider mb-2"
                    style={{ color: fr.color }}
                  >
                    {fr.label}
                  </h3>
                  <p className="font-exo text-ash text-sm mb-4">{fr.sub}</p>
                  <span
                    className="font-agency text-xs uppercase tracking-widest border px-4 py-1.5 transition-colors group-hover:text-white"
                    style={{ borderColor: `${fr.color}60`, color: fr.color }}
                  >
                    Ver colección →
                  </span>
                  <div
                    className="absolute bottom-0 right-0 w-16 h-16 opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{ background: `linear-gradient(135deg, transparent 50%, ${fr.color} 50%)` }}
                    aria-hidden="true"
                  />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <CategoryCards />
      <BestsellerGrid />

      {/* Why Double-I — meta features */}
      <section className="bg-abyss py-16 border-t border-b border-navy/30">
        <div className="page-container">
          <motion.div
            className="text-center mb-10"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <p className="section-subtitle mb-2">Por qué elegirnos</p>
            <h2 className="section-title">Coleccionismo con confianza</h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {META_FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="border border-navy/40 p-6 hover:border-dragon/40 transition-colors group"
              >
                <span
                  className="font-agency text-2xl text-dragon mb-3 block group-hover:scale-110 transition-transform origin-left"
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <h3 className="font-agency text-sm text-white uppercase tracking-wider mb-2">
                  {f.title}
                </h3>
                <p className="font-exo text-ash text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-night py-16">
        <div className="page-container">
          <motion.div
            className="text-center mb-10"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <p className="section-subtitle mb-2">Lo que dicen nuestros clientes</p>
            <h2 className="section-title">Reseñas</h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {TESTIMONIALS.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                className="bg-deep border border-navy/40 p-6 hover:border-dragon/30 transition-colors"
              >
                <Stars n={t.rating} />
                <p className="font-exo text-frost/80 text-sm leading-relaxed mt-3 mb-4">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-royal/20 border border-royal/30 flex items-center justify-center">
                    <span className="font-agency text-[10px] text-dragon uppercase">
                      {t.name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-agency text-xs text-white uppercase tracking-wide">{t.name}</p>
                    <p className="font-exo text-[11px] text-ash">{t.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <NewsletterSignup />
      <WhatsAppButton />
    </>
  )
}
