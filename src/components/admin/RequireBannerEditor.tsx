import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'

interface Props {
  children: React.ReactNode
}

export default function RequireBannerEditor({ children }: Props) {
  const { isLoaded, isSignedIn, isAdmin, isBannerEditor } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/mi-cuenta" replace />
  }

  if (!isAdmin && !isBannerEditor) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso denegado</h1>
          <p className="text-gray-500">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
