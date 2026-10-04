import { useLayoutEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import CitizenAuth from './Citizen/CitizenAuth.tsx'
import CitizenPortal from './Citizen/CitizenPortal.tsx'
import ComplaintTracking from './Citizen/ComplaintTracking'
import Emergency from './Citizen/Emergency.tsx'
import MyComplaints from './Citizen/MyComplaints'
import MyProfile from './Citizen/MyProfile'
import NewComplaint from './Citizen/NewComplaint'
import Notifications from './Citizen/Notifications.tsx'
import TrackComplaint from './Citizen/TrackComplaint'
import Home from './Home/Home.tsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import {
  AboutPage,
  ContactPage,
  ServicesPage,
  TrackComplaintPage,
  UpdatesPage,
} from './Home/InfoPages.tsx'

function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>

        {/* Public Smart City Homepage */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/updates" element={<UpdatesPage />} />
        <Route path="/track-complaint" element={<TrackComplaintPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Public citizen login */}
        <Route path="/login" element={<CitizenAuth />} />
        <Route path="/citizen-login" element={<CitizenAuth />} />

        {/* Protected citizen portal */}
        <Route path="/citizen-portal" element={<ProtectedRoute><CitizenPortal /></ProtectedRoute>} />

        {/* New Complaint */}
        <Route
          path="/citizen-new-complaint"
          element={<ProtectedRoute><NewComplaint /></ProtectedRoute>}
        />

        {/* Emergency Services */}
        <Route
          path="/citizen-emergency"
          element={<ProtectedRoute><Emergency /></ProtectedRoute>}
        />

        {/* Notifications */}
        <Route
          path="/citizen-notifications"
          element={<ProtectedRoute><Notifications /></ProtectedRoute>}
        />

        {/* My Complaints */}
        <Route
          path="/citizen-my-complaints"
          element={<ProtectedRoute><MyComplaints /></ProtectedRoute>}
        />

        {/* My Profile */}
        <Route
          path="/citizen-profile"
          element={<ProtectedRoute><MyProfile /></ProtectedRoute>}
        />

        {/* Track Complaint */}
        <Route
          path="/citizen-track-complaint"
          element={<ProtectedRoute><TrackComplaint /></ProtectedRoute>}
        />
        <Route
          path="/citizen-track-complaint/:id"
          element={<ProtectedRoute><ComplaintTracking /></ProtectedRoute>}
        />

        {/* Complaint Tracking */}
        <Route
          path="/citizen-portal/complaint/:id"
          element={<ProtectedRoute><ComplaintTracking /></ProtectedRoute>}
        />

        {/* Unknown URL */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App