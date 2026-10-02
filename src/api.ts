export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
).replace(/\/+$/, '')

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('citizen_token')

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function formatComplaintId(id: number | string) {
  return `SC-${String(id).padStart(5, '0')}`
}

export async function getCitizenComplaints(citizenId: string) {
  if (!citizenId) {
    throw new Error('Citizen ID is required')
  }

  const response = await fetch(
    `${API_BASE_URL}/api/complaints/citizen/${encodeURIComponent(citizenId)}`,
    { headers: getAuthHeaders() },
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