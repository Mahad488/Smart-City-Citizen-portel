import { Navigate, useLocation } from 'react-router-dom'

function hasActiveToken() {
  try {
    const token = localStorage.getItem('citizen_token')
    if (!token) {
      return false
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    )

    return Number.isInteger(payload.exp) && payload.exp > Date.now() / 1000
  } catch {
    return false
  }
}

export default function ProtectedRoute({ children }) {
  const location = useLocation()

  if (!hasActiveToken()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  return children
}
