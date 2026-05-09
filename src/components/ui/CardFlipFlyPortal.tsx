import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useDeckAnimation } from '@/context/DeckAnimationContext'
import type { Franchise } from '@/types'

const CARD_BACKS: Record<Franchise, string> = {
  pokemon: '/card-backs/pokemon.jpg',
  yugioh: '/card-backs/yugioh.jpg',
  lorcana: '/card-backs/lorcana.jpg',
}

export function CardFlipFlyPortal() {
  const { activeAnimation, deckIconRef, clearAnimation } = useDeckAnimation()
  const [phase, setPhase] = useState<'idle' | 'flip' | 'fly'>('idle')
  const [deckRect, setDeckRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (activeAnimation) {
      setDeckRect(deckIconRef.current?.getBoundingClientRect() ?? null)
      setPhase('flip')
      const t = setTimeout(() => setPhase('fly'), 520)
      return () => clearTimeout(t)
    } else {
      setPhase('idle')
    }
  }, [activeAnimation, deckIconRef])

  if (phase === 'idle' || !activeAnimation) return null

  const { sourceRect, franchise } = activeAnimation

  const flyX = deckRect
    ? deckRect.left + deckRect.width / 2 - (sourceRect.left + sourceRect.width / 2)
    : 0
  const flyY = deckRect
    ? deckRect.top + deckRect.height / 2 - (sourceRect.top + sourceRect.height / 2)
    : 0

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return createPortal(
    <motion.div
      style={{
        position: 'fixed',
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height,
        zIndex: 9999,
        perspective: 600,
        pointerEvents: 'none',
      }}
      animate={
        phase === 'fly'
          ? { x: flyX, y: flyY, scale: 0.08, opacity: 0 }
          : { x: 0, y: 0, scale: 1, opacity: 1 }
      }
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (phase === 'fly') clearAnimation()
      }}
    >
      <motion.div
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: reducedMotion ? 0 : 180 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {/* Front face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: '#1E0E40',
            border: '2px solid rgba(107,184,236,0.5)',
            borderRadius: 4,
          }}
        />
        {/* Back face */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            overflow: 'hidden',
            borderRadius: 4,
          }}
        >
          <img
            src={CARD_BACKS[franchise]}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
