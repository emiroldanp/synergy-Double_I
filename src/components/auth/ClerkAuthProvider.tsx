import { ReactNode } from 'react'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { AuthContext } from '@/hooks/useAuth'

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut, getToken } = useClerkAuth()

  const isAdmin = user?.publicMetadata?.role === 'admin'

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
        signOut: () => signOut(),
        getToken: () => getToken(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
