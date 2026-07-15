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
  accesorios: '/card-backs/pokemon.jpg',
}

const OBJECT_FIT: Record<Franchise, 'cover' | 'contain'> = {
  pokemon: 'cover',
  yugioh: 'contain',
  lorcana: 'cover',
  magic: 'cover',
  accesorios: 'cover',
}

export function CardFlipFlyPortal() {
  const { activeAnimation, deckIconRef, clearAnimation } = useDeckAnimation()

  // These refs point to DOM nodes that are ALWAYS mounted.
  // Never conditional-rendering them means refs are never null.
  const outerRef = useRef<HTMLDivElement>(null) // position + show/hide wrapper
  const wrapperRef = useRef<HTMLDivElement>(null) // animate target: x/y/scale/opacity
  const flipRef = useRef<HTMLDivElement>(null) // animate target: rotateY
  const backImgRef = useRef<HTMLImageElement>(null) // card back image

  // franchise state only drives the img src on initial render;
  // runtime changes go through backImgRef directly (see effect below)
  const [franchise, setFranchise] = useState<Franchise>('pokemon')

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!activeAnimation) return

    const { sourceRect, franchise: fr } = activeAnimation

    const outer = outerRef.current
    const wrapper = wrapperRef.current
    const flipper = flipRef.current
    if (!outer || !wrapper || !flipper) return // safety — should never be null

    // ── 1. Update card back image directly (avoids waiting for a React re-render) ──
    if (backImgRef.current) {
      backImgRef.current.src = CARD_BACKS[fr]
      backImgRef.current.style.objectFit = OBJECT_FIT[fr]
    }
    // Also keep React state in sync for the initial render
    setFranchise(fr)

    // ── 2. Position and show the portal via direct DOM mutations (synchronous) ──
    outer.style.left = `${sourceRect.left}px`
    outer.style.top = `${sourceRect.top}px`
    outer.style.width = `${sourceRect.width}px`
    outer.style.height = `${sourceRect.height}px`
    outer.style.visibility = 'visible'

    // ── 3. Instantly reset any leftover transforms from the previous animation ──
    animate(wrapper, { x: 0, y: 0, scale: 1, opacity: 1 }, { duration: 0 })
    animate(flipper, { rotateY: 0 }, { duration: 0 })

    let aborted = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let flipCtrl: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let flyCtrl: any = null

    const run = async () => {
      if (aborted) return

      const deckRect = deckIconRef.current?.getBoundingClientRect() ?? null
      const flyX = deckRect
        ? deckRect.left + deckRect.width / 2 - (sourceRect.left + sourceRect.width / 2)
        : 0
      const flyY = deckRect
        ? deckRect.top + deckRect.height / 2 - (sourceRect.top + sourceRect.height / 2)
        : 0

      // Phase 1 — flip the card face over
      flipCtrl = animate(
        flipper,
        { rotateY: reducedMotion ? 0 : 180 },
        { duration: reducedMotion ? 0.05 : 0.9, ease: [0.4, 0, 0.2, 1] }
      )
      await flipCtrl
      flipCtrl = null
      if (aborted) return

      // Phase 2 — fly to the deck icon
      flyCtrl = animate(
        wrapper,
        { x: flyX, y: flyY, scale: 0.06, opacity: 0 },
        { duration: reducedMotion ? 0.1 : 1.4, ease: [0.4, 0, 0.2, 1] }
      )
      await flyCtrl
      flyCtrl = null
      if (aborted) return

      // Done — hide portal and clear context state
      outer.style.visibility = 'hidden'
      clearAnimation()
    }

    // Single RAF is enough — refs are always populated (portal never unmounts)
    const rafId = requestAnimationFrame(run)

    // Cleanup: cancel in-flight animation when a new trigger arrives
    return () => {
      aborted = true
      cancelAnimationFrame(rafId)
      try { flipCtrl?.stop() } catch { /* ignore */ }
      try { flyCtrl?.stop() } catch { /* ignore */ }
      outer.style.visibility = 'hidden'
    }
  }, [activeAnimation]) // eslint-disable-line react-hooks/exhaustive-deps

  // Portal is ALWAYS in the DOM — this is intentional.
  // Conditionally unmounting would nullify the refs and break the animation.
  return createPortal(
    <div
      ref={outerRef}
      style={{
        position: 'fixed',
        // Off-screen until an animation is triggered
        left: -9999,
        top: -9999,
        width: 0,
        height: 0,
        zIndex: 9999,
        perspective: 700,
        pointerEvents: 'none',
        visibility: 'hidden',
      }}
    >
      {/* framer-motion controls translate / scale / opacity on this node */}
      <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
        {/* framer-motion controls rotateY on this node */}
        <div
          ref={flipRef}
          style={{
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            position: 'relative',
          }}
        >
          {/* Front face */}
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
              ref={backImgRef}
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
      </div>
    </div>,
    document.body
  )
}
