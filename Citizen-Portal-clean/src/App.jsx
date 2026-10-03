import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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
import {
  AboutPage,
  ContactPage,
  ServicesPage,
  TrackComplaintPage,
  UpdatesPage,
} from './Home/InfoPages.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Smart City Homepage */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/updates" element={<UpdatesPage />} />
        <Route path="/track-complaint" element={<TrackComplaintPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Existing Citizen Login */}
        <Route path="/citizen-login" element={<CitizenAuth />} />

        {/* Existing Citizen Dashboard */}
        <Route path="/citizen-portal" element={<CitizenPortal />} />

        {/* New Complaint */}
        <Route
          path="/citizen-new-complaint"
          element={<NewComplaint />}
        />

        {/* Emergency Services */}
        <Route
          path="/citizen-emergency"
          element={<Emergency />}
        />

        {/* Notifications */}
        <Route
          path="/citizen-notifications"
          element={<Notifications />}
        />

        {/* My Complaints */}
        <Route
          path="/citizen-my-complaints"
          element={<MyComplaints />}
        />

        {/* My Profile */}
        <Route
          path="/citizen-profile"
          element={<MyProfile />}
        />

        {/* Track Complaint */}
        <Route
          path="/citizen-track-complaint"
          element={<TrackComplaint />}
        />
        <Route
          path="/citizen-track-complaint/:id"
          element={<ComplaintTracking />}
        />

        {/* Complaint Tracking */}
        <Route
          path="/citizen-portal/complaint/:id"
          element={<ComplaintTracking />}
        />

        {/* Unknown URL */}
        <Route path="*" element={<Navigate to="/citizen-login" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App