import { Helmet } from 'react-helmet-async'
import { NovedadesSection } from '@/components/sections/NovedadesSection'
import { CategoryCards } from '@/components/sections/CategoryCards'
import { FeaturedCarousel } from '@/components/sections/FeaturedCarousel'
import { BestsellerGrid } from '@/components/sections/BestsellerGrid'
import { NewsletterSignup } from '@/components/sections/NewsletterSignup'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'

export default function HomePage() {
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
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="pt-16" />
      <NovedadesSection />
      <CategoryCards />
      <FeaturedCarousel />
      <BestsellerGrid />
      <NewsletterSignup />
      <WhatsAppButton />
    </>
  )
}
