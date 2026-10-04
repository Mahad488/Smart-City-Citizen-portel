import {
  useLayoutEffect,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Hand,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareWarning,
  Phone,
  Recycle,
  Search,
  Siren,
  Timer,
  UserRound,
  Wrench,
  Droplets,
} from 'lucide-react'
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
    Icon: Recycle,
    title: 'New waste collection schedule for all zones',
    date: '28 Sep 2026',
    type: 'green',
  },
  {
    Icon: Wrench,
    title: 'Road maintenance updates',
    date: '26 Sep 2026',
    type: 'purple',
  },
  {
    Icon: Droplets,
    title: 'Water supply notification',
    date: '25 Sep 2026',
    type: 'blue',
  },
  {
    Icon: Megaphone,
    title: 'Public holiday announcement',
    date: '20 Sep 2026',
    type: 'orange',
  },
]

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

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const savedCitizen = localStorage.getItem('citizen')

    if (savedCitizen) {
      try {
        setCitizen(JSON.parse(savedCitizen))
      } catch (error) {
        console.error('CACHED CITIZEN DISPLAY DATA ERROR:', error)
      }
    }

    loadComplaints()
  }, [])

  const loadComplaints = async () => {
    try {
      setComplaintsLoading(true)
      setComplaintsError('')

      const data = await getCitizenComplaints()

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
                Welcome, {citizen?.name || 'Citizen'} <Hand size={18} aria-hidden="true" />
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
                <MessageSquareWarning size={21} aria-hidden="true" />
              </div>

              <div>
                <span>Total Complaints</span>
                <strong>{totalComplaints}</strong>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">
                <ClipboardList size={22} aria-hidden="true" />
              </div>

              <div>
                <span>Pending</span>
                <strong>{pendingComplaints}</strong>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <Timer size={22} aria-hidden="true" />
              </div>

              <div>
                <span>In Progress</span>
                <strong>{inProgressComplaints}</strong>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">
                <CheckCircle2 size={22} aria-hidden="true" />
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
                    View All <ArrowRight size={15} aria-hidden="true" />
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
                        <MessageSquareWarning aria-hidden="true" />
                      </span>
                      <span>Submit<br />Complaint</span>
                    </button>

                    <button
                      onClick={() => handleMenu('Track Complaint')}
                    >
                      <span className="quick-icon purple-icon">
                        <Search aria-hidden="true" />
                      </span>
                      <span>Track<br />Complaint</span>
                    </button>

                    <button
                      onClick={() => handleMenu('Emergency')}
                    >
                      <span className="quick-icon red-icon">
                        <Siren aria-hidden="true" />
                      </span>
                      <span>Emergency</span>
                    </button>

                    <button
                      onClick={() => handleMenu('Notifications')}
                    >
                      <span className="quick-icon green-icon">
                        <FileText aria-hidden="true" />
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
                      <Phone size={15} aria-hidden="true" />
                      +92 42 111 345 678
                    </p>

                    <p>
                      <Mail size={15} aria-hidden="true" />
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
                  View All <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>

              <div className="updates-list">
                {updates.map((update, index) => (
                  <div className="update-item" key={index}>
                    <div className={`update-icon ${update.type}`}>
                      <update.Icon size={20} aria-hidden="true" />
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