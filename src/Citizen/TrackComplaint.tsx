import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../api";
import "./TrackComplaint.css";

interface Citizen {
  citizen_id?: string;
  name: string;
  email: string;
  area?: string;
}

interface Complaint {
  id: number;
  citizen_id: string;
  category: string;
  description: string;
  location: string;
  priority: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
}

function TrackComplaint() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [citizen] = useState<Citizen | null>(() => {
    try {
      const saved = localStorage.getItem("citizen");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [complaintId, setComplaintId] = useState(id || "");
  const [complaint, setComplaint] =
    useState<Complaint | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const formatDateTime = (date: string) => {
    if (!date) return "-";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return date;
    }

    return value.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusStep = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return 1;

      case "under review":
        return 2;

      case "in progress":
        return 3;

      case "resolved":
        return 4;

      case "rejected":
        return 2;

      default:
        return 1;
    }
  };

  const loadComplaint = async (
    selectedId?: string
  ) => {
    const value = selectedId || complaintId;

    if (!value.trim()) {
      setError("Please enter a complaint ID.");
      setComplaint(null);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/complaints/${value.trim()}`
      );

      const text = await response.text();

      let data: Complaint | { message?: string };

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Server returned an invalid response."
        );
      }

      if (!response.ok) {
        const errorMessage =
          "message" in data && typeof data.message === "string"
            ? data.message
            : "Complaint not found.";

        throw new Error(
          errorMessage
        );
      }

      const complaintData = data as Complaint;

      // Security check:
      // citizen can only track their own complaint.
      if (
        citizen?.citizen_id &&
        complaintData.citizen_id !==
          citizen.citizen_id
      ) {
        throw new Error(
          "This complaint does not belong to your account."
        );
      }

      setComplaint(complaintData);
      setComplaintId(String(complaintData.id));

      if (selectedId) {
        navigate(
          `/citizen-track-complaint/${selectedId}`,
          { replace: true }
        );
      }
    } catch (err) {
      setComplaint(null);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to find complaint."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadComplaint(id);
    }
  }, [id]);

  const currentStep = complaint
    ? getStatusStep(complaint.status)
    : 0;

  const statusLower =
    complaint?.status?.toLowerCase();

  const isRejected =
    statusLower === "rejected";

  return (
    <div className="track-page">

      {/* ================= SIDEBAR ================= */}

      <aside className="track-sidebar">

        <div className="track-brand">

          <div className="track-logo">
            SC
          </div>

          <div>
            <h2>Smart City</h2>
            <span>Citizen Portal</span>
          </div>

        </div>

        <div className="track-divider"></div>

        <nav className="track-nav">

          <button
            type="button"
            onClick={() =>
              navigate("/citizen-portal")
            }
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/citizen-new-complaint")
            }
          >
            <span>▣</span>
            New Complaint
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/citizen-my-complaints")
            }
          >
            <span>▤</span>
            My Complaints
          </button>

          <button type="button">
            <span>♧</span>
            Emergency
          </button>

          <button type="button">
            <span>♧</span>
            Notifications

            <b className="track-notification">
              3
            </b>
          </button>

          <button
            type="button"
            onClick={() => navigate("/citizen-profile")}
          >
            <span>♙</span>
            My Profile
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(
                "citizen"
              );

              navigate("/citizen-login");
            }}
          >
            <span>↪</span>
            Logout
          </button>

        </nav>

        <div className="portal-status">

          <span className="online-dot"></span>

          <div>
            <strong>Portal Online</strong>
            <small>Services available</small>
          </div>

        </div>

      </aside>

      {/* ================= MAIN ================= */}

      <main className="track-main">

        {/* TOP NAVBAR */}

        <header className="track-navbar">

          <div className="track-search">

            <span>⌕</span>

            <input
              placeholder="Search here..."
            />

          </div>

          <div className="track-user">

            <div className="navbar-bell">
              ♧
              <b></b>
            </div>

            <div className="user-avatar">
              {citizen?.name
                ?.charAt(0)
                .toUpperCase() || "M"}
            </div>

            <div className="user-info">

              <strong>
                {citizen?.name ||
                  "Muhammad Mahad Rafiq"}
              </strong>

              <small>
                Citizen
              </small>

            </div>

            <span className="user-arrow">
             ⌄
            </span>

          </div>

        </header>

        {/* ================= CONTENT ================= */}

        <section className="track-content">

          {/* PAGE HEADING */}

          <div className="track-heading">

            <div>
              <h1>
                Track Complaint
              </h1>

              <p>
                Track the current status and progress
                of your complaint.
              </p>
            </div>

            <button
              type="button"
              className="track-refresh"
              onClick={() =>
                complaint &&
                loadComplaint(
                  String(complaint.id)
                )
              }
            >
              ↻ Refresh
            </button>

          </div>

          {/* SEARCH BOX */}

          <section className="track-search-card">

            <div className="track-search-title">

              <div className="search-icon-box">
                ⌕
              </div>

              <div>
                <h2>
                  Track Your Complaint
                </h2>

                <p>
                  Enter your complaint ID to view
                  its latest status.
                </p>
              </div>

            </div>

            <form
              className="complaint-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                loadComplaint();
              }}
            >

              <div className="complaint-id-input">

                <label>
                  Complaint ID
                </label>

                <div className="input-wrapper">

                  <span>
                    #
                  </span>

                  <input
                    value={complaintId}
                    onChange={(event) =>
                      setComplaintId(
                        event.target.value
                      )
                    }
                    placeholder="e.g. 11"
                  />

                </div>

              </div>

              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Searching..."
                  : "Track Complaint"}
              </button>

            </form>

            <div className="search-help">
              Enter the complaint ID shown in
              <strong> My Complaints</strong>.
            </div>

          </section>

          {/* ERROR */}

          {error && (
            <div className="track-error">

              <span>!</span>

              <div>
                <strong>
                  Complaint not found
                </strong>

                <p>
                  {error}
                </p>
              </div>

            </div>
          )}

          {/* COMPLAINT RESULT */}

          {complaint && !error && (

            <>

              {/* STATUS HEADER */}

              <section className="tracked-complaint-header">

                <div>

                  <span className="tracked-label">
                    COMPLAINT ID
                  </span>

                  <h2>
                    SC-
                    {String(
                      complaint.id
                    ).padStart(5, "0")}
                  </h2>

                  <h3>
                    {getTitle(
                      complaint.description
                    )}
                  </h3>

                </div>

                <div
                  className={`large-status ${
                    statusLower ===
                    "resolved"
                      ? "resolved"
                      : statusLower ===
                        "in progress"
                      ? "progress"
                      : "pending"
                  }`}
                >
                  <span></span>
                  {complaint.status}
                </div>

              </section>

              {/* TIMELINE */}

              <section className="tracking-card">

                <div className="tracking-card-heading">

                  <div>
                    <h2>
                      Complaint Progress
                    </h2>

                    <p>
                      Follow the progress of your
                      complaint.
                    </p>
                  </div>

                  <span>
                    Last updated
                  </span>

                </div>

                <div className="timeline">

                  {/* SUBMITTED */}

                  <div
                    className={`timeline-item ${
                      currentStep >= 1
                        ? "completed"
                        : ""
                    }`}
                  >

                    <div className="timeline-line"></div>

                    <div className="timeline-icon">
                      ✓
                    </div>

                    <div className="timeline-content">

                      <h3>
                        Complaint Submitted
                      </h3>

                      <span>
                        {formatDateTime(
                          complaint.created_at
                        )}
                      </span>

                      <p>
                        Your complaint has been
                        successfully submitted to
                        Smart City.
                      </p>

                    </div>

                  </div>

                  {/* UNDER REVIEW */}

                  <div
                    className={`timeline-item ${
                      currentStep >= 2
                        ? "completed"
                        : ""
                    } ${
                      currentStep === 2
                        ? "current"
                        : ""
                    }`}
                  >

                    <div className="timeline-line"></div>

                    <div className="timeline-icon">
                      {currentStep >= 2
                        ? "✓"
                        : "2"}
                    </div>

                    <div className="timeline-content">

                      <h3>
                        Under Review
                      </h3>

                      <span>
                        {currentStep >= 2
                          ? "Complaint is being reviewed"
                          : "Waiting for review"}
                      </span>

                      <p>
                        Our team is reviewing your
                        complaint and assigning it
                        to the relevant department.
                      </p>

                    </div>

                  </div>

                  {/* IN PROGRESS */}

                  <div
                    className={`timeline-item ${
                      currentStep >= 3
                        ? "completed"
                        : ""
                    } ${
                      currentStep === 3
                        ? "current"
                        : ""
                    }`}
                  >

                    <div className="timeline-line"></div>

                    <div className="timeline-icon">
                      {currentStep >= 3
                        ? "✓"
                        : "3"}
                    </div>

                    <div className="timeline-content">

                      <h3>
                        In Progress
                      </h3>

                      <span>
                        {currentStep >= 3
                          ? "Work is in progress"
                          : "Waiting for department action"}
                      </span>

                      <p>
                        The concerned department is
                        working on resolving the issue.
                      </p>

                    </div>

                  </div>

                  {/* RESOLVED */}

                  <div
                    className={`timeline-item last ${
                      currentStep >= 4
                        ? "completed"
                        : ""
                    } ${
                      currentStep === 4
                        ? "current"
                        : ""
                    }`}
                  >

                    <div className="timeline-icon">
                      {currentStep >= 4
                        ? "✓"
                        : "4"}
                    </div>

                    <div className="timeline-content">

                      <h3>
                        Resolved
                      </h3>

                      <span>
                        {currentStep >= 4
                          ? "Complaint resolved"
                          : "Waiting for resolution"}
                      </span>

                      <p>
                        You will be notified once
                        the complaint has been
                        successfully resolved.
                      </p>

                    </div>

                  </div>

                </div>

                {isRejected && (
                  <div className="rejected-message">

                    <strong>
                      Complaint Rejected
                    </strong>

                    <p>
                      This complaint has been
                      rejected by the concerned
                      department.
                    </p>

                  </div>
                )}

              </section>

              {/* DETAILS */}

              <section className="track-details-grid">

                <div className="complaint-details-card">

                  <div className="details-heading">
                    <h2>
                      Complaint Details
                    </h2>
                  </div>

                  <div className="details-grid">

                    <div>
                      <span>
                        Complaint Title
                      </span>

                      <strong>
                        {getTitle(
                          complaint.description
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Category
                      </span>

                      <strong>
                        {complaint.category ||
                          "Other"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Location
                      </span>

                      <strong>
                        ⌖{" "}
                        {complaint.location ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Priority
                      </span>

                      <strong
                        className={`detail-priority ${
                          complaint.priority?.toLowerCase()
                        }`}
                      >
                        {complaint.priority ||
                          "Medium"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Submitted On
                      </span>

                      <strong>
                        {formatDate(
                          complaint.created_at
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Current Status
                      </span>

                      <strong>
                        {complaint.status}
                      </strong>
                    </div>

                  </div>

                  <div className="description-box">

                    <span>
                      Description
                    </span>

                    <p>
                      {getDescription(
                        complaint.description
                      ) ||
                        "No description provided."}
                    </p>

                  </div>

                </div>

                {/* HELP CARD */}

                <div className="track-help-card">

                  <div className="help-icon">
                    ?
                  </div>

                  <h2>
                    Need Help?
                  </h2>

                  <p>
                    If you have questions about
                    your complaint or its status,
                    our support team is here to
                    help.
                  </p>

                  <button type="button">
                    Contact Support
                  </button>

                </div>

              </section>

            </>
          )}

          {/* INITIAL STATE */}

          {!complaint &&
            !error &&
            !loading && (
              <div className="track-empty">

                <div className="empty-track-icon">
                  ⌕
                </div>

                <h2>
                  Track Your Complaint
                </h2>

                <p>
                  Enter your complaint ID above
                  to see its current status and
                  progress.
                </p>

              </div>
            )}

        </section>

      </main>

    </div>
  );
}

export default TrackComplaint;