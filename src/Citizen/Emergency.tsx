import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Clock3,
  MapPin,
  Siren,
  X,
} from "lucide-react";
import {
  getCitizenEmergencies,
  submitEmergency,
  type EmergencyRecord,
} from "../api";
import { reverseGeocodeCoordinates } from "../location";
import { CitizenNavbar, CitizenSidebar } from "./CitizenNavigation";
import "./Citizenportal.css";
import "./Emergency.css";

type EmergencyRequest = {
  id: string;
  type: string;
  location: string;
  description: string;
  status: string;
  date: string;
};

function toEmergencyRequest(record: EmergencyRecord): EmergencyRequest {
  const rawDate = record.created_at ? new Date(record.created_at) : null;
  const date =
    rawDate && !Number.isNaN(rawDate.getTime())
      ? rawDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Date unavailable";

  return {
    id: `EM-${String(record.id).replace(/^EM-/i, "").padStart(4, "0")}`,
    type: record.type,
    location: record.location,
    description: record.description || "Details not available.",
    status: record.status === "Active" ? "Reporting" : record.status,
    date,
  };
}

const Emergency: React.FC = () => {
  const navigate = useNavigate();
  const [citizen] = useState(() => {
    try {
      const saved = localStorage.getItem("citizen");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [emergencyType, setEmergencyType] = useState("");
  const [location, setLocation] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [trackingEmergency, setTrackingEmergency] =
    useState<EmergencyRequest | null>(null);
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);

  useEffect(() => {
    const citizenId = citizen?.citizen_id;
    if (typeof citizenId !== "string" || !citizenId) {
      setHistoryError("Your citizen account could not be identified. Please log in again.");
      setHistoryLoading(false);
      return;
    }

    let isCurrent = true;
    getCitizenEmergencies(citizenId)
      .then((records) => {
        if (isCurrent) {
          setEmergencies(records.map(toEmergencyRequest));
          setHistoryError("");
        }
      })
      .catch((error: unknown) => {
        console.error("LOAD EMERGENCIES ERROR:", error);
        if (isCurrent) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : "Unable to load your emergency requests.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) {
          setHistoryLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [citizen?.citizen_id]);

  const useMyLocation = () => {
    setLocationError("");

    if (!window.isSecureContext) {
      setLocationError("Location access requires HTTPS or localhost.");
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const coordinates = `Lat ${coords.latitude.toFixed(6)}, Lng ${coords.longitude.toFixed(6)}`;

        try {
          setLocation(
            await reverseGeocodeCoordinates(coords.latitude, coords.longitude),
          );
        } catch (error) {
          console.error("EMERGENCY LOCATION LOOKUP ERROR:", error);
          setLocation(coordinates);
          setLocationError(
            "We couldn't find a street address, so your coordinates were added instead.",
          );
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Allow location access in your browser to use your current location."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Your device could not determine a location. Turn on Location Services and try again."
              : "Location request timed out. Check Location Services and try again.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
    );
  };

  const handleNavigation = (label: string) => {
    if (label === "Emergency") return;

    if (label === "Logout") {
      localStorage.removeItem("citizen");
      localStorage.removeItem("citizen_token");
      navigate("/citizen-login");
      return;
    }

    if (label === "My Complaints") {
      navigate("/citizen-my-complaints");
      return;
    }

    if (label === "New Complaint") {
      navigate("/citizen-new-complaint");
      return;
    }

    if (label === "Notifications") {
      navigate("/citizen-notifications");
      return;
    }

    navigate("/citizen-portal");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!emergencyType || !location || !description || !phone) {
      setSubmissionError("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    setSubmissionError("");
    setSubmissionMessage("");

    try {
      const result = await submitEmergency({
        type: emergencyType,
        location,
        team: "Emergency Response Team",
        priority: "High",
        status: "Active",
      });
      const newEmergency = toEmergencyRequest({
        id: result.id,
        type: emergencyType,
        location,
        status: "Active",
        created_at: new Date().toISOString(),
        description,
      });

      setEmergencies((current) => [newEmergency, ...current]);
      setSubmissionMessage(`Emergency request ${newEmergency.id} was sent to the response team.`);
      setEmergencyType("");
      setLocation("");
      setDescription("");
      setPhone("");
    } catch (error) {
      console.error("SUBMIT EMERGENCY ERROR:", error);
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Unable to submit the emergency request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="citizen-dashboard">
      <CitizenSidebar
        activeItem="Emergency"
        onNavigate={handleNavigation}
      />

      <main className="dashboard-main">
        <CitizenNavbar citizenName={citizen?.name || "Citizen"} />

        <div className="emergency-page">

      {/* ================= MAIN CONTENT ================= */}

      <div className="emergency-content">

        {/* Page Header */}
        <div className="emergency-header">
          <div>
            <h1>Emergency Services</h1>
            <p>
              Report an emergency and get immediate assistance from the
              Smart City response team.
            </p>
          </div>

          <div className="emergency-status">
            <span className="status-dot"></span>
            Emergency Services Online
          </div>
        </div>

        {/* Warning Banner */}
        <div className="emergency-warning">
          <div className="warning-icon"><AlertTriangle size={22} aria-hidden="true" /></div>

          <div>
            <h3>For life-threatening emergencies</h3>
            <p>
              If someone is in immediate danger, please contact your local
              emergency service directly. You can also submit an emergency
              request through this portal.
            </p>
          </div>
        </div>

        {/* ================= FORM ================= */}

        <section className="emergency-card">

          <div className="card-heading">
            <div className="heading-icon"><Siren size={24} aria-hidden="true" /></div>

            <div>
              <h2>Report an Emergency</h2>
              <p>
                Provide the details below so our response team can assist you.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              {/* Emergency Type */}
              <div className="form-group">
                <label>
                  Emergency Type <span>*</span>
                </label>

                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                >
                  <option value="">Select emergency type</option>
                  <option value="Accident">Accident</option>
                  <option value="Fire">Fire</option>
                  <option value="Medical">Medical Emergency</option>
                  <option value="Crime">Crime / Security</option>
                  <option value="Flood">Flood</option>
                  <option value="Gas Leak">Gas Leak</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Phone */}
              <div className="form-group">
                <label>
                  Contact Number <span>*</span>
                </label>

                <input
                  type="tel"
                  placeholder="03XX XXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Location */}
              <div className="form-group full-width">
                <label>
                  Emergency Location <span>*</span>
                </label>

                <div className="location-input">
                  <MapPin size={17} aria-hidden="true" />

                  <input
                    type="text"
                    placeholder="Enter emergency location"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setLocationError("");
                    }}
                  />

                  <button
                    type="button"
                    className="location-button"
                    onClick={useMyLocation}
                    disabled={locating}
                  >
                    {locating ? "Finding location..." : "Use My Location"}
                  </button>
                </div>

                {locationError && (
                  <small className="location-error" role="alert">
                    {locationError}
                  </small>
                )}
              </div>

              {/* Description */}
              <div className="form-group full-width">
                <label>
                  Emergency Description <span>*</span>
                </label>

                <textarea
                  rows={5}
                  placeholder="Describe what happened and any important details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

            </div>

            {/* Form Footer */}
            <div className="form-footer">

              <div className="response-info">
                <Clock3 size={18} aria-hidden="true" />
                <div>
                  <strong>Quick Response</strong>
                  <p>
                    Your emergency request will be forwarded to the
                    appropriate response team.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="submit-emergency"
                disabled={submitting}
              >
                <Siren size={17} aria-hidden="true" />
                {submitting ? "Sending..." : "Submit Emergency"}
              </button>

            </div>

            {submissionError && (
              <p className="emergency-form-message error" role="alert">
                {submissionError}
              </p>
            )}
            {submissionMessage && (
              <p className="emergency-form-message success" role="status">
                {submissionMessage}
              </p>
            )}
          </form>
        </section>

        {/* ================= EMERGENCY HISTORY ================= */}

        <section className="history-card">

          <div className="history-header">
            <div>
              <h2>My Emergency Requests</h2>
              <p>Track your previously reported emergencies.</p>
            </div>

            <div className="record-count">
              {emergencies.length} Records
            </div>
          </div>

          <div className="emergency-list">

            {historyLoading ? (
              <div className="empty-emergency">
                <p>Loading your emergency requests...</p>
              </div>
            ) : historyError ? (
              <div className="empty-emergency" role="alert">
                <h3>Unable to load emergency requests</h3>
                <p>{historyError}</p>
              </div>
            ) : emergencies.length === 0 ? (
              <div className="empty-emergency">
                <div><Siren size={24} aria-hidden="true" /></div>
                <h3>No Emergency Requests</h3>
                <p>You have not reported any emergencies yet.</p>
              </div>
            ) : (
              emergencies.map((emergency) => (
                <div className="emergency-row" key={emergency.id}>

                  <div className="emergency-id">
                    <strong>{emergency.id}</strong>
                    <span>{emergency.date}</span>
                  </div>

                  <div className="emergency-info">
                    <h3>{emergency.type}</h3>
                    <p>{emergency.description}</p>
                  </div>

                  <div className="emergency-location">
                    <MapPin size={15} aria-hidden="true" />
                    {emergency.location}
                  </div>

                  <div>
                    <span
                      className={`emergency-badge ${emergency.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {emergency.status}
                    </span>
                  </div>

                  <button
                    className="track-emergency"
                    onClick={() => setTrackingEmergency(emergency)}
                  >
                    Track
                  </button>

                </div>
              ))
            )}

          </div>

        </section>

      </div>
        {trackingEmergency && (
          <div
            className="emergency-track-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setTrackingEmergency(null);
              }
            }}
          >
            <section
              className="emergency-track-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="emergency-track-title"
            >
              <button
                type="button"
                className="emergency-track-close"
                aria-label="Close emergency tracking"
                onClick={() => setTrackingEmergency(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>

              <div className="emergency-track-heading">
                <div>
                  <span>EMERGENCY REQUEST</span>
                  <h2 id="emergency-track-title">{trackingEmergency.id}</h2>
                </div>
                <span
                  className={`emergency-badge ${trackingEmergency.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {trackingEmergency.status}
                </span>
              </div>

              <div className="emergency-track-details">
                <div>
                  <span>Type</span>
                  <strong>{trackingEmergency.type}</strong>
                </div>
                <div>
                  <span>Location</span>
                  <strong>{trackingEmergency.location}</strong>
                </div>
                <div>
                  <span>Reported</span>
                  <strong>{trackingEmergency.date}</strong>
                </div>
                <div>
                  <span>Details</span>
                  <strong>{trackingEmergency.description}</strong>
                </div>
              </div>

              <div className="emergency-track-progress">
                <h3>Response progress</h3>
                {(["Reporting", "Responding", "Resolved"] as const).map(
                  (status, index) => {
                    const currentIndex =
                      trackingEmergency.status === "Resolved"
                        ? 2
                        : trackingEmergency.status === "Responding"
                          ? 1
                          : 0;
                    const isComplete = index <= currentIndex;

                    return (
                      <div
                        className={`emergency-track-step ${isComplete ? "complete" : ""}`}
                        key={status}
                      >
                        <span>{isComplete ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
                        <strong>{status}</strong>
                      </div>
                    );
                  },
                )}
              </div>
            </section>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default Emergency;