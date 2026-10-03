const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error(
    'VITE_API_URL must be configured to the backend API URL for production builds.',
  )
}

export const API_BASE_URL = (
  configuredApiUrl || 'http://localhost:5000'
).replace(/\/+$/, '')

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('citizen_token')

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function requestJson<T>(url: string, data: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  })

  const text = await response.text()
  let result: { message?: string } & T

  try {
    const parsed: unknown = text ? JSON.parse(text) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Response must be a JSON object')
    }
    result = parsed as { message?: string } & T
  } catch {
    throw new Error('The server returned an invalid response')
  }

  if (!response.ok) {
    throw new Error(result.message || 'The request could not be completed')
  }

  return result
}

export interface ProfileUpdateData {
  name: string
  phone: string
  address: string
}

export interface PasswordChangeData {
  currentPassword: string
  newPassword: string
}

export interface UpdatedCitizenProfile {
  citizen_id: string
  name: string
  email: string
  phone: string | null
  area: string | null
}

export function updateProfile(data: ProfileUpdateData) {
  return requestJson<{ message: string; citizen: UpdatedCitizenProfile }>(
    `${API_BASE_URL}/api/citizens/me`,
    data,
  )
}

export function changePassword(data: PasswordChangeData) {
  return requestJson<{ message: string }>(
    `${API_BASE_URL}/api/citizens/me/password`,
    data,
  )
}

export function formatComplaintId(id: number | string) {
  return `SC-${String(id).padStart(5, '0')}`
}

export async function getCitizenComplaints() {
  const response = await fetch(
    `${API_BASE_URL}/api/complaints/me`,
    { headers: getAuthHeaders(), credentials: 'include' },
  )

  if (!response.ok) {
    const text = await response.text()

    let errorMessage = 'Unable to fetch citizen complaints'

    try {
      const error = JSON.parse(text)
      errorMessage = error?.message || errorMessage
    } catch {
      console.error('API returned non-JSON response:', text)
    }

    throw new Error(errorMessage)
  }

  return response.json()
}