import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import smartCityMark from '../assets/smart-city-mark.svg'
import './Home.css'

function Home() {
  const navigate = useNavigate()
  const [complaintId, setComplaintId] = useState('')
  const [trackingError, setTrackingError] = useState('')

  const handleTrackComplaint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedId = complaintId.trim().replace(/^SC-/i, '')

    if (!/^\d+$/.test(normalizedId)) {
      setTrackingError('Enter a valid complaint ID, such as SC-00123.')
      return
    }

    navigate(`/citizen-portal/complaint/${normalizedId}`)
  }

  return (
    <div className="smart-home">

      {/* NAVBAR */}
      <header className="home-navbar">
        <div className="home-container nav-inner">

          <a href="/" className="home-brand">
            <img className="brand-icon" src={smartCityMark} alt="Smart City logo" />

            <div>
              <strong>Smart City</strong>
              <span>Citizen Portal</span>
            </div>
          </a>

          <nav className="home-nav">
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#complaints">Complaints</a>
            <a href="#track">Track Complaint</a>
            <a href="#updates">Updates</a>
            <a href="#contact">Contact</a>
          </nav>

          <a
            href="/citizen-login"
            className="home-login-btn"
          >
            Login
          </a>

        </div>
      </header>


      {/* HERO */}
      <section className="home-hero" id="home">

        <div className="home-container hero-inner">

          <div className="hero-content">

            <div className="hero-small-title">
              WELCOME TO SMART CITY CITIZEN PORTAL
            </div>

            <h1>
              Your City,
              <span>Your Voice</span>
            </h1>

            <p>
              Report civic issues, track complaints, and stay connected
              with your Smart City. Together we build a cleaner, safer
              and better tomorrow.
            </p>

            <div className="hero-buttons">

              <a
                href="/citizen-login"
                className="primary-button"
              >
                Submit a Complaint
              </a>

              <a
                href="#track"
                className="secondary-button"
              >
                Track Complaint
              </a>

            </div>

          </div>


          {/* HERO FLOATING CARDS */}
          <div className="hero-cards">

            <div className="hero-floating-card card-one">
              <span>🌿</span>
              <div>
                <strong>Clean City</strong>
                <small>Better Environment</small>
              </div>
            </div>

            <div className="hero-floating-card card-two">
              <span>🛡️</span>
              <div>
                <strong>Safe Community</strong>
                <small>Connected Citizens</small>
              </div>
            </div>

            <div className="hero-floating-card card-three">
              <span>🏙️</span>
              <div>
                <strong>Smart Infrastructure</strong>
                <small>Modern City Services</small>
              </div>
            </div>

          </div>

        </div>

      </section>


      {/* ABOUT */}
      <section className="home-section" id="about">

        <div className="home-container about-layout">

          <div className="about-text">

            <span className="section-label">
              ABOUT OUR SMART CITY
            </span>

            <h2>
              A digital bridge between citizens and city services.
            </h2>

            <p>
              The Smart City Citizen Portal connects citizens with
              city departments to report issues, track complaints
              and access essential services through one simple platform.
            </p>

            <p>
              Citizens can submit complaints, follow their progress,
              receive notifications and stay informed about important
              city updates.
            </p>

            <a href="#services" className="outline-button">
              Learn More →
            </a>

          </div>


          <div className="feature-grid">

            <div className="feature-card">
              <div className="feature-icon blue">🏢</div>
              <h3>Smart Infrastructure</h3>
              <p>
                Better roads, modern transport and smart facilities
                for a connected city.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon green">🌱</div>
              <h3>Public Services</h3>
              <p>
                Clean water, waste management, parks and other
                essential city services.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon orange">💬</div>
              <h3>Citizen Complaints</h3>
              <p>
                Report issues and track their resolution through
                your citizen account.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon purple">📊</div>
              <h3>Transparent Monitoring</h3>
              <p>
                Track progress, receive updates and improve
                accountability.
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* HOW IT WORKS */}
      <section className="home-section light-section">

        <div className="home-container">

          <div className="center-heading">
            <span className="section-label">
              HOW IT WORKS
            </span>

            <h2>
              From report to resolution.
            </h2>

            <p>
              Reporting a civic issue is simple. Follow the progress
              from submission to resolution.
            </p>
          </div>


          <div className="process-grid">

            <div className="process-card">
              <div className="process-number">1</div>
              <h3>Report Issue</h3>
              <p>
                Submit your complaint with details, location
                and a photo if available.
              </p>
            </div>

            <div className="process-card">
              <div className="process-number">2</div>
              <h3>Complaint Verified</h3>
              <p>
                The city team reviews and verifies the submitted issue.
              </p>
            </div>

            <div className="process-card">
              <div className="process-number">3</div>
              <h3>Department Assigned</h3>
              <p>
                Your complaint is assigned to the relevant department.
              </p>
            </div>

            <div className="process-card">
              <div className="process-number">4</div>
              <h3>Issue Resolved</h3>
              <p>
                You receive an update when the issue has been resolved.
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* COMPLAINT CATEGORIES */}
      <section className="home-section" id="services">

        <div className="home-container" id="complaints">

          <div className="center-heading">
            <span className="section-label">
              CITIZEN SERVICES
            </span>

            <h2>
              Report the issues that matter.
            </h2>

            <p>
              Choose the category that best matches your civic issue.
            </p>
          </div>


          <div className="category-grid">

            <div className="category-card">
              <span>🚦</span>
              <strong>Traffic & Signals</strong>
            </div>

            <div className="category-card">
              <span>💡</span>
              <strong>Street Lights</strong>
            </div>

            <div className="category-card">
              <span>🗑️</span>
              <strong>Waste Management</strong>
            </div>

            <div className="category-card">
              <span>💧</span>
              <strong>Water & Drainage</strong>
            </div>

            <div className="category-card">
              <span>🛣️</span>
              <strong>Roads & Infrastructure</strong>
            </div>

            <div className="category-card">
              <span>🌳</span>
              <strong>Parks & Environment</strong>
            </div>

            <div className="category-card">
              <span>🎓</span>
              <strong>Education Facilities</strong>
            </div>

            <div className="category-card">
              <span>🏥</span>
              <strong>Public Health</strong>
            </div>

          </div>

        </div>

      </section>


      {/* TRACK COMPLAINT */}
      <section
        className="home-section light-section"
        id="track"
      >

        <div className="home-container">

          <div className="tracking-box">

            <div className="tracking-header">

              <span className="section-label">
                COMPLAINT TRACKING
              </span>

              <h2>
                Track Your Complaint
              </h2>

              <p>
                Enter your complaint ID to check its current status.
              </p>

            </div>


            <form className="tracking-form" onSubmit={handleTrackComplaint}>
              <input
                type="text"
                aria-label="Complaint ID"
                placeholder="e.g. SC-00123"
                value={complaintId}
                onChange={(event) => {
                  setComplaintId(event.target.value)
                  setTrackingError('')
                }}
                required
              />

              <button type="submit">
                Track
              </button>
            </form>

            {trackingError ? (
              <p className="tracking-error-message" role="alert">
                {trackingError}
              </p>
            ) : (
              <p className="tracking-hint">
                Find your complaint ID in the My Complaints section of your dashboard.
              </p>
            )}

          </div>

        </div>

      </section>


      {/* STATS */}
      <section className="home-section">

        <div className="home-container">

          <div className="center-heading">
            <span className="section-label">
              CITY IMPACT
            </span>

            <h2>
              Connected services, measurable progress.
            </h2>
          </div>


          <div className="stats-grid">

            <div className="stat-card">
              <strong>24,850+</strong>
              <span>Complaints Received</span>
            </div>

            <div className="stat-card">
              <strong>19,420+</strong>
              <span>Issues Resolved</span>
            </div>

            <div className="stat-card">
              <strong>87%</strong>
              <span>Resolution Rate</span>
            </div>

            <div className="stat-card">
              <strong>32</strong>
              <span>Connected Departments</span>
            </div>

          </div>

        </div>

      </section>


      {/* CONTACT */}
      <section
        className="contact-section"
        id="contact"
      >

        <div className="home-container contact-inner">

          <div>
            <span className="section-label">
              NEED HELP?
            </span>

            <h2>
              We're here to help.
            </h2>

            <p>
              Need assistance with a complaint or citizen service?
              Contact the Smart City support team.
            </p>
          </div>

          <div className="contact-details">
            <div>
              <strong>Citizen Helpline</strong>
              <span>+92 42 111 123 456</span>
            </div>

            <div>
              <strong>Email</strong>
              <span>support@smartcity.gov</span>
            </div>

            <a
              href="/citizen-login"
              className="primary-button"
            >
              Go to Citizen Portal
            </a>
          </div>

        </div>

      </section>


      {/* FOOTER */}
      <footer className="home-footer">

        <div className="home-container footer-grid">

          <div>
            <div className="footer-brand">
              <img className="brand-icon" src={smartCityMark} alt="Smart City logo" />
              <div>
                <strong>Smart City</strong>
                <span>Citizen Portal</span>
              </div>
            </div>

            <p>
              Together for a smarter tomorrow.
            </p>
          </div>

          <div>
            <h4>Quick Links</h4>
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#complaints">Complaints</a>
          </div>

          <div>
            <h4>Citizen Portal</h4>
            <a href="/citizen-login">Login</a>
            <a href="/citizen-login">Register</a>
            <a href="#track">Track Complaint</a>
          </div>

          <div>
            <h4>Contact</h4>
            <a href="#contact">Citizen Helpline</a>
            <a href="#contact">Email Support</a>
            <a href="#contact">FAQs</a>
          </div>

        </div>

        <div className="footer-bottom">
          © 2026 Smart City Citizen Portal. All Rights Reserved.
        </div>

      </footer>

    </div>
  )
}

export default Home