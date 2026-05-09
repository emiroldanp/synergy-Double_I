import { createContext, useContext, useRef, useState, useCallback } from 'react'
import type { ReactNode, RefObject } from 'react'
import type { Franchise } from '@/types'

export interface FlipFlyPayload {
  key: number
  sourceRect: DOMRect
  franchise: Franchise
}

interface DeckAnimationContextValue {
  deckIconRef: RefObject<HTMLButtonElement | null>
  triggerFlipFly: (sourceRect: DOMRect, franchise: Franchise) => void
  activeAnimation: FlipFlyPayload | null
  clearAnimation: () => void
}

const DeckAnimationContext = createContext<DeckAnimationContextValue | null>(null)

export function DeckAnimationProvider({ children }: { children: ReactNode }) {
  const deckIconRef = useRef<HTMLButtonElement>(null)
  const [activeAnimation, setActiveAnimation] = useState<FlipFlyPayload | null>(null)
  const keyRef = useRef(0)

  const triggerFlipFly = useCallback((sourceRect: DOMRect, franchise: Franchise) => {
    keyRef.current += 1
    setActiveAnimation({ key: keyRef.current, sourceRect, franchise })
  }, [])

  const clearAnimation = useCallback(() => {
    setActiveAnimation(null)
  }, [])

  return (
    <DeckAnimationContext.Provider value={{ deckIconRef, triggerFlipFly, activeAnimation, clearAnimation }}>
      {children}
    </DeckAnimationContext.Provider>
  )
}

export function useDeckAnimation() {
  const ctx = useContext(DeckAnimationContext)
  if (!ctx) throw new Error('useDeckAnimation debe usarse dentro de DeckAnimationProvider')
  return ctx
}
