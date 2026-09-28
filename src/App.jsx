import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import CitizenAuth from './Citizen/CitizenAuth.tsx'
import CitizenPortal from './Citizen/CitizenPortal.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/citizen-login" element={<CitizenAuth />} />
        <Route path="/citizen-portal" element={<CitizenPortal />} />
        <Route path="*" element={<Navigate to="/citizen-login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
