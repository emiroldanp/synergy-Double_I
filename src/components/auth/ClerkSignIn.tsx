import { SignIn } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'

export default function ClerkSignIn() {
  return (
    <SignIn
      appearance={{
        baseTheme: dark,
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
