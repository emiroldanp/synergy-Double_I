import { createContext, useContext, useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Franchise } from '@/types'

export interface FlipFlyPayload {
  sourceRect: DOMRect
  franchise: Franchise
}

interface DeckAnimationContextValue {
  deckIconRef: React.RefObject<HTMLButtonElement | null>
  triggerFlipFly: (payload: FlipFlyPayload) => void
  activeAnimation: FlipFlyPayload | null
  clearAnimation: () => void
}

const DeckAnimationContext = createContext<DeckAnimationContextValue | null>(null)

export function DeckAnimationProvider({ children }: { children: ReactNode }) {
  const deckIconRef = useRef<HTMLButtonElement>(null)
  const [activeAnimation, setActiveAnimation] = useState<FlipFlyPayload | null>(null)

  const triggerFlipFly = useCallback((payload: FlipFlyPayload) => {
    setActiveAnimation(payload)
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
