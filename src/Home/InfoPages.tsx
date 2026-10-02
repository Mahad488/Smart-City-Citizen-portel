import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import smartCityMark from '../assets/smart-city-mark.svg'

const serviceDetails = [
  {
    title: 'Complaint Management',
    text: 'Report issues like road damage, illegal dumping, broken street lights, water shortages and public safety concerns.',
    icon: '🛠️',
  },
  {
    title: 'Sanitation & Waste',
    text: 'Track collection schedules, disposal issues and neighborhood cleanliness updates across every sector.',
    icon: '🗑️',
  },
  {
    title: 'Transport & Mobility',
    text: 'Monitor road conditions, traffic concerns and civic mobility updates that affect daily commutes.',
    icon: '🚦',
  },
  {
    title: 'Public Safety',
    text: 'Access emergency updates, alert information and service coordination for urgent city incidents.',
    icon: '🛡️',
  },
  {
    title: 'Utilities',
    text: 'Stay updated on water supply schedules, power concerns and municipal utility service issues.',
    icon: '💧',
  },
  {
    title: 'Community Insights',
    text: 'Review city updates, service announcements and public notices to stay connected with local developments.',
    icon: '🏙️',
  },
]

const updateFeed = [
  {
    title: 'Smart lighting upgrade in Zone B',
    date: '12 Oct 2026',
    description: 'New energy-efficient lights are being installed on key roads to improve roadside safety after sunset.',
  },
  {
    title: 'Water supply maintenance scheduled',
    date: '10 Oct 2026',
    description: 'The public works department will perform water pipeline checks in East and North sectors from 9 AM to 1 PM.',
  },
  {
    title: 'Road repair work completed',
    date: '08 Oct 2026',
    description: 'Traffic flow has improved on the Central Avenue route after the completion of pothole repair work.',
  },
  {
    title: 'Tree plantation campaign launched',
    date: '06 Oct 2026',
    description: 'Residents are encouraged to participate in the city clean-green drive focused on public parks and school zones.',
  },
]

function InfoLayout({
  title,
  intro,
  badge,
  children,
}: {
  title: string
  intro: string
  badge: string
  children: ReactNode
}) {
  return (
    <div className="smart-home info-page-shell">
      <header className="home-navbar">
        <div className="home-container nav-inner">
          <Link to="/" className="home-brand">
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

          <nav className="home-nav">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/services">Services</Link>
            <Link to="/updates">Updates</Link>
            <Link to="/track-complaint">Track Complaint</Link>
            <Link to="/contact">Contact</Link>
          </nav>

          <Link to="/citizen-login" className="home-login-btn">
            Login
          </Link>
        </div>
      </header>

      <main className="info-page">
        <div className="home-container">
          <div className="info-hero">
            <span className="section-label">{badge}</span>
            <h1>{title}</h1>
            <p>{intro}</p>
          </div>

          {children}
        </div>
      </main>

      <footer className="home-footer info-footer">
        <div className="home-container footer-content">
          <div>
            <div className="footer-brand">
              <img src={smartCityMark} className="brand-icon" alt="Smart City" />
              <div>
                <strong>Smart City</strong>
                <span>Citizen Portal</span>
              </div>
            </div>
            <p>Together for a smarter tomorrow.</p>
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

export function AboutPage() {
  return (
    <InfoLayout
      badge="ABOUT THE PLATFORM"
      title="A digital bridge between citizens and city services"
      intro="The Smart City Citizen Portal helps residents report issues, access public services, and stay informed about local progress in a fast and transparent way."
    >
      <div className="info-grid two-col">
        <div className="info-card lg-card">
          <h3>Our mission</h3>
          <p>
            We are building a responsive and citizen-first digital ecosystem that makes governance more transparent,
            efficient and easier to participate in. Every complaint submitted through this portal becomes part of a smarter,
            more accountable city system.
          </p>
        </div>

        <div className="info-card accent-card">
          <h3>Why it matters</h3>
          <ul className="check-list">
            <li>Faster complaint resolution for residents.</li>
            <li>Better communication between citizens and departments.</li>
            <li>Improved trust and accountability across services.</li>
            <li>Cleaner and safer neighborhoods through shared action.</li>
          </ul>
        </div>
      </div>

      <div className="info-grid three-col">
        <div className="info-card">
          <span className="info-icon">📣</span>
          <h3>Citizen-first</h3>
          <p>Residents can report problems from anywhere and follow their request without repeated calls or confusion.</p>
        </div>

        <div className="info-card">
          <span className="info-icon">📊</span>
          <h3>Transparent</h3>
          <p>Every status update helps people understand what is happening and what step is next.</p>
        </div>

        <div className="info-card">
          <span className="info-icon">🌱</span>
          <h3>Impact-driven</h3>
          <p>The platform strengthens services that improve quality of life, sustainability and public trust.</p>
        </div>
      </div>
    </InfoLayout>
  )
}

export function ServicesPage() {
  return (
    <InfoLayout
      badge="SERVICES"
      title="City services built around everyday citizen needs"
      intro="This portal is designed to support the services that matter most to public life, from reporting issues to receiving city updates and staying informed."
    >
      <div className="info-grid three-col">
        {serviceDetails.map((service) => (
          <div className="info-card service-card" key={service.title}>
            <span className="info-icon">{service.icon}</span>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
          </div>
        ))}
      </div>
    </InfoLayout>
  )
}

export function UpdatesPage() {
  return (
    <InfoLayout
      badge="LATEST UPDATES"
      title="City news, service notices and operational improvements"
      intro="Residents can stay connected to the latest operational updates, infrastructure work and community notices from the Smart City program."
    >
      <div className="updates-list">
        {updateFeed.map((item) => (
          <article className="update-item-card" key={item.title}>
            <div className="update-date">{item.date}</div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </InfoLayout>
  )
}

export function TrackComplaintPage() {
  return (
    <InfoLayout
      badge="TRACK COMPLAINT"
      title="Check the progress of your complaint request"
      intro="Use the complaint tracking system to monitor the current stage of your issue and understand what action has been taken."
    >
      <div className="info-grid two-col">
        <div className="info-card lg-card">
          <h3>How tracking works</h3>
          <ol className="number-list">
            <li>Submit your complaint with category, location and description.</li>
            <li>Receive a complaint ID and check it in the portal.</li>
            <li>Review updates as the department resolves the issue.</li>
            <li>See the final outcome once the task is completed.</li>
          </ol>
        </div>

        <div className="info-card accent-card">
          <h3>Example complaint IDs</h3>
          <div className="complaint-samples">
            <span>SC-00123</span>
            <span>SC-00476</span>
            <span>SC-00911</span>
          </div>
          <p>
            Enter your valid complaint ID in the complaint tracking section to view the latest progress for your request.
          </p>
          <Link to="/citizen-login" className="primary-button inline-action">Open Complaint Portal</Link>
        </div>
      </div>
    </InfoLayout>
  )
}

export function ContactPage() {
  return (
    <InfoLayout
      badge="CONTACT"
      title="Need support or help with a service request?"
      intro="We are here to help residents with questions about public services, complaints and city support channels."
    >
      <div className="info-grid three-col">
        <div className="info-card">
          <span className="info-icon">📞</span>
          <h3>Helpline</h3>
          <p>+92 42 111 123 456</p>
        </div>

        <div className="info-card">
          <span className="info-icon">✉️</span>
          <h3>Email</h3>
          <p>support@smartcity.gov</p>
        </div>

        <div className="info-card">
          <span className="info-icon">🕒</span>
          <h3>Working hours</h3>
          <p>Monday to Saturday: 9:00 AM to 6:00 PM</p>
        </div>
      </div>

      <div className="info-card contact-full-card">
        <h3>Citizen support office</h3>
        <p>
          Smart City Citizen Support Center, Civic Plaza, Government District, Lahore, Pakistan.
        </p>
        <Link to="/citizen-login" className="primary-button inline-action">Go to portal</Link>
      </div>
    </InfoLayout>
  )
}
