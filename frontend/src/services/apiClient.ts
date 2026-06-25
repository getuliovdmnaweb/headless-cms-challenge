const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export class ApiError extends Error {
  status: number
  field?: string

  constructor(status: number, error?: { field?: string; message?: string }) {
    super(error?.message || 'Request failed')
    this.status = status
    this.field = error?.field
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}
