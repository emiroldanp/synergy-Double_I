import { Helmet } from 'react-helmet-async'
import { Navbar } from '../components/sections/Navbar'
import { Footer } from '../components/sections/Footer'

export function HomePage() {
  return (
    <>
      <Helmet>
        <title>Irving TCG — Tarjetas Pokémon, Yu-Gi-Oh! y Lorcana en México</title>
        <meta
          name="description"
          content="Compra tarjetas coleccionables TCG en México. Pokémon, Yu-Gi-Oh! y Lorcana. Envíos a todo el país, factura CFDI disponible."
        />
        <meta property="og:title" content="Irving TCG — Tarjetas Coleccionables en México" />
        <meta
          property="og:description"
          content="Tu colección, en un solo lugar. Pokémon, Yu-Gi-Oh! y Lorcana."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gray-950 text-white">
        <Navbar />

        <main className="flex-1">
          {/* Hero */}
          <section className="py-20 px-4 text-center bg-gradient-to-b from-gray-900 to-gray-950">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {/* [PLACEHOLDER — headline definitivo cuando Irving confirme identidad visual] */}
              Tu colección, en un solo lugar
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
              Pokémon · Yu-Gi-Oh! · Lorcana — Cartas en Mint, Near Mint y Lightly Played.
              Envíos a todo México.
            </p>
            <a
              href="/catalogo"
              className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Ver catálogo
            </a>
          </section>

          {/* Accesos por franquicia */}
          <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-10">Explorar por franquicia</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {['Pokémon', 'Yu-Gi-Oh!', 'Lorcana'].map((franchise) => (
                  <a
                    key={franchise}
                    href={`/catalogo?franquicia=${franchise.toLowerCase()}`}
                    className="bg-gray-800 rounded-xl p-8 text-center hover:bg-gray-700 transition-colors border border-gray-700"
                  >
                    <p className="text-xl font-semibold">{franchise}</p>
                    {/* [PLACEHOLDER — imagen representativa de cada franquicia] */}
                  </a>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}

// Exportación default para compatibilidad con React.lazy e imports dinámicos
export default HomePage
