import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string }> = []

    const colors = ['#6BB8EC', '#3040C4', '#CC1515', '#2B1878']

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const initParticles = () => {
      particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
    }
    initParticles()

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-void">
      {/* Animated particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Grid texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" aria-hidden="true" />

      {/* Deep radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(43,24,120,0.4) 0%, rgba(48,64,196,0.15) 40%, transparent 70%)',
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #0D0820, transparent)' }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="page-container relative z-10 pt-24 pb-16">
        <div className="max-w-4xl">
          {/* Eyebrow */}
          <div
            className="inline-flex items-center gap-2 mb-6"
            style={{ animation: 'slideUp 0.6s ease-out 0.1s both' }}
          >
            <span className="h-px w-8 bg-dragon" />
            <span className="font-agency text-xs text-dragon uppercase tracking-[0.3em]">
              Double-I Trading Card Game
            </span>
          </div>

          {/* Main headline */}
          <h1
            className="font-agency text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white leading-none mb-4"
            style={{ animation: 'slideUp 0.7s ease-out 0.2s both' }}
          >
            Tu tienda
            <br />
            <span
              className="text-gradient-dragon"
              style={{
                background: 'linear-gradient(135deg, #6BB8EC 0%, #3040C4 60%, #CC1515 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              especialista
            </span>
            <br />
            en TCG
          </h1>

          {/* Sub */}
          <p
            className="font-exo text-frost/80 text-lg md:text-xl max-w-xl leading-relaxed mb-8"
            style={{ animation: 'slideUp 0.7s ease-out 0.35s both' }}
          >
            Pokémon · Yu-Gi-Oh! · Lorcana — cartas individuales, coleccionismo serio.
            Condición verificada, envíos a todo México.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-4"
            style={{ animation: 'slideUp 0.7s ease-out 0.5s both' }}
          >
            <Link
              to="/catalogo"
              className="btn-primary text-center inline-block text-sm px-8 py-4"
            >
              Explorar Catálogo
            </Link>
            <Link
              to="/catalogo?sort=newest"
              className="btn-secondary text-center inline-block text-sm px-8 py-4"
            >
              Ver Novedades
            </Link>
          </div>

          {/* Stats */}
          <div
            className="flex flex-wrap gap-8 mt-14 pt-8 border-t border-navy/40"
            style={{ animation: 'slideUp 0.7s ease-out 0.65s both' }}
          >
            {[
              { label: 'Franquicias', value: '3' },
              { label: 'Envíos a todo México', value: '✓' },
              { label: 'Condición verificada', value: '✓' },
              { label: 'Factura CFDI', value: '✓' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-agency text-2xl text-dragon">{stat.value}</p>
                <p className="font-exo text-xs text-ash uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Diagonal accent line */}
      <div
        className="absolute top-0 right-0 w-px h-full opacity-20 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #6BB8EC, transparent)' }}
        aria-hidden="true"
      />
    </section>
  )
}
