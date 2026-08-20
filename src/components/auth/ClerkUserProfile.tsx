import { UserProfile } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'

export default function ClerkUserProfile() {
  return (
    <UserProfile
      appearance={{
        baseTheme: dark,
        variables: {
          colorBackground: '#1E0E40',
          colorInputBackground: '#160B30',
          colorPrimary: '#CC1515',
          colorText: '#C8D8F0',
          colorTextSecondary: '#8A90A8',
          colorNeutral: '#8A90A8',
          borderRadius: '2px',
        },
        elements: {
          rootBox: 'w-full',
          cardBox: 'w-full shadow-none',
          card: 'bg-deep border border-navy/50 shadow-none w-full',
          navbar: 'bg-abyss border-r border-navy/40',
          navbarButton: 'text-ash font-exo hover:text-frost',
          navbarButtonIcon: 'text-ash',
          navbarMobileMenuButton: 'text-ash',
          pageScrollBox: 'bg-deep',
          scrollBox: 'bg-deep',
          headerTitle: 'font-agency text-white uppercase tracking-wider',
          headerSubtitle: 'font-exo text-ash text-xs',
          profileSectionTitleText: 'font-agency text-frost uppercase text-xs tracking-wider',
          profileSectionContent: 'font-exo text-ash',
          formFieldLabel: 'font-exo text-ash text-xs',
          formFieldInput: 'bg-abyss border border-navy/50 text-frost',
          formButtonPrimary: 'bg-crimson hover:bg-flame font-agency uppercase tracking-wider',
          badge: 'bg-navy/40 text-frost border border-navy/60',
          avatarBox: 'border border-navy/50',
        },
      }}
    />
  )
}
