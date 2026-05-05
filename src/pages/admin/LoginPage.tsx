import { SignIn } from '@clerk/clerk-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">TCG Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Panel de administración Irving Gallart</p>
        </div>
        <SignIn
          routing="hash"
          afterSignInUrl="/admin/dashboard"
          appearance={{
            elements: {
              rootBox: 'shadow-lg',
              card: 'rounded-xl',
            },
          }}
        />
      </div>
    </div>
  )
}
