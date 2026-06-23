import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ClerkProvider } from '@clerk/clerk-react'
import { ClerkAuthProvider } from '@/components/auth/ClerkAuthProvider'
import { CartProvider } from '@/context/CartContext'
import { DeckAnimationProvider } from '@/context/DeckAnimationContext'
import './index.css'
import App from './App'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
const HAS_CLERK = Boolean(PUBLISHABLE_KEY && PUBLISHABLE_KEY !== 'pk_test_placeholder')

function Root() {
  if (HAS_CLERK) {
    return (
      <DeckAnimationProvider>
        <CartProvider>
          <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <ClerkAuthProvider>
              <HelmetProvider>
                <App />
              </HelmetProvider>
            </ClerkAuthProvider>
          </ClerkProvider>
        </CartProvider>
      </DeckAnimationProvider>
    )
  }
  return (
    <DeckAnimationProvider>
      <CartProvider>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </CartProvider>
    </DeckAnimationProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
