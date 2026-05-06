import { SignIn } from '@clerk/clerk-react'

export default function ClerkSignIn() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'bg-deep border border-navy/50 shadow-none',
          headerTitle: 'font-agency text-white uppercase tracking-wider',
          formButtonPrimary: 'bg-crimson hover:bg-flame font-agency uppercase tracking-wider',
          formFieldInput: 'bg-abyss border-navy/60 text-frost',
          footerActionLink: 'text-dragon',
        },
      }}
    />
  )
}
