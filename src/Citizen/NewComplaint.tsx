import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, formatComplaintId } from "../api";
import { CitizenNavbar, CitizenSidebar } from "./CitizenNavigation";
import "./NewComplaint.css";
import "./Citizenportal.css";

interface Citizen {
  citizen_id?: string;
  name: string;
  email: string;
  area?: string;
}

function NewComplaint() {
  const navigate = useNavigate();

  const [citizen] = useState<Citizen | null>(() => {
    try {
      const saved = localStorage.getItem("citizen");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [form, setForm] = useState({
    title: "",
    category: "",
    area: citizen?.area || "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updateField = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const submitComplaint = async (event: FormEvent) => {
    event.preventDefault();

    if (!citizen?.citizen_id) {
      setMessage("Citizen information not found.");
      return;
    }

    if (
      !form.title.trim() ||
      !form.category ||
      !form.area.trim() ||
      !form.description.trim()
    ) {
      setMessage("Please complete all required fields.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `${API_BASE_URL}/api/complaints/citizen`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            citizen_id: citizen.citizen_id,
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            area: form.area.trim(),
            latitude: null,
            longitude: null,
          }),
        }
      );

      const text = await response.text();

      let data: {
        message?: string;
        complaintId?: number;
      } = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to submit complaint."
        );
      }

      setMessage(
        `Complaint submitted successfully. ID: ${
          data.complaintId != null
            ? formatComplaintId(data.complaintId)
            : "N/A"
        }`
      );

      setForm({
        title: "",
        category: "",
        area: citizen.area || "",
        description: "",
      });

      setTimeout(() => {
        navigate("/citizen-portal");
      }, 1500);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit complaint."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (label: string) => {
    if (label === "New Complaint") {
      return;
    }

    if (label === "Logout") {
      localStorage.removeItem("citizen");
      navigate("/citizen-login");
      return;
    }

    if (label === "My Complaints") {
      navigate("/citizen-my-complaints");
      return;
    }

    navigate("/citizen-portal");
  };

  return (
    <div className="citizen-dashboard">
      <CitizenSidebar
        activeItem="New Complaint"
        onNavigate={handleNavigation}
      />

      {/* MAIN */}
      <main className="dashboard-main">
        <CitizenNavbar citizenName={citizen?.name || "Citizen"} />

        {/* CONTENT */}
        <div className="new-content">

          <button
            type="button"
            className="back-dashboard"
            onClick={() =>
              navigate("/citizen-portal")
            }
          >
            ← Back to Dashboard
          </button>

          <div className="page-heading">

            <div className="heading-icon">
              +
            </div>

            <div>
              <h1>Submit New Complaint</h1>

              <p>
                Help us improve your city by reporting an issue.
                Your complaint will be reviewed by the relevant
                department and you'll be notified about the progress.
              </p>
            </div>

          </div>

          <div className="new-layout">

            {/* FORM CARD */}
            <section className="complaint-card">

              <div className="card-title">
                <h2>Complaint Information</h2>
              </div>

              <form onSubmit={submitComplaint}>

                {/* TITLE */}
                <div className="form-field">

                  <label>
                    Complaint Title
                    <span>*</span>
                  </label>

                  <div className="input-with-icon">
                    <span>✎</span>

                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) =>
                        updateField(
                          "title",
                          event.target.value
                        )
                      }
                      placeholder="e.g. Street light not working"
                      maxLength={120}
                    />
                  </div>

                  <small>
                    Give your complaint a short and clear title.
                  </small>

                </div>

                {/* CATEGORY + AREA */}
                <div className="two-fields">

                  <div className="form-field">

                    <label>
                      Category
                      <span>*</span>
                    </label>

                    <div className="input-with-icon select-box">
                      <span>▦</span>

                      <select
                        value={form.category}
                        onChange={(event) =>
                          updateField(
                            "category",
                            event.target.value
                          )
                        }
                      >
                        <option value="">
                          Select category
                        </option>

                        <option value="Road">
                          Road Issues
                        </option>

                        <option value="Water">
                          Water & Sanitation
                        </option>

                        <option value="Electricity">
                          Electricity
                        </option>

                        <option value="Waste">
                          Waste Management
                        </option>

                        <option value="Street Light">
                          Street Light
                        </option>

                        <option value="Traffic">
                          Traffic
                        </option>

                        <option value="Other">
                          Other Issues
                        </option>
                      </select>

                    </div>

                  </div>

                  <div className="form-field">

                    <label>
                      Area / Location
                      <span>*</span>
                    </label>

                    <div className="input-with-icon">

                      <span>⌖</span>

                      <input
                        type="text"
                        value={form.area}
                        onChange={(event) =>
                          updateField(
                            "area",
                            event.target.value
                          )
                        }
                        placeholder="e.g. Johar Town"
                      />

                    </div>

                  </div>

                </div>

                {/* DESCRIPTION */}
                <div className="form-field">

                  <div className="label-row">

                    <label>
                      Description
                      <span>*</span>
                    </label>

                    <small>
                      {form.description.length}/1000
                    </small>

                  </div>

                  <div className="textarea-wrapper">

                    <span>▤</span>

                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateField(
                          "description",
                          event.target.value
                        )
                      }
                      maxLength={1000}
                      placeholder="Please describe the problem in detail. Tell us what happened, where it happened and any other information that may help us resolve the issue..."
                    />

                  </div>

                  <small>
                    The more details you provide, the easier
                    it will be for our team to resolve the issue.
                  </small>

                </div>

                {/* PHOTO */}
                <div className="form-field">

                  <label>
                    Attach Photos
                    <em>(Optional)</em>
                  </label>

                  <div className="upload-box">

                    <div className="upload-icon">
                      ↑
                    </div>

                    <div>
                      <strong>
                        Click to upload or drag and drop
                      </strong>

                      <span>
                        JPG, PNG (Max 5MB)
                      </span>
                    </div>

                  </div>

                </div>

                {/* LOCATION */}
                <div className="form-field">

                  <label>
                    Location
                    <em>(Optional)</em>
                  </label>

                  <div className="location-box">

                    <div className="fake-map">
                      <span>⌖</span>
                    </div>

                    <div className="location-text">
                      <strong>
                        Your current location
                      </strong>

                      <span>
                        Your area will be attached
                        to this complaint.
                      </span>
                    </div>

                    <button
                      type="button"
                      className="location-button"
                    >
                      ⌖ Use Current Location
                    </button>

                  </div>

                </div>

                {/* MESSAGE */}
                {message && (
                  <div
                    className={
                      message.includes(
                        "successfully"
                      )
                        ? "form-message success"
                        : "form-message error"
                    }
                  >
                    {message}
                  </div>
                )}

                {/* SECURITY */}
                <div className="security-note">
                  <span>✓</span>
                  Your information is safe and secure.
                  We only use it to process your complaint.
                </div>

                {/* ACTIONS */}
                <div className="form-actions">

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() =>
                      navigate("/citizen-portal")
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="submit-button"
                    disabled={loading}
                  >
                    {loading
                      ? "Submitting..."
                      : "Submit Complaint"}

                    {!loading && <span>➤</span>}
                  </button>

                </div>

              </form>

            </section>

            {/* RIGHT SIDE */}
            <aside className="complaint-help">

              <div className="help-card">

                <div className="help-heading">
                  <div>📢</div>
                  <h2>What can you report?</h2>
                </div>

                <div className="report-item">
                  <div className="report-icon blue">
                    🚗
                  </div>

                  <div>
                    <strong>Road Issues</strong>
                    <span>
                      Potholes, damaged roads,
                      traffic signals
                    </span>
                  </div>
                </div>

                <div className="report-item">
                  <div className="report-icon green">
                    💧
                  </div>

                  <div>
                    <strong>
                      Water & Sanitation
                    </strong>
                    <span>
                      Water supply, drainage,
                      sewage
                    </span>
                  </div>
                </div>

                <div className="report-item">
                  <div className="report-icon yellow">
                    ⚡
                  </div>

                  <div>
                    <strong>Electricity</strong>
                    <span>
                      Power outages, street lights
                    </span>
                  </div>
                </div>

                <div className="report-item">
                  <div className="report-icon red">
                    🗑
                  </div>

                  <div>
                    <strong>
                      Waste Management
                    </strong>
                    <span>
                      Garbage collection, littering
                    </span>
                  </div>
                </div>

                <div className="report-item">
                  <div className="report-icon purple">
                    ✦
                  </div>

                  <div>
                    <strong>Other Issues</strong>
                    <span>
                      Parks, public places,
                      general issues
                    </span>
                  </div>
                </div>

              </div>

              <div className="city-message">

                <div className="city-illustration">
                  🏙️
                </div>

                <h2>
                  Together for a cleaner,
                  safer and better city!
                </h2>

                <p>
                  Your complaint makes a difference.
                </p>

              </div>

            </aside>

          </div>

        </div>

      </main>

    </div>
  );
}

export default NewComplaint;