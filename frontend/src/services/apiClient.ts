const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export interface ApiFieldError {
  field: string
  message?: string
  reason?: string
}

interface ApiErrorBody {
  error?: ApiFieldError
  errors?: ApiFieldError[]
}

export class ApiError extends Error {
  status: number
  field?: string
  errors: ApiFieldError[]

  constructor(status: number, body?: ApiErrorBody) {
    const errors = body?.errors ?? (body?.error ? [body.error] : [])
    super(errors[0]?.message || 'Request failed')
    this.status = status
    this.field = errors[0]?.field
    this.errors = errors
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}
