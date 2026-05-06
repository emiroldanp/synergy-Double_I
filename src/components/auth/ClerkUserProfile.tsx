import { UserProfile } from '@clerk/clerk-react'

export default function ClerkUserProfile() {
  return (
    <UserProfile
      appearance={{
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
