import { ReactNode, useEffect } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { AuthContext } from '@/hooks/useAuth'
import { setGetTokenFn } from '@/lib/api'

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut, getToken } = useClerkAuth()

  const isAdmin = user?.publicMetadata?.role === 'admin'
  const isBannerEditor = user?.publicMetadata?.role === 'banner_editor'

  // Registramos getToken (no el token en sí) para que cada petición obtenga un token fresco
  useEffect(() => {
    if (isSignedIn) {
      setGetTokenFn(getToken)
    } else {
      setGetTokenFn(null)
    }
  }, [isSignedIn, getToken])

  return (
    <AuthContext.Provider
      value={{
        user: user
          ? {
              firstName: user.firstName ?? undefined,
              emailAddresses: user.emailAddresses.map((e) => ({ emailAddress: e.emailAddress })),
              publicMetadata: user.publicMetadata as { role?: string },
            }
          : null,
        isLoaded,
        isSignedIn: isSignedIn ?? false,
        isAdmin,
        isBannerEditor,
        signOut: () => signOut(),
        getToken: () => getToken(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
