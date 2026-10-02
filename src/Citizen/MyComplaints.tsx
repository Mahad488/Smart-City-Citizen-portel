import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Clock3,
  MapPin,
  MessageSquare,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { API_BASE_URL, formatComplaintId } from "../api";
import { CitizenNavbar, CitizenSidebar } from "./CitizenNavigation";
import ConfirmModal from "../components/ConfirmModal";
import "./Citizenportal.css";
import "./MyComplaints.css";

interface Citizen {
  citizen_id?: string;
  name: string;
  email: string;
  area?: string;
}

interface Complaint {
  id: number;
  category: string;
  description: string;
  location: string;
  priority: string;
  status: string;
  created_at: string;
}

function MyComplaints() {
  const navigate = useNavigate();

  const [citizen] = useState<Citizen | null>(() => {
    try {
      const saved = localStorage.getItem("citizen");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFeedback, setActionFeedback] = useState("");
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    area: "",
    description: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [complaintToDelete, setComplaintToDelete] = useState<Complaint | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadComplaints = async () => {
    if (!citizen?.citizen_id) {
      setError("Citizen information not found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/complaints/citizen/${citizen.citizen_id}`
      );

      const text = await response.text();

      let data: Complaint[] | { message?: string } = [];

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(
          !Array.isArray(data)
            ? data.message || "Unable to load complaints."
            : "Unable to load complaints."
        );
      }

      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load complaints."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [citizen?.citizen_id]);

  const startEditing = (complaint: Complaint) => {
    setActionFeedback("");
    setEditForm({
      title: getTitle(complaint.description),
      category: complaint.category || "Other",
      area: complaint.location || "",
      description: getDescription(complaint.description),
    });
    setEditingComplaint(complaint);
  };

  const saveComplaint = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!citizen?.citizen_id || !editingComplaint) {
      setActionFeedback("Citizen information not found.");
      return;
    }

    try {
      setSavingEdit(true);
      setActionFeedback("");

      const response = await fetch(
        `${API_BASE_URL}/api/complaints/citizen/${editingComplaint.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            citizen_id: citizen.citizen_id,
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            category: editForm.category,
            area: editForm.area.trim(),
          }),
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to update complaint.");
      }

      setEditingComplaint(null);
      setActionFeedback("Complaint updated successfully.");
      await loadComplaints();
    } catch (err) {
      setActionFeedback(
        err instanceof Error ? err.message : "Unable to update complaint.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteComplaint = async () => {
    if (!citizen?.citizen_id || !complaintToDelete) {
      setActionFeedback("Citizen information not found.");
      return;
    }

    try {
      setDeleting(true);
      setActionFeedback("");

      const response = await fetch(
        `${API_BASE_URL}/api/complaints/citizen/${complaintToDelete.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ citizen_id: citizen.citizen_id }),
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Unable to delete complaint.");
      }

      setComplaints((current) =>
        current.filter((complaint) => complaint.id !== complaintToDelete.id),
      );
      setComplaintToDelete(null);
      setActionFeedback("Complaint deleted successfully.");
    } catch (err) {
      setComplaintToDelete(null);
      setActionFeedback(
        err instanceof Error ? err.message : "Unable to delete complaint.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleNavigation = (label: string) => {
    if (label === "Logout") {
      localStorage.removeItem("citizen");
      navigate("/citizen-login");
      return;
    }

    if (label === "New Complaint") {
      navigate("/citizen-new-complaint");
      return;
    }

    if (label === "Emergency") {
      navigate("/citizen-emergency");
      return;
    }

    if (label === "My Complaints") {
      return;
    }

    if (label === "Notifications") {
      navigate("/citizen-notifications");
      return;
    }

    navigate("/citizen-portal");
  };

  const stats = useMemo(() => {
    return {
      total: complaints.length,

      pending: complaints.filter(
        (item) =>
          item.status?.toLowerCase() === "pending"
      ).length,

      progress: complaints.filter(
        (item) =>
          item.status?.toLowerCase() === "in progress"
      ).length,

      resolved: complaints.filter(
        (item) =>
          item.status?.toLowerCase() === "resolved"
      ).length,
    };
  }, [complaints]);

  const getTitle = (description: string) => {
    if (!description) return "Complaint";

    const match = description.match(
      /^Title:\s*(.+?)(?:\n|$)/
    );

    return match?.[1] || "Complaint";
  };

  const getDescription = (description: string) => {
    if (!description) return "";

    return description
      .replace(/^Title:\s*.+?\n\n?/i, "")
      .trim();
  };

  const getStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "resolved":
        return "status-resolved";

      case "in progress":
        return "status-progress";

      case "pending":
        return "status-pending";

      case "rejected":
        return "status-rejected";

      default:
        return "status-default";
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "priority-high";

      case "medium":
        return "priority-medium";

      case "low":
        return "priority-low";

      default:
        return "";
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "-";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return date;
    }

    return value.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="citizen-dashboard my-complaints-page">
      <CitizenSidebar
        activeItem="My Complaints"
        onNavigate={handleNavigation}
      />

      <main className="dashboard-main">
        <CitizenNavbar citizenName={citizen?.name || "Citizen"} />

        {/* CONTENT */}

        <div className="complaints-content">

          <div className="complaints-heading">

            <div>
              <h1>My Complaints</h1>

              <p>
                Track and manage all your submitted complaints.
              </p>
            </div>

            <div className="heading-actions">

              <button
                className="refresh-button"
                onClick={loadComplaints}
              >
                <RefreshCw size={15} aria-hidden="true" /> Refresh
              </button>

            </div>

          </div>

          {/* STATS */}

          <div className="complaint-stats">

            <div className="stat-card total">
              <div className="stat-icon">
                <MessageSquare size={22} aria-hidden="true" />
              </div>

              <div>
                <span>Total Complaints</span>
                <strong>{stats.total}</strong>
              </div>
            </div>

            <div className="stat-card pending">
              <div className="stat-icon">
                <Clock3 size={22} aria-hidden="true" />
              </div>

              <div>
                <span>Pending</span>
                <strong>{stats.pending}</strong>
              </div>
            </div>

            <div className="stat-card progress">
              <div className="stat-icon">
                <Clock3 size={22} aria-hidden="true" />
              </div>

              <div>
                <span>In Progress</span>
                <strong>{stats.progress}</strong>
              </div>
            </div>

            <div className="stat-card resolved">
              <div className="stat-icon">
                <Check size={22} aria-hidden="true" />
              </div>

              <div>
                <span>Resolved</span>
                <strong>{stats.resolved}</strong>
              </div>
            </div>

          </div>

          {/* COMPLAINT LIST */}

          <section className="complaints-card">

            <div className="card-header">

              <div>
                <h2>
                  Complaint History
                </h2>

                <p>
                  All complaints submitted from your account
                </p>
              </div>

              <span className="complaint-count">
                {complaints.length} Records
              </span>

            </div>

            {actionFeedback && (
              <p className="complaint-action-feedback" role="status">
                {actionFeedback}
              </p>
            )}

            {loading && (
              <div className="complaints-loading">
                <div className="loading-spinner"></div>

                <p>
                  Loading your complaints...
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="complaints-error">

                <div>
                  <AlertTriangle size={20} aria-hidden="true" />
                </div>

                <h3>
                  Unable to load complaints
                </h3>

                <p>
                  {error}
                </p>

                <button
                  onClick={loadComplaints}
                >
                  Try Again
                </button>

              </div>
            )}

            {!loading &&
              !error &&
              complaints.length === 0 && (
                <div className="empty-complaints">

                  <div className="empty-icon">
                    <MessageSquare size={28} aria-hidden="true" />
                  </div>

                  <h3>
                    No complaints yet
                  </h3>

                  <p>
                    You haven't submitted any complaints.
                    Once you submit one, it will appear here.
                  </p>

                  <button
                    onClick={() =>
                      navigate(
                        "/citizen-new-complaint"
                      )
                    }
                  >
                    + Submit New Complaint
                  </button>

                </div>
              )}

            {!loading &&
              !error &&
              complaints.length > 0 && (

                <div className="complaints-table-wrapper">

                  <table className="complaints-table">

                    <thead>
                      <tr>

                        <th>
                          Complaint ID
                        </th>

                        <th>
                          Complaint
                        </th>

                        <th>
                          Category
                        </th>

                        <th>
                          Location
                        </th>

                        <th>
                          Priority
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Date
                        </th>

                        <th aria-label="Complaint actions"></th>

                      </tr>
                    </thead>

                    <tbody>

                      {complaints.map(
                        (complaint) => (

                          <tr
                            key={complaint.id}
                          >

                            <td>
                              <strong className="complaint-id">
                                {formatComplaintId(complaint.id)}
                              </strong>
                            </td>

                            <td>

                              <div className="complaint-title">

                                <strong>
                                  {getTitle(
                                    complaint.description
                                  )}
                                </strong>

                                <span>
                                  {getDescription(
                                    complaint.description
                                  ).slice(
                                    0,
                                    55
                                  )}
                                  {getDescription(
                                    complaint.description
                                  ).length > 55
                                    ? "..."
                                    : ""}
                                </span>

                              </div>

                            </td>

                            <td>
                              <span className="category-badge">
                                {complaint.category ||
                                  "Other"}
                              </span>
                            </td>

                            <td>

                              <div className="location-cell">

                                <span>
                                  <MapPin size={14} aria-hidden="true" />
                                </span>

                                {complaint.location ||
                                  "Not provided"}

                              </div>

                            </td>

                            <td>

                              <span
                                className={`priority-badge ${getPriorityClass(
                                  complaint.priority
                                )}`}
                              >
                                {complaint.priority ||
                                  "Medium"}
                              </span>

                            </td>

                            <td>

                              <span
                                className={`complaint-status ${getStatusClass(
                                  complaint.status
                                )}`}
                              >
                                <i></i>

                                {complaint.status ||
                                  "Pending"}
                              </span>

                            </td>

                            <td>
                              <span className="date-cell">
                                {formatDate(
                                  complaint.created_at
                                )}
                              </span>
                            </td>

                            <td>

                              <div className="complaint-row-actions">
                                <button
                                  type="button"
                                  className="track-complaint-button"
                                  onClick={() =>
                                    navigate(`/citizen-track-complaint/${complaint.id}`)
                                  }
                                >
                                  <Search size={14} />
                                  Track
                                </button>
                                <button
                                  type="button"
                                  className="edit-complaint-button"
                                  onClick={() => startEditing(complaint)}
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="delete-complaint-button"
                                  onClick={() => {
                                    setActionFeedback("");
                                    setComplaintToDelete(complaint);
                                  }}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

          </section>

        </div>

      </main>

      {editingComplaint && (
        <div className="complaint-edit-overlay" role="presentation">
          <section
            className="complaint-edit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-complaint-title"
          >
            <button
              type="button"
              className="complaint-edit-close"
              aria-label="Close edit form"
              onClick={() => setEditingComplaint(null)}
              disabled={savingEdit}
            >
              <X size={18} />
            </button>
            <h2 id="edit-complaint-title">Edit Complaint</h2>
            <form onSubmit={saveComplaint}>
              <label>
                Complaint title
                <input
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, title: event.target.value }))
                  }
                  maxLength={120}
                  required
                />
              </label>
              <label>
                Category
                <select
                  value={editForm.category}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, category: event.target.value }))
                  }
                  required
                >
                  <option value="Road">Road Issues</option>
                  <option value="Water">Water &amp; Sanitation</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Waste">Waste Management</option>
                  <option value="Street Light">Street Light</option>
                  <option value="Traffic">Traffic</option>
                  <option value="Other">Other Issues</option>
                </select>
              </label>
              <label>
                Area / Location
                <input
                  value={editForm.area}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, area: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, description: event.target.value }))
                  }
                  maxLength={1000}
                  required
                />
              </label>
              <div className="complaint-edit-actions">
                <button
                  type="button"
                  className="complaint-edit-cancel"
                  onClick={() => setEditingComplaint(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="complaint-edit-save"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {complaintToDelete && (
        <ConfirmModal
          title="Delete complaint?"
          message={<>Delete complaint <strong>{formatComplaintId(complaintToDelete.id)}</strong>?</>}
          warning="This action cannot be undone."
          confirmLabel="Delete complaint"
          tone="danger"
          loading={deleting}
          onCancel={() => setComplaintToDelete(null)}
          onConfirm={() => void deleteComplaint()}
        />
      )}

    </div>
  );
}

export default MyComplaints;