import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDeckAnimation } from '@/context/DeckAnimationContext'
import type { Franchise } from '@/types'

const CARD_BACKS: Record<Franchise, string> = {
  pokemon: '/card-backs/pokemon.jpg',
  yugioh: '/card-backs/yugioh.jpg',
  lorcana: '/card-backs/lorcana.jpg',
  magic: '/card-backs/magic.jpg',
}

type Phase = 'flip' | 'fly' | 'done'

interface AnimState {
  animKey: number
  sourceRect: DOMRect
  franchise: Franchise
  deckRect: DOMRect | null
  phase: Phase
}

export function CardFlipFlyPortal() {
  const { activeAnimation, deckIconRef, clearAnimation } = useDeckAnimation()
  const [anim, setAnim] = useState<AnimState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!activeAnimation) return

    if (timerRef.current) clearTimeout(timerRef.current)

    const deckRect = deckIconRef.current?.getBoundingClientRect() ?? null

    setAnim({
      animKey: activeAnimation.key,
      sourceRect: activeAnimation.sourceRect,
      franchise: activeAnimation.franchise,
      deckRect,
      phase: 'flip',
    })

    timerRef.current = setTimeout(() => {
      setAnim((prev) => (prev ? { ...prev, phase: 'fly' } : null))
    }, reducedMotion ? 50 : 950)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [activeAnimation]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!anim || anim.phase === 'done') return null

  const { animKey, sourceRect, franchise, deckRect, phase } = anim

  const flyX = deckRect
    ? deckRect.left + deckRect.width / 2 - (sourceRect.left + sourceRect.width / 2)
    : 0
  const flyY = deckRect
    ? deckRect.top + deckRect.height / 2 - (sourceRect.top + sourceRect.height / 2)
    : 0

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={animKey}
        style={{
          position: 'fixed',
          left: sourceRect.left,
          top: sourceRect.top,
          width: sourceRect.width,
          height: sourceRect.height,
          zIndex: 9999,
          perspective: 700,
          pointerEvents: 'none',
        }}
        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        animate={
          phase === 'fly'
            ? { x: flyX, y: flyY, scale: 0.08, opacity: 0 }
            : { x: 0, y: 0, scale: 1, opacity: 1 }
        }
        transition={
          phase === 'fly'
            ? { duration: 1.4, ease: [0.4, 0, 0.2, 1] }
            : { duration: 0 }
        }
        onAnimationComplete={() => {
          if (phase === 'fly') {
            setAnim((prev) => (prev ? { ...prev, phase: 'done' } : null))
            clearAnimation()
          }
        }}
      >
        {/* 3-D flip card */}
        <motion.div
          style={{
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            position: 'relative',
          }}
          initial={{ rotateY: 0 }}
          animate={{ rotateY: reducedMotion ? 0 : 180 }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Front */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: '#1E0E40',
              border: '2px solid rgba(107,184,236,0.6)',
              borderRadius: 4,
            }}
          />
          {/* Back */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              overflow: 'hidden',
              borderRadius: 4,
              border: '2px solid rgba(107,184,236,0.4)',
            }}
          >
            <img
              src={CARD_BACKS[franchise]}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
