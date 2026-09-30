import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { formatComplaintId, getCitizenComplaints } from '../api'
import { CitizenNavbar, CitizenSidebar } from './CitizenNavigation'
import './Citizenportal.css'

type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved' | string

type Complaint = {
  id: number | string
  title: string
  category: string
  status: ComplaintStatus
  date: string
  location: string
  priority: string
  description: string
}

function extractComplaintTitle(description = '') {
  const match = description.match(/^Title:\s*(.+?)(?:\n|$)/i)

  if (match?.[1]) {
    return match[1].trim()
  }

  return 'Citizen Complaint'
}

const updates = [
  {
    icon: '♻',
    title: 'New waste collection schedule for all zones',
    date: '28 Sep 2026',
    type: 'green',
  },
  {
    icon: '🔧',
    title: 'Road maintenance updates',
    date: '26 Sep 2026',
    type: 'purple',
  },
  {
    icon: '💧',
    title: 'Water supply notification',
    date: '25 Sep 2026',
    type: 'blue',
  },
  {
    icon: '📢',
    title: 'Public holiday announcement',
    date: '20 Sep 2026',
    type: 'orange',
  },
]

function Icon({
  name,
  size = 18,
}: {
  name: string
  size?: number
}) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  const icons: Record<string, ReactNode> = {
    dashboard: (
      <svg {...svgProps}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="4" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="12" width="7" height="9" rx="1.5" />
      </svg>
    ),
    complaint: (
      <svg {...svgProps}>
        <path d="M7 17.5V7.5A2.5 2.5 0 0 1 9.5 5h5A2.5 2.5 0 0 1 17 7.5v7.5l-3 3-3-3H9.5A2.5 2.5 0 0 1 7 17.5Z" />
        <path d="M12 9v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
    complaints: (
      <svg {...svgProps}>
        <path d="M8 4h9a2 2 0 0 1 2 2v11l-4-3H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M9.5 9h5" />
        <path d="M9.5 12h5" />
      </svg>
    ),
    track: (
      <svg {...svgProps}>
        <circle cx="11" cy="11" r="5.5" />
        <path d="M16 16l4 4" />
      </svg>
    ),
    emergency: (
      <svg {...svgProps}>
        <path d="M12 3.5 18 11v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8l6-7.5Z" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
    ),
    notifications: (
      <svg {...svgProps}>
        <path d="M7 16h10l-1.2-1.5V10a3.8 3.8 0 1 0-7.6 0v4.5L7 16Z" />
        <path d="M10 18a2 2 0 0 0 4 0" />
      </svg>
    ),
    profile: (
      <svg {...svgProps}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19c1.4-2.6 4-4 7-4s5.6 1.4 7 4" />
      </svg>
    ),
    logout: (
      <svg {...svgProps}>
        <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h6.4A1.8 1.8 0 0 1 19 5.8v12.4A1.8 1.8 0 0 1 17.2 20h-6.4A1.8 1.8 0 0 1 9 18.2V17" />
        <path d="M14 12H4" />
        <path d="m7 8 4 4-4 4" />
      </svg>
    ),
    search: (
      <svg {...svgProps}>
        <circle cx="11" cy="11" r="5.5" />
        <path d="m16 16 4 4" />
      </svg>
    ),
    bell: (
      <svg {...svgProps}>
        <path d="M7 16h10l-1.2-1.5V10a3.8 3.8 0 1 0-7.6 0v4.5L7 16Z" />
        <path d="M10 18a2 2 0 0 0 4 0" />
      </svg>
    ),
    arrow: (
      <svg {...svgProps}>
        <path d="M9 6l6 6-6 6" />
      </svg>
    ),
    plus: (
      <svg {...svgProps}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
    document: (
      <svg {...svgProps}>
        <path d="M7 4.5h7l4 4V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" />
        <path d="M14 4.5V9h4" />
        <path d="M8.5 13h7" />
        <path d="M8.5 16h7" />
      </svg>
    ),
    phone: (
      <svg {...svgProps}>
        <path d="M6.5 4.5h3l1.2 3.5-1.8 1.7a12.8 12.8 0 0 0 7.1 7.1l1.7-1.8 3.5 1.2v3A1.9 1.9 0 0 1 18.5 20A15.5 15.5 0 0 1 4 5.5a1.9 1.9 0 0 1 2.5-1Z" />
      </svg>
    ),
    mail: (
      <svg {...svgProps}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
    help: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.8 9.5A2.6 2.6 0 0 1 12 8a2.6 2.6 0 0 1 2.2 4.1c-.8.9-1.5 1.4-1.9 2.1-.2.4-.3.7-.3 1.3" />
        <path d="M12 17h.01" />
      </svg>
    ),
  }

  return (
    <span className="portal-icon" aria-hidden="true">
      {icons[name] || <svg {...svgProps}><circle cx="12" cy="12" r="8" /></svg>}
    </span>
  )
}

function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span className={`status-badge ${status.toLowerCase().replace(' ', '-')}`}>
      {status}
    </span>
  )
}

function CitizenPortal() {
  const navigate = useNavigate()
  const [citizen, setCitizen] = useState<any>(null)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [complaintsLoading, setComplaintsLoading] = useState(true)
  const [complaintsError, setComplaintsError] = useState('')
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const savedCitizen = localStorage.getItem('citizen')

    if (!savedCitizen) {
      window.location.href = '/citizen-login'
      return
    }

    try {
      const citizenData = JSON.parse(savedCitizen)

      setCitizen(citizenData)

      const citizenId =
        citizenData.citizen_id ??
        citizenData.citizenId ??
        citizenData.id

      if (!citizenId) {
        setComplaintsError('Citizen ID not found. Please login again.')
        setComplaintsLoading(false)
        return
      }

      loadComplaints(String(citizenId))
    } catch (error) {
      console.error('CITIZEN DATA ERROR:', error)

      setComplaintsError('Invalid citizen session. Please login again.')
      setComplaintsLoading(false)
    }
  }, [])

  const loadComplaints = async (citizenId: string) => {
    try {
      setComplaintsLoading(true)
      setComplaintsError('')

      const data = await getCitizenComplaints(citizenId)

      const formattedComplaints: Complaint[] = data.map((item: any) => ({
        id: item.id,
        title: extractComplaintTitle(item.description),
        category: item.category || 'Other',
        status: item.status || 'Pending',
        date: item.created_at
          ? new Date(item.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '-',
        location: item.location || 'Not provided',
        priority: item.priority || 'Medium',
        description: item.description || '',
      }))

      setComplaints(formattedComplaints)
    } catch (error) {
      console.error('LOAD COMPLAINTS ERROR:', error)

      setComplaintsError(
        error instanceof Error
          ? error.message
          : 'Unable to load complaints',
      )
    } finally {
      setComplaintsLoading(false)
    }
  }

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) =>
      `${complaint.id} ${complaint.title} ${complaint.category} ${complaint.status} ${complaint.location}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
  }, [complaints, search])

  const totalComplaints = complaints.length

  const pendingComplaints = complaints.filter(
    (complaint) => complaint.status.toLowerCase() === 'pending',
  ).length

  const inProgressComplaints = complaints.filter(
    (complaint) => complaint.status.toLowerCase() === 'in progress',
  ).length

  const resolvedComplaints = complaints.filter(
    (complaint) => complaint.status.toLowerCase() === 'resolved',
  ).length

  const handleMenu = (menu: string) => {
    setActiveMenu(menu)

    if (menu === 'My Complaints') {
      navigate('/citizen-my-complaints')
      return
    }

    if (menu === 'Track Complaint') {
      document.getElementById('my-complaints')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      return
    }

    if (menu === 'Dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (menu === 'New Complaint') {
      navigate('/citizen-new-complaint')
      return
    }

    if (menu === 'Emergency') {
      navigate('/citizen-emergency')
      return
    }

    if (menu === 'Notifications') {
      navigate('/citizen-notifications')
      return
    }

    if (menu === 'Logout') {
      window.location.href = '/citizen-login'
    }
  }

  return (
    <div className="citizen-dashboard">
      <CitizenSidebar activeItem={activeMenu} onNavigate={handleMenu} />

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        <CitizenNavbar
          citizenName={citizen?.name || 'Citizen'}
          searchValue={search}
          onSearchChange={setSearch}
        />

        <div className="dashboard-content">
          {/* WELCOME */}
          <section className="welcome-banner">
            <div>
              <h1>
                Welcome, {citizen?.name || 'Citizen'} <span>👋</span>
              </h1>
              <p>
                Here's what's happening with your complaints and services.
              </p>
            </div>

            <div className="account-status">
              <span>STATUS</span>
              <strong>Active</strong>
            </div>
          </section>

          {/* STAT CARDS */}
          <section className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-icon">
                <Icon name="complaints" size={21} />
              </div>

              <div>
                <span>Total Complaints</span>
                <strong>{totalComplaints}</strong>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">
                <Icon name="complaint" size={22} />
              </div>

              <div>
                <span>Pending</span>
                <strong>{pendingComplaints}</strong>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <span>↻</span>
              </div>

              <div>
                <span>In Progress</span>
                <strong>{inProgressComplaints}</strong>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">
                <span>▥</span>
              </div>

              <div>
                <span>Resolved</span>
                <strong>{resolvedComplaints}</strong>
              </div>
            </div>
          </section>

          {/* MAIN GRID */}
          <div className="dashboard-grid">
            {/* LEFT */}
            <div className="dashboard-left">
              {/* COMPLAINTS */}
              <section
                className="dashboard-card complaints-card"
                id="my-complaints"
              >
                <div className="card-header">
                  <div>
                    <h2>My Complaints</h2>
                    <p>Track and manage your submitted complaints</p>
                  </div>

                  <button
                    className="view-all"
                    onClick={() => handleMenu('My Complaints')}
                  >
                    View All <Icon name="arrow" size={15} />
                  </button>
                </div>

                <div className="complaints-table-wrapper">
                  <table className="complaints-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {complaintsLoading ? (
                        <tr>
                          <td colSpan={6} className="empty-table">
                            Loading your complaints...
                          </td>
                        </tr>
                      ) : complaintsError ? (
                        <tr>
                          <td colSpan={6} className="empty-table">
                            {complaintsError}
                          </td>
                        </tr>
                      ) : filteredComplaints.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty-table">
                            No complaints found.
                          </td>
                        </tr>
                      ) : (
                        filteredComplaints.map((complaint) => (
                          <tr
                            key={complaint.id}
                            className="complaint-row"
                            onClick={() =>
                              navigate(`/citizen-portal/complaint/${complaint.id}`)
                            }
                          >
                            <td>
                              <strong>{formatComplaintId(complaint.id)}</strong>
                            </td>

                            <td>{complaint.title}</td>

                            <td>{complaint.category}</td>

                            <td>
                              <StatusBadge
                                status={complaint.status as ComplaintStatus}
                              />
                            </td>

                            <td>{complaint.date}</td>

                            <td>
                              <button
                                type="button"
                                className="track-record-btn"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  navigate(`/citizen-portal/complaint/${complaint.id}`)
                                }}
                              >
                                Track
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* BOTTOM CARDS */}
              <div className="bottom-grid">
                {/* QUICK ACTIONS */}
                <section className="dashboard-card quick-card">
                  <div className="card-header">
                    <div>
                      <h2>Quick Actions</h2>
                    </div>
                  </div>

                  <div className="quick-actions">
                    <button
                      onClick={() => handleMenu('New Complaint')}
                    >
                      <span className="quick-icon blue-icon">
                        <Icon name="complaint" />
                      </span>
                      <span>Submit<br />Complaint</span>
                    </button>

                    <button
                      onClick={() => handleMenu('Track Complaint')}
                    >
                      <span className="quick-icon purple-icon">
                        <Icon name="track" />
                      </span>
                      <span>Track<br />Complaint</span>
                    </button>

                    <button
                      onClick={() => handleMenu('Emergency')}
                    >
                      <span className="quick-icon red-icon">
                        !
                      </span>
                      <span>Emergency</span>
                    </button>

                    <button
                      onClick={() => handleMenu('Notifications')}
                    >
                      <span className="quick-icon green-icon">
                        <Icon name="document" />
                      </span>
                      <span>View<br />Notices</span>
                    </button>
                  </div>
                </section>

                {/* HELP */}
                <section className="dashboard-card help-card">
                  <div className="card-header">
                    <div>
                      <h2>Need Help?</h2>
                      <p>Our support team is here for you.</p>
                    </div>
                  </div>

                  <div className="help-details">
                    <p>
                      <Icon name="phone" size={15} />
                      +92 42 111 345 678
                    </p>

                    <p>
                      <Icon name="mail" size={15} />
                      support@smartcity.gov
                    </p>
                  </div>

                  <div className="help-buttons">
                    <button className="contact-button">
                      Contact Us
                    </button>

                    <button className="faq-button">
                      FAQs
                    </button>
                  </div>
                </section>
              </div>
            </div>

            {/* RIGHT */}
            <aside className="recent-updates dashboard-card">
              <div className="card-header">
                <div>
                  <h2>Recent Updates</h2>
                  <p>Latest city announcements</p>
                </div>

                <button className="view-all">
                  View All <Icon name="arrow" size={15} />
                </button>
              </div>

              <div className="updates-list">
                {updates.map((update, index) => (
                  <div className="update-item" key={index}>
                    <div className={`update-icon ${update.type}`}>
                      {update.icon}
                    </div>

                    <div className="update-content">
                      <h3>{update.title}</h3>
                      <span>{update.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CitizenPortal