import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate } from 'framer-motion'
import { useDeckAnimation } from '@/context/DeckAnimationContext'
import type { Franchise } from '@/types'

const CARD_BACKS: Record<Franchise, string> = {
  pokemon: '/card-backs/pokemon.jpg',
  yugioh: '/card-backs/yugioh.jpg',
  lorcana: '/card-backs/lorcana.jpg',
  magic: '/card-backs/magic.webp',
}

// Yu-Gi-Oh artwork is taller than the standard card aspect ratio — contain prevents crop
const OBJECT_FIT: Record<Franchise, 'cover' | 'contain'> = {
  pokemon: 'cover',
  yugioh: 'contain',
  lorcana: 'cover',
  magic: 'cover',
}

interface AnimData {
  sourceRect: DOMRect
  franchise: Franchise
}

export function CardFlipFlyPortal() {
  const { activeAnimation, deckIconRef, clearAnimation } = useDeckAnimation()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const flipRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  const [animData, setAnimData] = useState<AnimData | null>(null)

  // Abort controller for the running sequence
  const seqAbort = useRef<(() => void) | null>(null)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!activeAnimation) return

    // Cancel any previous sequence
    seqAbort.current?.()

    const { sourceRect, franchise } = activeAnimation
    setAnimData({ sourceRect, franchise })
    setShown(true)

    let aborted = false
    let r1 = 0
    let r2 = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let flipCtrl: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let flyCtrl: any = null

    const abort = () => {
      aborted = true
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
      try { flipCtrl?.stop() } catch { /* ignore */ }
      try { flyCtrl?.stop() } catch { /* ignore */ }
    }
    seqAbort.current = abort

    // Double RAF — ensures the DOM nodes are mounted and refs are populated
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(async () => {
        if (aborted) return

        const wrapper = wrapperRef.current
        const flipper = flipRef.current
        if (!wrapper || !flipper) return

        // Get deck position at the moment the animation starts (user may have scrolled)
        const deckRect = deckIconRef.current?.getBoundingClientRect() ?? null
        const flyX = deckRect
          ? deckRect.left + deckRect.width / 2 - (sourceRect.left + sourceRect.width / 2)
          : 0
        const flyY = deckRect
          ? deckRect.top + deckRect.height / 2 - (sourceRect.top + sourceRect.height / 2)
          : 0

        // Reset transforms to initial state (instant)
        animate(wrapper, { x: 0, y: 0, scale: 1, opacity: 1 }, { duration: 0 })
        animate(flipper, { rotateY: 0 }, { duration: 0 })

        if (aborted) return

        // ── Phase 1: Flip the card ─────────────────────────────────────────
        flipCtrl = animate(
          flipper,
          { rotateY: reducedMotion ? 0 : 180 },
          { duration: reducedMotion ? 0.05 : 0.9, ease: [0.4, 0, 0.2, 1] }
        )
        await flipCtrl
        flipCtrl = null

        if (aborted) return

        // ── Phase 2: Fly to deck icon ──────────────────────────────────────
        flyCtrl = animate(
          wrapper,
          { x: flyX, y: flyY, scale: 0.06, opacity: 0 },
          { duration: reducedMotion ? 0.1 : 1.4, ease: [0.4, 0, 0.2, 1] }
        )
        await flyCtrl
        flyCtrl = null

        if (aborted) return

        setShown(false)
        setAnimData(null)
        clearAnimation()
      })
    })

    return abort
  }, [activeAnimation]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown || !animData) return null

  const { sourceRect, franchise } = animData

  return createPortal(
    <div
      ref={wrapperRef}
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
    >
      {/* 3-D flip container */}
      <div
        ref={flipRef}
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}
      >
        {/* Front face — glowing purple square */}
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
        {/* Back face — card art */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            overflow: 'hidden',
            borderRadius: 4,
            background: '#0D0820',
            border: '2px solid rgba(107,184,236,0.4)',
          }}
        >
          <img
            src={CARD_BACKS[franchise]}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: OBJECT_FIT[franchise],
            }}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
