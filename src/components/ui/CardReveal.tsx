import { useRef, useEffect, useMemo } from 'react'

interface CardRevealProps {
  children: React.ReactNode
  index: number
}

export function CardReveal({ children, index }: CardRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const rotation = useMemo(() => (Math.random() * 8 - 4).toFixed(2), [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.style.opacity = '0'
    el.style.transform = `rotate(${rotation}deg) translateY(24px)`
    el.style.transition = 'none'

    const delay = (index % 12) * 50

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              el.style.transition = 'transform 320ms ease-out, opacity 320ms ease-out'
              el.style.transform = 'rotate(0deg) translateY(0)'
              el.style.opacity = '1'
            }, delay)
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [index, rotation])

  return (
    <div ref={ref} style={{ willChange: 'transform, opacity' }}>
      {children}
    </div>
  )
}
