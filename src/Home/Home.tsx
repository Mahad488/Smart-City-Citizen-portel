import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import smartCityMark from '../assets/smart-city-mark.svg'
import HomeNavbar from './HomeNavbar'
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

      <HomeNavbar />

      {/* HERO */}
      <section className="home-hero" id="home" aria-label="Hero">
        <div className="hero-overlay" />

        <div className="home-container hero-inner">

          <div className="hero-content">

            <div className="hero-small-title animate-fade-up">
              ● SMART CITY CITIZEN PORTAL
            </div>

            <h1 className="animate-fade-up delay-1">
              A smarter city starts
              <span>with citizen action</span>
            </h1>

            <p className="animate-fade-up delay-2">
              This platform brings together complaint reporting,
              service discovery, public updates and real-time
              transparency so residents can connect directly with
              the city and help improve everyday life.
            </p>

            <div className="hero-badges animate-fade-up delay-3" aria-label="Smart city benefits">
              <span>Public Services</span>
              <span>Live Updates</span>
              <span>Transparent Tracking</span>
            </div>

            <div className="hero-buttons animate-fade-up delay-4">
              <a
                href="/citizen-login"
                className="primary-button"
              >
                Report an Issue →
              </a>

              <Link
                to="/track-complaint"
                className="secondary-button"
              >
                Track Complaint
              </Link>
            </div>

          </div>


          {/* FLOATING CARDS */}
          <div className="hero-floating-cards animate-fade-right delay-3">

            <div className="floating-card">
              <span className="green-icon">🌿</span>
              <div>
                <strong>Clean City</strong>
                <small>Better Environment</small>
              </div>
            </div>

            <div className="floating-card">
              <span className="blue-icon">🛡️</span>
              <div>
                <strong>Safe Community</strong>
                <small>Connected Citizens</small>
              </div>
            </div>

            <div className="floating-card">
              <span className="purple-icon">🏙️</span>
              <div>
                <strong>Smart Infrastructure</strong>
                <small>Modern City Services</small>
              </div>
            </div>

          </div>

        </div>
      </section>

      <main id="main-content">


      {/* PROJECT OVERVIEW */}
      <section className="project-overview scroll-reveal" id="about">
        <div className="home-container overview-grid">
          <div className="overview-copy">
            <span className="section-label">WHY THIS PLATFORM MATTERS</span>
            <h2>Built to make city services clearer, faster and more responsive.</h2>
            <p>
              The Smart City Citizen Portal is designed to help residents
              report problems, understand city operations and stay updated on
              services that affect daily life. It creates a direct, digital link
              between the community and public departments.
            </p>

            <div className="overview-points">
              <OverviewPoint
                icon="📍"
                title="Issue Reporting"
                text="Citizens can raise complaints related to roads, sanitation, safety and public services in a simple, guided flow."
              />
              <OverviewPoint
                icon="📊"
                title="Progress Visibility"
                text="Each complaint can be tracked through different stages, helping users stay informed about action and resolution."
              />
              <OverviewPoint
                icon="🏙️"
                title="Smart City Access"
                text="Residents get quick access to city alerts, public notices and essential services through one clean portal."
              />
            </div>
          </div>

          <div className="overview-visual">
            <div className="visual-card main-visual">
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=85"
                alt="Smart city skyline"
                loading="lazy"
                width="1200"
                height="800"
              />
            </div>
            <div className="visual-card stat-visual">
              <span className="mini-label">City Performance</span>
              <strong>96%</strong>
              <small>Citizen service satisfaction</small>
            </div>
          </div>
        </div>
      </section>


      {/* SERVICES */}
      <section className="services-section scroll-reveal" id="services">

        <div className="home-container">

          <div className="section-heading">
            <span>OUR SERVICES</span>
            <h2>City Services at Your Fingertips</h2>
            <p>
              Access important city services and stay informed
              about what's happening around you.
            </p>
          </div>


          <div className="service-grid">

            <ServiceCard
              icon="🚨"
              title="Report an Issue"
              text="Report civic problems in your area."
              color="red"
            />

            <ServiceCard
              icon="🅿️"
              title="Smart Parking"
              text="Find available parking spaces."
              color="blue"
            />

            <ServiceCard
              icon="🗑️"
              title="Waste Collection"
              text="Track waste collection services."
              color="green"
            />

            <ServiceCard
              icon="🛡️"
              title="Public Safety"
              text="Get emergency information."
              color="purple"
            />

            <ServiceCard
              icon="🚌"
              title="Public Transport"
              text="Check routes and transport updates."
              color="orange"
            />

            <ServiceCard
              icon="🌱"
              title="Environment"
              text="Monitor air quality and green areas."
              color="teal"
            />

          </div>

        </div>
      </section>


      {/* HOW IT WORKS */}
      <section className="process-section scroll-reveal">
        <div className="home-container">
          <div className="section-heading centered-heading">
            <span>HOW IT WORKS</span>
            <h2>From report to resolution in three simple steps</h2>
          </div>

          <div className="process-grid">
            <ProcessStep
              number="01"
              title="Submit Request"
              text="A resident logs in and submits a complaint with category, location and description."
            />
            <ProcessStep
              number="02"
              title="Review & Assign"
              text="The city team receives the request and routes it to the right department for action."
            />
            <ProcessStep
              number="03"
              title="Track & Resolve"
              text="Citizens follow updates in real time until the issue is solved and closed."
            />
          </div>
        </div>
      </section>


      {/* CITY STATUS */}
      <section className="status-section scroll-reveal">

        <div className="home-container status-grid">

          <div>
            <strong>12,450+</strong>
            <span>Complaints Resolved</span>
          </div>

          <div>
            <strong>8,230+</strong>
            <span>Active Services</span>
          </div>

          <div>
            <strong>32+</strong>
            <span>City Departments</span>
          </div>

          <div>
            <strong>98%</strong>
            <span>Citizen Satisfaction</span>
          </div>

        </div>
      </section>


      {/* ABOUT */}
      <section className="about-section scroll-reveal" id="about-brief">

        <div className="home-container about-layout">

          <div className="about-image">

            <img
              src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1000&q=85"
              alt="Modern smart city"
              loading="lazy"
              width="1000"
              height="667"
            />

            <div className="image-caption">
              <strong>Building a Smarter Tomorrow</strong>
              <span>Connected • Green • Safe</span>
            </div>

          </div>


          <div className="about-content">

            <span className="section-label">
              ABOUT OUR SMART CITY
            </span>

            <h2>
              A digital bridge between citizens and city services.
            </h2>

            <p>
              The Smart City Citizen Portal connects citizens
              with city departments to report issues, track
              complaints and access essential services through
              one simple platform.
            </p>

            <ul>
              <li>✓ Submit complaints and follow their progress</li>
              <li>✓ Receive important city updates</li>
              <li>✓ Access essential city services</li>
              <li>✓ Stay connected with your community</li>
            </ul>

            <Link to="/services" className="outline-button">
              Explore Services →
            </Link>

          </div>

        </div>
      </section>


      {/* LIVE UPDATES */}
      <section className="updates-section scroll-reveal" id="updates">

        <div className="home-container updates-layout">

          <div className="section-heading">
            <span>REAL-TIME INFORMATION</span>
            <h2>Live City Updates</h2>
            <p>
              Stay informed about what's happening in your city.
            </p>
          </div>


          <div className="updates-card">

            <Update
              icon="🚛"
              title="Waste collection truck is now in Sector 7"
              time="10:12 AM"
              type="green"
            />

            <Update
              icon="🚦"
              title="Traffic congestion detected at Main Chowk"
              time="09:45 AM"
              type="red"
            />

            <Update
              icon="🅿️"
              title="Parking slot available at City Mall"
              time="09:32 AM"
              type="blue"
            />

            <Update
              icon="🌿"
              title="Air quality is good in all zones"
              time="08:21 AM"
              type="green"
            />

            <Update
              icon="🚨"
              title="Public safety: No active alerts"
              time="08:00 AM"
              type="purple"
            />

          </div>

        </div>
      </section>


      {/* TRACK COMPLAINT */}
      <section className="track-section" id="track">

        <div className="home-container">

          <div className="tracking-box">

            <div>
              <span className="section-label">
                COMPLAINT TRACKING
              </span>

              <h2>Track Your Complaint</h2>

              <p>
                Enter your complaint ID to check its current status.
              </p>
            </div>


            <form
              className="tracking-form"
              onSubmit={handleTrackComplaint}
            >

              <input
                type="text"
                placeholder="e.g. SC-00123"
                value={complaintId}
                onChange={(event) => {
                  setComplaintId(event.target.value)
                  setTrackingError('')
                }}
                required
              />

              <button type="submit">
                Track Complaint
              </button>

            </form>

            {trackingError && (
              <p className="tracking-error">
                {trackingError}
              </p>
            )}

          </div>

        </div>
      </section>


      {/* CONTACT */}
      <section className="contact-section" id="contact">

        <div className="home-container contact-layout">

          <div>
            <span className="section-label">
              NEED HELP?
            </span>

            <h2>We're here to help.</h2>

            <p>
              Need assistance with a complaint or citizen service?
              Contact the Smart City support team.
            </p>
          </div>

          <div className="contact-info">
            <strong>Citizen Helpline</strong>
            <span>+92 42 111 123 456</span>

            <strong>Email</strong>
            <span>support@smartcity.gov</span>

            <Link
              to="/citizen-login"
              className="primary-button"
            >
              Go to Citizen Portal
            </Link>
          </div>

        </div>
      </section>


      </main>

      {/* FOOTER */}
      <footer className="home-footer">

        <div className="home-container footer-content">

          <div>
            <div className="footer-brand">
              <img
                src={smartCityMark}
                className="brand-icon"
                alt="Smart City"
              />

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
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/services">Services</Link>
            <Link to="/updates">Updates</Link>
          </div>


          <div>
            <h4>Citizen Portal</h4>
            <Link to="/citizen-login">Login</Link>
            <Link to="/citizen-login">Register</Link>
            <Link to="/track-complaint">Track Complaint</Link>
          </div>


          <div>
            <h4>Contact</h4>
            <span>+92 42 111 123 456</span>
            <span>support@smartcity.gov</span>
          </div>

        </div>


        <div className="footer-bottom">
          © 2026 Smart City Citizen Portal. All Rights Reserved.
        </div>

      </footer>

    </div>
  )
}


/* SERVICE CARD */
function ServiceCard({
  icon,
  title,
  text,
  color,
}: {
  icon: string
  title: string
  text: string
  color: string
}) {
  return (
    <div className="service-card">

      <div className={`service-icon ${color}`}>
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>

      <Link to="/track-complaint">
        Explore →
      </Link>

    </div>
  )
}


/* LIVE UPDATE */
function Update({
  icon,
  title,
  time,
  type,
}: {
  icon: string
  title: string
  time: string
  type: string
}) {
  return (
    <div className="update-item">

      <div className={`update-icon ${type}`}>
        {icon}
      </div>

      <div>
        <strong>{title}</strong>
        <small>{time}</small>
      </div>

      <span className="update-live">
        ● Live
      </span>

    </div>
  )
}

function OverviewPoint({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) {
  return (
    <div className="overview-point">
      <span className="point-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
}

function ProcessStep({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <div className="process-step">
      <span className="process-number">{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

export default Home