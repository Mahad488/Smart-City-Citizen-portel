import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

/**
 * Guards a route — redirects to /citizen-login if no auth token is found.
 * Passes the intended URL as ?redirectTo= so the user returns to the right
 * page after logging in.
 */
export function ProtectedRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const location = useLocation()
  const token = localStorage.getItem('citizen_token')

  if (!token) {
    return (
      <Navigate
        to={`/citizen-login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }

  return <>{children}</>
}

/** Returns the logged-in citizen object from localStorage, or null. */
export function useAuth() {
  try {
    const raw = localStorage.getItem('citizen')
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
  } catch {
    return null
  }
}
