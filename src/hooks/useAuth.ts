import { createContext, useContext } from 'react'

export interface AuthContextValue {
  user: { firstName?: string; emailAddresses?: { emailAddress: string }[]; publicMetadata?: { role?: string } } | null
  isLoaded: boolean
  isSignedIn: boolean
  isAdmin: boolean
  signOut: () => void
  getToken: () => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoaded: true,
  isSignedIn: false,
  isAdmin: false,
  signOut: () => {},
  getToken: async () => null,
})

export function useAuth() {
  return useContext(AuthContext)
}
