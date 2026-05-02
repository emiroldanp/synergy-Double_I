import { MadeBy } from '../ui/MadeBy'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-gray-400">
            {/* [PLACEHOLDER — nombre del sitio cuando Irving confirme dominio] */}
            Irving TCG — Tarjetas Coleccionables
          </p>
          <div className="flex gap-4 text-sm text-gray-400">
            {/* [PLACEHOLDER — redes sociales cuando Irving confirme] */}
          </div>
        </div>
        <MadeBy />
      </div>
    </footer>
  )
}
