import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuccessToast } from './components/SuccessToast'

import Home from './Home/Home'

/* ──────────────────────────────────────────────────
   Lazy-loaded route components (code splitting)
────────────────────────────────────────────────── */

const InfoPages         = lazy(() => import('./Home/InfoPages').then(m => ({ default: m.AboutPage })))
const ServicesPage      = lazy(() => import('./Home/InfoPages').then(m => ({ default: m.ServicesPage })))
const UpdatesPage       = lazy(() => import('./Home/InfoPages').then(m => ({ default: m.UpdatesPage })))
const TrackComplaintPage = lazy(() => import('./Home/InfoPages').then(m => ({ default: m.TrackComplaintPage })))
const ContactPage       = lazy(() => import('./Home/InfoPages').then(m => ({ default: m.ContactPage })))

const CitizenAuth       = lazy(() => import('./Citizen/CitizenAuth'))
const CitizenPortal     = lazy(() => import('./Citizen/CitizenPortal'))
const NewComplaint      = lazy(() => import('./Citizen/NewComplaint'))
const Emergency         = lazy(() => import('./Citizen/Emergency'))
const Notifications     = lazy(() => import('./Citizen/Notifications'))
const MyComplaints      = lazy(() => import('./Citizen/MyComplaints'))
const MyProfile         = lazy(() => import('./Citizen/MyProfile'))
const TrackComplaint    = lazy(() => import('./Citizen/TrackComplaint'))
const ComplaintTracking = lazy(() => import('./Citizen/ComplaintTracking'))

/* ──────────────────────────────────────────────────
   Loading spinner shown while lazy chunks load
────────────────────────────────────────────────── */
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f1f5f9',
    }}>
      <div style={{
        width: 42,
        height: 42,
        border: '4px solid #dde5f0',
        borderTopColor: '#0878e8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ──────────────────────────────────────────────────
   Scroll-reveal: adds .is-visible to .scroll-reveal
   elements as they enter the viewport
────────────────────────────────────────────────── */
function ScrollRevealObserver() {
  const location = useLocation()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )

    const observeAll = () => {
      document.querySelectorAll('.scroll-reveal').forEach((el) => {
        observer.observe(el)
      })
    }

    observeAll()
    const tid = setTimeout(observeAll, 150)

    return () => {
      clearTimeout(tid)
      observer.disconnect()
    }
  }, [location.pathname])

  return null
}

function App() {
  return (
    <BrowserRouter>
      {/* Accessibility: skip to main content */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      <ScrollRevealObserver />
      <SuccessToast />

      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Public: Smart City Homepage ── */}
          <Route path="/"               element={<Home />} />
          <Route path="/about"          element={<InfoPages />} />
          <Route path="/services"       element={<ServicesPage />} />
          <Route path="/updates"        element={<UpdatesPage />} />
          <Route path="/track-complaint" element={<TrackComplaintPage />} />
          <Route path="/contact"        element={<ContactPage />} />

          {/* ── Citizen Auth ── */}
          <Route path="/citizen-login" element={<CitizenAuth />} />

          {/* ── Protected Citizen Routes ── */}
          <Route path="/citizen-portal" element={
            <ProtectedRoute><CitizenPortal /></ProtectedRoute>
          } />
          <Route path="/citizen-new-complaint" element={
            <ProtectedRoute><NewComplaint /></ProtectedRoute>
          } />
          <Route path="/citizen-emergency" element={
            <ProtectedRoute><Emergency /></ProtectedRoute>
          } />
          <Route path="/citizen-notifications" element={
            <ProtectedRoute><Notifications /></ProtectedRoute>
          } />
          <Route path="/citizen-my-complaints" element={
            <ProtectedRoute><MyComplaints /></ProtectedRoute>
          } />
          <Route path="/citizen-profile" element={
            <ProtectedRoute><MyProfile /></ProtectedRoute>
          } />
          <Route path="/citizen-track-complaint" element={
            <ProtectedRoute><TrackComplaint /></ProtectedRoute>
          } />
          <Route path="/citizen-track-complaint/:id" element={
            <ProtectedRoute><ComplaintTracking /></ProtectedRoute>
          } />
          <Route path="/citizen-portal/complaint/:id" element={
            <ProtectedRoute><ComplaintTracking /></ProtectedRoute>
          } />

          {/* ── Fallback: unknown URL → home ── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App