import { useCallback, useEffect, useState, type FormEvent } from "react";
import ConfirmModal from "../components/ConfirmModal";
import "./Citizenportal.css";

interface Citizen {
  id?: number;
  citizen_id?: string;
  name: string;
  email: string;
  phone?: string;
  area?: string;
  status?: string;
}

interface CitizenNotification {
  id: number;
  title: string;
  message: string;
  type?: string;
  is_read?: boolean | number;
  created_at: string;
}

interface Complaint {
  id: number;
  title?: string;
  category?: string;
  description: string;
  location?: string;
  priority?: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
}

const formatComplaintDetails = (complaint: Complaint) => {
  const rawDescription = complaint.description ?? "";
  const legacyTitleMatch = rawDescription.match(
    /^Title:\s*([\s\S]*?)(?:\r?\n\r?\n|\n\n)/
  );

  const title =
    complaint.title?.trim() ||
    legacyTitleMatch?.[1]?.trim() ||
    "Untitled complaint";

  const description = complaint.title
    ? rawDescription.trim()
    : legacyTitleMatch
      ? rawDescription.replace(legacyTitleMatch[0], "").trim()
      : rawDescription.trim();

  return {
    title,
    description: description || "No description provided.",
  };
};

interface Emergency {
  id: number;
  type: string;
  location: string;
  team?: string;
  priority?: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
}

function CitizenPortal() {
  const [citizen] = useState<Citizen | null>(() => {
    try {
      const savedCitizen = localStorage.getItem("citizen");
      return savedCitizen ? JSON.parse(savedCitizen) : null;
    } catch {
      console.error("Invalid citizen data");
      return null;
    }
  });
  const citizenId = citizen?.citizen_id;

  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    title: "",
    description: "",
    category: "",
    area: "",
  });
  const [complaintMessage, setComplaintMessage] = useState("");
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({
    type: "",
    location: "",
  });
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState("");
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsMessage, setRecordsMessage] = useState("");

  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [editingEmergency, setEditingEmergency] = useState<Emergency | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "complaint" | "emergency"; id: number } | null
  >(null);
  const [pendingUpdate, setPendingUpdate] = useState<{
    type: "complaint" | "emergency";
    action: () => void;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMyRecords = useCallback(async () => {
    if (!citizenId) return;

    try {
      setRecordsLoading(true);
      setRecordsMessage("");

      const [complaintsResponse, emergenciesResponse] = await Promise.all([
        fetch(
          `https://smart-city-production-c48b.up.railway.app/api/complaints/citizen/${encodeURIComponent(
            citizenId
          )}`
        ),
        fetch(
          `https://smart-city-production-c48b.up.railway.app/api/emergency/citizen/${encodeURIComponent(
            citizenId
          )}`
        ),
      ]);

      const complaintsData = await complaintsResponse.json();
      const emergenciesData = await emergenciesResponse.json();

      if (!complaintsResponse.ok) {
        throw new Error(
          complaintsData.message || "Failed to load complaints."
        );
      }

      if (!emergenciesResponse.ok) {
        throw new Error(
          emergenciesData.message || "Failed to load emergencies."
        );
      }

      setComplaints(Array.isArray(complaintsData) ? complaintsData : []);
      setEmergencies(Array.isArray(emergenciesData) ? emergenciesData : []);
    } catch (error) {
      console.error("My records error:", error);
      setRecordsMessage(
        error instanceof Error ? error.message : "Unable to load your records."
      );
    } finally {
      setRecordsLoading(false);
    }
  }, [citizenId]);

  const deleteRecord = async () => {
    if (!deleteTarget || !citizen?.citizen_id) return;

    try {
      setActionLoading(true);

      const baseUrl =
        deleteTarget.type === "complaint"
          ? "https://smart-city-production-c48b.up.railway.app/api/complaints"
          : "https://smart-city-production-c48b.up.railway.app/api/emergency";

      const response = await fetch(`${baseUrl}/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          citizen_id: citizen.citizen_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Delete failed.");
      }

      setDeleteTarget(null);
      await fetchMyRecords();
    } catch (error) {
      console.error("Delete record error:", error);
      setRecordsMessage(
        error instanceof Error ? error.message : "Unable to delete record."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const saveComplaint = async () => {
    if (!editingComplaint || !citizen?.citizen_id) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `https://smart-city-production-c48b.up.railway.app/api/complaints/${editingComplaint.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            citizen_id: citizen.citizen_id,
            title: editingComplaint.title?.trim() || "Untitled complaint",
            description: editingComplaint.description.trim(),
            category: editingComplaint.category || "Other",
            location: editingComplaint.location || citizen.area || "Not provided",
            priority: editingComplaint.priority || "Medium",
            status: editingComplaint.status || "Pending",
            latitude: editingComplaint.latitude ?? null,
            longitude: editingComplaint.longitude ?? null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update complaint.");
      }

      setEditingComplaint(null);
      setPendingUpdate(null);
      await fetchMyRecords();
    } catch (error) {
      console.error("Update complaint error:", error);
      setRecordsMessage(
        error instanceof Error ? error.message : "Unable to update complaint."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const saveEmergency = async () => {
    if (!editingEmergency || !citizen?.citizen_id) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `https://smart-city-production-c48b.up.railway.app/api/emergency/${editingEmergency.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            citizen_id: citizen.citizen_id,
            type: editingEmergency.type,
            location: editingEmergency.location,
            team: editingEmergency.team || "Emergency Response Team",
            priority: editingEmergency.priority || "High",
            status: editingEmergency.status || "Active",
            latitude: editingEmergency.latitude ?? null,
            longitude: editingEmergency.longitude ?? null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update emergency.");
      }

      setEditingEmergency(null);
      setPendingUpdate(null);
      await fetchMyRecords();
    } catch (error) {
      console.error("Update emergency error:", error);
      setRecordsMessage(
        error instanceof Error ? error.message : "Unable to update emergency."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);

      const response = await fetch(
        "https://smart-city-production-c48b.up.railway.app/api/notifications"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Notification error:", error);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    const fetchTimer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);

    return () => window.clearTimeout(fetchTimer);
  }, []);

  useEffect(() => {
    const fetchTimer = window.setTimeout(() => {
      void fetchMyRecords();
    }, 0);

    const refreshTimer = window.setInterval(() => {
      void fetchMyRecords();
    }, 10000);

    return () => {
      window.clearTimeout(fetchTimer);
      window.clearInterval(refreshTimer);
    };
  }, [citizenId, fetchMyRecords]);

  useEffect(() => {
    if (!showComplaintForm && !showEmergencyForm && !showNotifications) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showComplaintForm, showEmergencyForm, showNotifications]);

  const logout = () => {
    localStorage.removeItem("citizen");
    window.location.href = "/citizen-login";
  };

  const submitComplaint = async (event: FormEvent) => {
    event.preventDefault();

    if (!citizen?.citizen_id) {
      setComplaintMessage("Citizen information not found.");
      return;
    }

    if (!complaintForm.title.trim() || !complaintForm.description.trim()) {
      setComplaintMessage("Title and description are required.");
      return;
    }

    try {
      setComplaintLoading(true);
      setComplaintMessage("");

      const response = await fetch(
        "https://smart-city-production-c48b.up.railway.app/api/complaints/citizen",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            citizen_id: citizen.citizen_id,
            title: complaintForm.title.trim(),
            description: complaintForm.description.trim(),
            category: complaintForm.category || "Other",
            area: complaintForm.area.trim() || citizen.area || "Not provided",
            latitude: null,
            longitude: null,
          }),
        }
      );

      const responseText = await response.text();
      let data: { message?: string; complaintId?: number } = {};

      try {
        data = JSON.parse(responseText) as {
          message?: string;
          complaintId?: number;
        };
      } catch {
        setComplaintMessage(
          response.ok
            ? "Unexpected response from server."
            : `Server error (${response.status}). Please try again.`
        );
        return;
      }

      if (!response.ok) {
        setComplaintMessage(data.message || "Failed to submit complaint.");
        return;
      }

      setComplaintMessage(
        `Complaint submitted successfully. ID: ${data.complaintId ?? "N/A"}`
      );
      setComplaintForm({
        title: "",
        description: "",
        category: "",
        area: "",
      });

      void fetchMyRecords();

      window.setTimeout(() => {
        setShowComplaintForm(false);
        setComplaintMessage("");
      }, 1800);
    } catch (error) {
      console.error("Submit complaint error:", error);
      setComplaintMessage("Unable to connect to server.");
    } finally {
      setComplaintLoading(false);
    }
  };

  const submitEmergency = async (event: FormEvent) => {
    event.preventDefault();

    if (!citizen?.citizen_id) {
      setEmergencyMessage("Citizen information not found.");
      return;
    }

    if (!emergencyForm.type.trim() || !emergencyForm.location.trim()) {
      setEmergencyMessage("Emergency type and location are required.");
      return;
    }

    try {
      setEmergencyLoading(true);
      setEmergencyMessage("");

      const response = await fetch(
        "https://smart-city-production-c48b.up.railway.app/api/emergency",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            citizen_id: citizen.citizen_id,
            type: emergencyForm.type,
            location: emergencyForm.location.trim(),
            team: "Emergency Response Team",
            priority: "High",
            status: "Active",
            latitude: null,
            longitude: null,
          }),
        }
      );

      const responseText = await response.text();
      let data: { message?: string; id?: number } = {};

      try {
        data = JSON.parse(responseText) as {
          message?: string;
          id?: number;
        };
      } catch {
        setEmergencyMessage(
          response.ok
            ? "Unexpected response from server."
            : `Server error (${response.status}). Please try again.`
        );
        return;
      }

      if (!response.ok) {
        setEmergencyMessage(data.message || "Failed to report emergency.");
        return;
      }

      setEmergencyMessage(
        `Emergency reported successfully. ID: ${data.id ?? "N/A"}`
      );
      setEmergencyForm({
        type: "",
        location: "",
      });

      void fetchMyRecords();

      window.setTimeout(() => {
        setShowEmergencyForm(false);
        setEmergencyMessage("");
      }, 1800);
    } catch (error) {
      console.error("Emergency submission error:", error);
      setEmergencyMessage("Unable to connect to server.");
    } finally {
      setEmergencyLoading(false);
    }
  };

  if (!citizen) {
    return (
      <div className="citizen-loading">
        <h2>Citizen Portal</h2>
        <p>Please login to continue.</p>

        <button onClick={() => (window.location.href = "/citizen-login")}>
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="citizen-portal">

      {/* Header */}
      <header className="citizen-header">
        <div>
          <h1>Smart City</h1>
          <p>Citizen Portal</p>
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </header>

      {/* Welcome */}
      <section className="welcome-card">
        <div>
          <h2>Welcome, {citizen.name} 👋</h2>
          <p>
            Welcome to your Smart City citizen portal.
          </p>
        </div>

        <div className="citizen-status">
          <span>Status</span>
          <strong>{citizen.status || "Active"}</strong>
        </div>
      </section>

      {/* Stats / Quick Cards */}
      <section className="citizen-cards">

        <div className="citizen-card">
          <div className="card-icon">👤</div>
          <div>
            <span>Citizen ID</span>
            <strong>{citizen.citizen_id || "N/A"}</strong>
          </div>
        </div>

        <div className="citizen-card">
          <div className="card-icon">📧</div>
          <div>
            <span>Email</span>
            <strong>{citizen.email}</strong>
          </div>
        </div>

        <div className="citizen-card">
          <div className="card-icon">📞</div>
          <div>
            <span>Phone</span>
            <strong>{citizen.phone || "Not provided"}</strong>
          </div>
        </div>

        <div className="citizen-card">
          <div className="card-icon">📍</div>
          <div>
            <span>Area</span>
            <strong>{citizen.area || "Not provided"}</strong>
          </div>
        </div>

      </section>

      {/* Main Sections */}
      <section className="portal-sections">

        <div className="portal-box">
          <h3>📢 Report a Complaint</h3>
          <p>
            Report an issue or problem in your area to the Smart City
            administration.
          </p>

          <button onClick={() => setShowComplaintForm(true)}>
            Submit Complaint
          </button>
        </div>

        <div className="portal-box">
          <h3>🚨 Emergency</h3>
          <p>
            Access emergency information and important city alerts.
          </p>

          <button onClick={() => setShowEmergencyForm(true)}>
            Report Emergency
          </button>
        </div>

        <div className="portal-box">
          <h3>🔔 Notifications</h3>
          <p>
            View important announcements and updates from Smart City.
          </p>

          <button onClick={() => setShowNotifications(true)}>
            View Notifications
          </button>
        </div>

      </section>

      {/* My Complaints & Emergencies */}
      <section className="profile-section records-section">
        <div className="profile-header">
          <div>
            <h2>My Complaints & Emergencies</h2>
            <p>Track your submitted reports and their latest status.</p>
          </div>
          <button
            type="button"
            className="cancel-btn"
            onClick={() => void fetchMyRecords()}
            disabled={recordsLoading}
          >
            {recordsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {recordsMessage && (
          <p className="complaint-message">{recordsMessage}</p>
        )}

        <div className="my-records-grid">
          <div className="my-records-column">
            <h3>📢 My Complaints</h3>

            {complaints.length === 0 ? (
              <div className="notification-empty">
                No complaints submitted yet.
              </div>
            ) : (
              complaints.map((complaint) => {
                const complaintDetails = formatComplaintDetails(complaint);

                return (
                  <div className="record-card" key={complaint.id}>
                    <div className="record-card-header">
                      <strong>Complaint #{complaint.id}</strong>
                      <span className={`status-badge status-${(complaint.status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}>
                        {complaint.status || "Pending"}
                      </span>
                    </div>

                    <p><b>Title:</b> {complaintDetails.title}</p>
                    <p><b>Category:</b> {complaint.category || "Other"}</p>
                    <p><b>Location:</b> {complaint.location || "Not provided"}</p>
                    <p><b>Description:</b> {complaintDetails.description}</p>
                    <small>
                      {complaint.created_at
                        ? new Date(complaint.created_at).toLocaleString()
                        : ""}
                    </small>

                    <div className="record-actions">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingComplaint({
                            ...complaint,
                            title: complaintDetails.title,
                            description: complaintDetails.description,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="delete-record-btn"
                        onClick={() =>
                          setDeleteTarget({
                            type: "complaint",
                            id: complaint.id,
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="my-records-column">
            <h3>🚨 My Emergencies</h3>

            {emergencies.length === 0 ? (
              <div className="notification-empty">
                No emergencies reported yet.
              </div>
            ) : (
              emergencies.map((emergency) => (
                <div className="record-card" key={emergency.id}>
                  <div className="record-card-header">
                    <strong>Emergency #{emergency.id}</strong>
                    <span className={`status-badge status-${(emergency.status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}>
                      {emergency.status || "Pending"}
                    </span>
                  </div>

                  <p><b>Type:</b> {emergency.type}</p>
                  <p><b>Location:</b> {emergency.location}</p>
                  <p><b>Priority:</b> {emergency.priority || "High"}</p>
                  <p><b>Team:</b> {emergency.team || "Emergency Response Team"}</p>

                  <div className="record-actions">
                    <button
                      type="button"
                      onClick={() => setEditingEmergency({ ...emergency })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="delete-record-btn"
                      onClick={() =>
                        setDeleteTarget({
                          type: "emergency",
                          id: emergency.id,
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Profile */}
      <section className="profile-section">

        <div className="profile-header">
          <h2>My Profile</h2>
        </div>

        <div className="profile-grid">

          <div>
            <label>Full Name</label>
            <p>{citizen.name}</p>
          </div>

          <div>
            <label>Citizen ID</label>
            <p>{citizen.citizen_id || "N/A"}</p>
          </div>

          <div>
            <label>Email</label>
            <p>{citizen.email}</p>
          </div>

          <div>
            <label>Phone</label>
            <p>{citizen.phone || "Not provided"}</p>
          </div>

          <div>
            <label>Area</label>
            <p>{citizen.area || "Not provided"}</p>
          </div>

          <div>
            <label>Account Status</label>
            <p>{citizen.status || "Active"}</p>
          </div>

        </div>

      </section>

      {showComplaintForm && (
        <div className="complaint-modal-overlay">
          <div className="complaint-modal">
            <div className="complaint-modal-header">
              <h2>Submit Complaint</h2>

              <button
                type="button"
                className="close-complaint-btn"
                onClick={() => setShowComplaintForm(false)}
                aria-label="Close complaint form"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitComplaint}>
              <div className="complaint-form-group">
                <label htmlFor="complaint-title">Title</label>
                <input
                  id="complaint-title"
                  type="text"
                  value={complaintForm.title}
                  onChange={(event) =>
                    setComplaintForm({
                      ...complaintForm,
                      title: event.target.value,
                    })
                  }
                  placeholder="e.g. Broken street light"
                />
              </div>

              <div className="complaint-form-group">
                <label htmlFor="complaint-category">Category</label>
                <select
                  id="complaint-category"
                  value={complaintForm.category}
                  onChange={(event) =>
                    setComplaintForm({
                      ...complaintForm,
                      category: event.target.value,
                    })
                  }
                >
                  <option value="">Select category</option>
                  <option value="Road">Road</option>
                  <option value="Water">Water</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Waste">Waste</option>
                  <option value="Street Light">Street Light</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="complaint-form-group">
                <label htmlFor="complaint-area">Area</label>
                <input
                  id="complaint-area"
                  type="text"
                  value={complaintForm.area}
                  onChange={(event) =>
                    setComplaintForm({
                      ...complaintForm,
                      area: event.target.value,
                    })
                  }
                  placeholder={citizen.area || "Enter area"}
                />
              </div>

              <div className="complaint-form-group">
                <label htmlFor="complaint-description">Description</label>
                <textarea
                  id="complaint-description"
                  rows={5}
                  value={complaintForm.description}
                  onChange={(event) =>
                    setComplaintForm({
                      ...complaintForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Describe the problem..."
                />
              </div>

              {complaintMessage && (
                <p
                  className={`complaint-message ${
                    complaintMessage.includes("successfully") ? "success" : ""
                  }`}
                  role="status"
                >
                  {complaintMessage}
                </p>
              )}

              <div className="complaint-modal-actions">
                <button
                  type="button"
                  className="cancel-complaint-btn"
                  onClick={() => setShowComplaintForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-complaint-btn"
                  disabled={complaintLoading}
                >
                  {complaintLoading ? "Submitting..." : "Submit Complaint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmergencyForm && (
        <div className="complaint-modal-overlay">
          <div className="complaint-modal">
            <div className="complaint-modal-header">
              <h2>🚨 Report Emergency</h2>

              <button
                type="button"
                className="close-complaint-btn"
                onClick={() => setShowEmergencyForm(false)}
                aria-label="Close emergency form"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitEmergency}>
              <div className="complaint-form-group">
                <label htmlFor="emergency-type">Emergency Type</label>
                <select
                  id="emergency-type"
                  value={emergencyForm.type}
                  onChange={(event) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      type: event.target.value,
                    })
                  }
                >
                  <option value="">Select emergency</option>
                  <option value="Fire">🔥 Fire</option>
                  <option value="Accident">🚗 Accident</option>
                  <option value="Medical">🚑 Medical</option>
                  <option value="Crime">🚨 Crime</option>
                  <option value="Flood">🌊 Flood</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="complaint-form-group">
                <label htmlFor="emergency-location">Location</label>
                <input
                  id="emergency-location"
                  type="text"
                  value={emergencyForm.location}
                  onChange={(event) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      location: event.target.value,
                    })
                  }
                  placeholder="Enter emergency location"
                />
              </div>

              {emergencyMessage && (
                <p
                  className={`complaint-message ${
                    emergencyMessage.includes("successfully") ? "success" : ""
                  }`}
                  role="status"
                >
                  {emergencyMessage}
                </p>
              )}

              <div className="complaint-modal-actions">
                <button
                  type="button"
                  className="cancel-complaint-btn"
                  onClick={() => setShowEmergencyForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-complaint-btn"
                  disabled={emergencyLoading}
                >
                  {emergencyLoading ? "Reporting..." : "Report Emergency"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingComplaint && (
        <div className="complaint-modal-overlay">
          <div className="complaint-modal">
            <div className="complaint-modal-header">
              <h2>Update Complaint #{editingComplaint.id}</h2>
              <button
                type="button"
                className="close-complaint-btn"
                onClick={() => setEditingComplaint(null)}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPendingUpdate({
                  type: "complaint",
                  action: () => {
                    setPendingUpdate(null);
                    void saveComplaint();
                  },
                });
              }}
            >
              <div className="complaint-form-group">
                <label>Title</label>
                <input
                  value={editingComplaint.title || ""}
                  onChange={(event) =>
                    setEditingComplaint({
                      ...editingComplaint,
                      title: event.target.value,
                    })
                  }
                />
              </div>

              <div className="complaint-form-group">
                <label>Category</label>
                <select
                  value={editingComplaint.category || "Other"}
                  onChange={(event) =>
                    setEditingComplaint({
                      ...editingComplaint,
                      category: event.target.value,
                    })
                  }
                >
                  <option value="Road">Road</option>
                  <option value="Water">Water</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Waste">Waste</option>
                  <option value="Street Light">Street Light</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="complaint-form-group">
                <label>Location</label>
                <input
                  value={editingComplaint.location || ""}
                  onChange={(event) =>
                    setEditingComplaint({
                      ...editingComplaint,
                      location: event.target.value,
                    })
                  }
                />
              </div>

              <div className="complaint-form-group">
                <label>Description</label>
                <textarea
                  rows={5}
                  value={editingComplaint.description}
                  onChange={(event) =>
                    setEditingComplaint({
                      ...editingComplaint,
                      description: event.target.value,
                    })
                  }
                />
              </div>

              <div className="complaint-modal-actions">
                <button
                  type="button"
                  className="cancel-complaint-btn"
                  onClick={() => setEditingComplaint(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-complaint-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Update Complaint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingEmergency && (
        <div className="complaint-modal-overlay">
          <div className="complaint-modal">
            <div className="complaint-modal-header">
              <h2>Update Emergency #{editingEmergency.id}</h2>
              <button
                type="button"
                className="close-complaint-btn"
                onClick={() => setEditingEmergency(null)}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPendingUpdate({
                  type: "emergency",
                  action: () => {
                    setPendingUpdate(null);
                    void saveEmergency();
                  },
                });
              }}
            >
              <div className="complaint-form-group">
                <label>Emergency Type</label>
                <select
                  value={editingEmergency.type}
                  onChange={(event) =>
                    setEditingEmergency({
                      ...editingEmergency,
                      type: event.target.value,
                    })
                  }
                >
                  <option value="Fire">🔥 Fire</option>
                  <option value="Accident">🚗 Accident</option>
                  <option value="Medical">🚑 Medical</option>
                  <option value="Crime">🚨 Crime</option>
                  <option value="Flood">🌊 Flood</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="complaint-form-group">
                <label>Location</label>
                <input
                  value={editingEmergency.location}
                  onChange={(event) =>
                    setEditingEmergency({
                      ...editingEmergency,
                      location: event.target.value,
                    })
                  }
                />
              </div>

              <div className="complaint-modal-actions">
                <button
                  type="button"
                  className="cancel-complaint-btn"
                  onClick={() => setEditingEmergency(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-complaint-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Update Emergency"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`Delete ${deleteTarget.type === "complaint" ? "Complaint" : "Emergency"}?`}
          message={`Are you sure you want to permanently delete this ${deleteTarget.type}?`}
          warning="This action cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          loading={actionLoading}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteRecord()}
        />
      )}

      {pendingUpdate && (
        <ConfirmModal
          title={`Update ${pendingUpdate.type === "complaint" ? "Complaint" : "Emergency"}?`}
          message={`Are you sure you want to update this ${pendingUpdate.type}?`}
          warning="This will save your changes."
          confirmLabel="Update"
          tone="primary"
          loading={actionLoading}
          onCancel={() => setPendingUpdate(null)}
          onConfirm={pendingUpdate.action}
        />
      )}

      {showNotifications && (
        <div className="citizen-modal-overlay">
          <div className="citizen-modal notification-modal">
            <div className="modal-header">
              <div>
                <h2>Notifications</h2>
                <p>Latest updates from Smart City</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowNotifications(false)}
                aria-label="Close notifications"
              >
                ×
              </button>
            </div>

            {notificationLoading ? (
              <div className="notification-empty">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                No notifications available.
              </div>
            ) : (
              <div className="citizen-notification-list">
                {notifications.map((notification) => (
                  <div
                    className={`citizen-notification ${
                      notification.is_read ? "read" : "unread"
                    }`}
                    key={notification.id}
                  >
                    <div className="notification-content">
                      <h3>{notification.title}</h3>
                      <p>{notification.message}</p>
                      <span>
                        {notification.type} •{" "}
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowNotifications(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenPortal;