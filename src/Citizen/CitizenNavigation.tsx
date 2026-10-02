import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  FileWarning,
  LayoutGrid,
  LogOut,
  MessageSquareWarning,
  Search,
  Siren,
  UserRound,
} from 'lucide-react'
import smartCityMark from '../assets/smart-city-mark.svg'
import { useUnreadNotificationCount } from './notificationStore'

const navigationItems = [
  { label: 'Dashboard', Icon: LayoutGrid },
  { label: 'New Complaint', Icon: FileWarning },
  { label: 'My Complaints', Icon: MessageSquareWarning },
  { label: 'Emergency', Icon: Siren },
  { label: 'Notifications', Icon: Bell },
  { label: 'My Profile', Icon: UserRound },
]

type CitizenSidebarProps = {
  activeItem: string
  onNavigate: (label: string) => void
  notificationCount?: number
}

export function CitizenSidebar({
  activeItem,
  onNavigate,
  notificationCount,
}: CitizenSidebarProps) {
  const navigate = useNavigate()
  const storedUnreadCount = useUnreadNotificationCount()
  const visibleNotificationCount = notificationCount ?? storedUnreadCount

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <img className="brand-logo" src={smartCityMark} alt="Smart City logo" />

        <div>
          <h2>Smart City</h2>
          <p>Citizen Portal</p>
        </div>
      </div>

      <nav className="sidebar-navigation">
        {navigationItems.map(({ label, Icon }) => (
          <button
            key={label}
            type="button"
            className={`sidebar-item ${activeItem === label ? 'active' : ''}`}
            onClick={() => {
              if (label === 'My Profile') {
                if (activeItem !== label) {
                  navigate('/citizen-profile')
                }
                return
              }

              onNavigate(label)
            }}
          >
            <span className="portal-icon">
              <Icon size={22} strokeWidth={2} />
            </span>
            <span>{label}</span>

            {label === 'Notifications' && visibleNotificationCount > 0 && (
              <span className="notification-count">{visibleNotificationCount}</span>
            )}
          </button>
        ))}

        <button
          type="button"
          className="sidebar-item logout-item"
          onClick={() => onNavigate('Logout')}
        >
          <span className="portal-icon">
            <LogOut size={22} strokeWidth={2} />
          </span>
          <span>Logout</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="online-dot"></div>
        <div>
          <strong>Portal Online</strong>
          <span>Services available</span>
        </div>
      </div>
    </aside>
  )
}

type CitizenNavbarProps = {
  citizenName?: string
  profileImage?: string | null
  searchValue?: string
  onSearchChange?: (value: string) => void
}

function getStoredProfileImage() {
  try {
    const savedCitizen = localStorage.getItem('citizen')
    const citizen = savedCitizen ? JSON.parse(savedCitizen) : null
    const citizenId = citizen?.citizen_id || 'current'

    return localStorage.getItem(`citizen-profile-image-${citizenId}`)
  } catch {
    return null
  }
}

export function CitizenNavbar({
  citizenName = 'Citizen',
  profileImage,
  searchValue,
  onSearchChange,
}: CitizenNavbarProps) {
  const navigate = useNavigate()
  const unreadNotificationCount = useUnreadNotificationCount()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [localSearch, setLocalSearch] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [storedProfileImage] = useState(getStoredProfileImage)
  const avatarImage = profileImage !== undefined ? profileImage : storedProfileImage
  const currentSearch = searchValue ?? localSearch

  useEffect(() => {
    if (!isUserMenuOpen) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isUserMenuOpen])

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(event.target.value)
      return
    }

    setLocalSearch(event.target.value)
  }

  const handleLogout = () => {
    localStorage.removeItem('citizen')
    setIsUserMenuOpen(false)
    navigate('/citizen-login')
  }

  return (
    <header className="dashboard-topbar">
      <div className="mobile-brand">
        <img src={smartCityMark} alt="" />
        <strong>Smart City</strong>
      </div>

      <div className="dashboard-search">
        <Search size={17} />
        <input
          type="text"
          placeholder="Search here..."
          value={currentSearch}
          onChange={handleSearchChange}
        />
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-notification"
          aria-label="Notifications"
          onClick={() => navigate('/citizen-notifications')}
        >
          <Bell size={18} />
          {unreadNotificationCount > 0 && (
            <span aria-label={`${unreadNotificationCount} unread notifications`} />
          )}
        </button>

        <div className="user-menu" ref={userMenuRef}>
          <button
            type="button"
            className="user-menu-trigger"
            aria-label={`Account menu for ${citizenName}`}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            onClick={() => setIsUserMenuOpen((open) => !open)}
          >
            <span className="user-avatar">
              {avatarImage ? (
                <img src={avatarImage} alt="" />
              ) : (
                citizenName.charAt(0) || 'C'
              )}
            </span>

            <span className="user-info">
              <strong>{citizenName}</strong>
              <span>Citizen</span>
            </span>

            <ChevronDown
              className={`dropdown-arrow ${isUserMenuOpen ? 'open' : ''}`}
              size={15}
            />
          </button>

          {isUserMenuOpen && (
            <div className="user-menu-dropdown" role="menu" aria-label="Account options">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  navigate('/citizen-profile')
                }}
              >
                <UserRound size={16} />
                My Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}