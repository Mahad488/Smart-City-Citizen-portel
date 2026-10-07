import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import smartCityMark from '../assets/smart-city-mark.svg'

const navigationItems = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Services', to: '/services' },
  { label: 'Updates', to: '/updates' },
  { label: 'Track Complaint', to: '/track-complaint' },
  { label: 'Contact', to: '/contact' },
]

export default function HomeNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const close = () => setIsMenuOpen(false)

  return (
    <header className={`home-navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="home-container nav-inner">
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          aria-controls="home-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>

        <Link to="/" className="home-brand" onClick={close}>
          <img
            src={smartCityMark}
            className="brand-icon"
            alt="Smart City"
          />
          <div>
            <strong>Smart City</strong>
            <span>Citizen Portal</span>
          </div>
        </Link>

        <nav
          className={`home-nav${isMenuOpen ? ' is-open' : ''}`}
          id="home-navigation"
          aria-label="Main navigation"
        >
          {navigationItems.map(({ label, to }) => (
            <Link key={to} to={to} onClick={close}>
              {label}
            </Link>
          ))}
        </nav>

        <Link
          to="/citizen-login"
          className="home-login-btn"
          onClick={close}
          aria-label="Go to Citizen Login"
        >
          Citizen Login
        </Link>
      </div>
    </header>
  )
}
