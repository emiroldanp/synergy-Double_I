import { ReactNode, useEffect } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { AuthContext } from '@/hooks/useAuth'
import { setAuthToken } from '@/lib/api'

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut, getToken } = useClerkAuth()

  const isAdmin = user?.publicMetadata?.role === 'admin'
  const isBannerEditor = user?.publicMetadata?.role === 'banner_editor'

  useEffect(() => {
    if (isSignedIn) {
      getToken().then(setAuthToken)
    } else {
      setAuthToken(null)
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
