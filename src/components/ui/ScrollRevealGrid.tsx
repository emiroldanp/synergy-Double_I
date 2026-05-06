import { useRef, useEffect, ReactNode } from 'react'

interface ScrollRevealGridProps {
  children: ReactNode
  className?: string
}

export function ScrollRevealGrid({ children, className }: ScrollRevealGridProps) {
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = innerRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      // progress: 0 when section bottom enters viewport, 1 when section top reaches 45% from top
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.6)))
      const rotateX = 16 * (1 - p)
      const scale = 0.93 + 0.07 * p
      const opacity = 0.55 + 0.45 * p
      el.style.transform = `rotateX(${rotateX}deg) scale(${scale})`
      el.style.opacity = String(opacity)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div style={{ perspective: '1200px', perspectiveOrigin: '50% 0%' }}>
      <div
        ref={innerRef}
        className={className}
        style={{
          transformOrigin: 'top center',
          willChange: 'transform, opacity',
          // initial state (matches p=0)
          transform: 'rotateX(16deg) scale(0.93)',
          opacity: 0.55,
        }}
      >
        {children}
      </div>
    </div>
  )
}
