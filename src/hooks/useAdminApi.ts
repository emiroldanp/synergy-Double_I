import { useAuth } from '@clerk/clerk-react'

export function useAdminApi() {
  const { getToken } = useAuth()

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message ?? 'Error en la solicitud')
    }
    return res.json()
  }

  return { apiFetch }
}
