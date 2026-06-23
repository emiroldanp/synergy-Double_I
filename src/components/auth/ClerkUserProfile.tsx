import { UserProfile } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'

export default function ClerkUserProfile() {
  return (
    <UserProfile
      appearance={{
        baseTheme: dark,
        elements: {
          rootBox: 'w-full',
          card: 'bg-deep border border-navy/50 shadow-none',
          headerTitle: 'font-agency text-white',
          navbarButton: 'text-ash',
          formButtonPrimary: 'bg-crimson hover:bg-flame font-agency uppercase',
        },
      }}
    />
  )
}
