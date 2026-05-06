import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ClerkProvider } from '@clerk/clerk-react'
import { ClerkAuthProvider } from '@/components/auth/ClerkAuthProvider'
import './index.css'
import App from './App'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
const HAS_CLERK = Boolean(PUBLISHABLE_KEY && PUBLISHABLE_KEY !== 'pk_test_placeholder')

function Root() {
  if (HAS_CLERK) {
    return (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <ClerkAuthProvider>
          <HelmetProvider>
            <App />
          </HelmetProvider>
        </ClerkAuthProvider>
      </ClerkProvider>
    )
  }
  return (
    <HelmetProvider>
      <App />
    </HelmetProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
