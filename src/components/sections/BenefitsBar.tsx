import { useEffect, useRef } from 'react'

type BenefitItem = string | { logo: true }

const BENEFITS: BenefitItem[] = [
  'Envíos a todo México',
  'Condición verificada en cada carta',
  { logo: true },
  'Factura CFDI incluida',
  'Pokémon · Lorcana · Magic',
  { logo: true },
  'Cartas individuales y selladas',
  'Atención personalizada vía WhatsApp',
  { logo: true },
  'Envíos a todo México',
  'Condición verificada en cada carta',
  { logo: true },
  'Factura CFDI incluida',
  'Pokémon · Lorcana · Magic',
  { logo: true },
  'Cartas individuales y selladas',
  'Atención personalizada vía WhatsApp',
  { logo: true },
]

export function BenefitsBar() {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let pos = 0
    let animId: number
    const speed = 0.5

    const animate = () => {
      pos -= speed
      const half = track.scrollWidth / 2
      if (Math.abs(pos) >= half) pos = 0
      track.style.transform = `translateX(${pos}px)`
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div
      className="overflow-hidden bg-dragon py-2.5"
      aria-label="Beneficios de comprar en Double-I TCG"
      role="marquee"
    >
      <div ref={trackRef} className="flex whitespace-nowrap will-change-transform">
        {BENEFITS.map((item, i) =>
          typeof item === 'string' ? (
            <span
              key={i}
              className="font-agency text-xs uppercase tracking-[0.2em] text-white px-6 flex items-center gap-4"
            >
              <span aria-hidden="true" className="w-1 h-1 rounded-full bg-white/60 inline-block" />
              {item}
            </span>
          ) : (
            <span key={i} className="px-4 flex items-center" aria-hidden="true">
              <img src="/logo-color.png" alt="Double-I TCG" className="h-5 w-auto opacity-80 brightness-0 invert" />
            </span>
          )
        )}
      </div>
    </div>
  )
}
