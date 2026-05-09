import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, isAdmin } = useAuth()

  if (!isLoaded) return null
  if (!isSignedIn || !isAdmin) return <Navigate to="/mi-cuenta" replace />

  return <>{children}</>
}
