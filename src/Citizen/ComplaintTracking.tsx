import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import smartCityMark from '../assets/smart-city-mark.svg'
import { API_BASE_URL, formatComplaintId } from '../api'
import './ComplaintTracking.css'

type Complaint = {
  id: number
  category: string
  description: string
  location: string
  priority: string
  status: string
  latitude?: number | null
  longitude?: number | null
  created_at?: string
  updated_at?: string
}

function getTitle(description = '') {
  const match = description.match(/^Title:\s*(.+?)(?:\n|$)/i)

  return match?.[1]?.trim() || 'Citizen Complaint'
}

function ComplaintTracking() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setError('Complaint ID is missing.')
      setLoading(false)
      return
    }

    const loadComplaint = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `${API_BASE_URL}/api/complaints/${encodeURIComponent(id)}`,
        )

        if (!response.ok) {
          const text = await response.text()

          let message = 'Unable to load complaint.'

          try {
            const data = JSON.parse(text)
            message = data?.message || message
          } catch {
            console.error('Non-JSON response:', text)
          }

          throw new Error(message)
        }

        const data = await response.json()

        setComplaint(data)
      } catch (err) {
        console.error('TRACK COMPLAINT ERROR:', err)

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load complaint.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadComplaint()
  }, [id])

  if (loading) {
    return (
      <div className="tracking-page">
        <div className="tracking-loading">
          <div className="tracking-spinner" />
          <p>Loading complaint details...</p>
        </div>
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <div className="tracking-page">
        <div className="tracking-error">
          <div className="error-icon">!</div>

          <h2>Complaint Not Found</h2>

          <p>{error || 'This complaint could not be found.'}</p>

          <button onClick={() => navigate('/citizen-portal')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const status = complaint.status?.toLowerCase()

  const isPending = status === 'pending'
  const isInProgress = status === 'in progress'
  const isResolved = status === 'resolved'

  return (
    <div className="tracking-page">
      {/* TOP BAR */}
      <header className="tracking-topbar">
        <div
          className="tracking-brand"
          onClick={() => navigate('/citizen-portal')}
        >
          <img className="tracking-logo" src={smartCityMark} alt="Smart City logo" />

          <div>
            <strong>Smart City</strong>
            <span>Citizen Portal</span>
          </div>
        </div>

        <button
          className="back-dashboard"
          onClick={() => navigate('/citizen-portal')}
        >
          ← Back to Dashboard
        </button>
      </header>

      <main className="tracking-content">
        {/* PAGE HEADER */}
        <div className="tracking-heading">
          <div>
            <p className="breadcrumb">
              Dashboard / Track Complaint
            </p>

            <h1>Track Complaint</h1>

            <p>
              Follow the current progress of your submitted complaint.
            </p>
          </div>

          <div className="tracking-id">
            <span>COMPLAINT ID</span>
            <strong>{formatComplaintId(complaint.id)}</strong>
          </div>
        </div>

        {/* STATUS CARD */}
        <section className="tracking-status-card">
          <div>
            <span className="small-label">CURRENT STATUS</span>

            <h2>{complaint.status}</h2>

            <p>
              Your complaint is currently being processed by
              the Smart City team.
            </p>
          </div>

          <div
            className={`big-status-icon ${
              isResolved
                ? 'resolved'
                : isInProgress
                  ? 'progress'
                  : 'pending'
            }`}
          >
            {isResolved ? '✓' : isInProgress ? '↻' : '…'}
          </div>
        </section>

        {/* PROGRESS */}
        <section className="tracking-card">
          <div className="section-heading">
            <div>
              <h2>Complaint Progress</h2>
              <p>Track the journey of your complaint.</p>
            </div>
          </div>

          <div className="tracking-timeline">
            {/* SUBMITTED */}
            <div className="timeline-item completed">
              <div className="timeline-marker">✓</div>

              <div className="timeline-content">
                <h3>Complaint Submitted</h3>

                <p>
                  Your complaint has been successfully received.
                </p>

                {complaint.created_at && (
                  <span>
                    {new Date(
                      complaint.created_at,
                    ).toLocaleString('en-GB')}
                  </span>
                )}
              </div>
            </div>

            {/* PENDING */}
            <div
              className={`timeline-item ${
                isPending || isInProgress || isResolved
                  ? 'completed'
                  : ''
              }`}
            >
              <div className="timeline-marker">
                {isPending || isInProgress || isResolved
                  ? '✓'
                  : '2'}
              </div>

              <div className="timeline-content">
                <h3>Complaint Under Review</h3>

                <p>
                  Your complaint has been received and is under
                  review.
                </p>
              </div>
            </div>

            {/* IN PROGRESS */}
            <div
              className={`timeline-item ${
                isInProgress || isResolved ? 'completed' : ''
              }`}
            >
              <div className="timeline-marker">
                {isInProgress || isResolved ? '✓' : '3'}
              </div>

              <div className="timeline-content">
                <h3>In Progress</h3>

                <p>
                  The relevant team is working on your complaint.
                </p>
              </div>
            </div>

            {/* RESOLVED */}
            <div
              className={`timeline-item ${
                isResolved ? 'completed' : ''
              }`}
            >
              <div className="timeline-marker">
                {isResolved ? '✓' : '4'}
              </div>

              <div className="timeline-content">
                <h3>Resolved</h3>

                <p>
                  The complaint has been resolved.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* DETAILS */}
        <section className="tracking-card">
          <div className="section-heading">
            <div>
              <h2>Complaint Details</h2>
              <p>Information related to your complaint.</p>
            </div>
          </div>

          <div className="details-grid">
            <div className="detail-box">
              <span>Complaint Title</span>
              <strong>{getTitle(complaint.description)}</strong>
            </div>

            <div className="detail-box">
              <span>Category</span>
              <strong>{complaint.category}</strong>
            </div>

            <div className="detail-box">
              <span>Priority</span>
              <strong className={`priority ${complaint.priority?.toLowerCase()}`}>
                {complaint.priority}
              </strong>
            </div>

            <div className="detail-box">
              <span>Location</span>
              <strong>{complaint.location}</strong>
            </div>
          </div>

          <div className="description-box">
            <span>Description</span>

            <p>
              {complaint.description
                .replace(/^Title:\s*.+?(?:\n\n|\n)/i, '')
                .trim() || 'No description available.'}
            </p>
          </div>
        </section>

        {/* HELP */}
        <section className="tracking-help">
          <div>
            <h3>Need help with this complaint?</h3>

            <p>
              If you need additional information, contact Smart
              City support.
            </p>
          </div>

          <button>Contact Support</button>
        </section>
      </main>
    </div>
  )
}

export default ComplaintTracking