import {
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CarFront,
  Check,
  Droplets,
  FileText,
  Layers,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
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

interface Coordinates {
  latitude: number;
  longitude: number;
}

function NewComplaint() {
  const navigate = useNavigate();
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoProcessing, setPhotoProcessing] = useState(false);

  const mapCenter = coordinates ?? {
    latitude: 31.5204,
    longitude: 74.358,
  };
  const mapUrl = googleMapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
        googleMapsApiKey
      )}&q=${mapCenter.latitude},${mapCenter.longitude}&zoom=15&maptype=roadmap`
    : `https://maps.google.com/maps?q=${mapCenter.latitude},${mapCenter.longitude}&z=15&output=embed`;

  const updateField = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const selectPhoto = (file?: File) => {
    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setPhotoError("Choose a JPG or PNG image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("The photo must be 5 MB or smaller.");
      return;
    }

    setPhotoProcessing(true);
    setPhotoError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoDataUrl(reader.result);
        setPhotoName(file.name);
      } else {
        setPhotoError("Unable to read this photo. Please try another file.");
      }
      setPhotoProcessing(false);
    };
    reader.onerror = () => {
      setPhotoError("Unable to read this photo. Please try another file.");
      setPhotoProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectPhoto(event.target.files?.[0]);
    event.target.value = "";
  };

  const handlePhotoDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    selectPhoto(event.dataTransfer.files[0]);
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
            Authorization: `Bearer ${localStorage.getItem("citizen_token") || ""}`,
          },
          body: JSON.stringify({
            citizen_id: citizen.citizen_id,
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            area: form.area.trim(),
            latitude: coordinates?.latitude ?? null,
            longitude: coordinates?.longitude ?? null,
            photo: photoDataUrl || null,
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
        `Complaint registered successfully! A confirmation email has been sent. Work will begin within 24 hours. (ID: ${
          data.complaintId != null
            ? formatComplaintId(data.complaintId)
            : "N/A"
        })`
      );

      setForm({
        title: "",
        category: "",
        area: citizen.area || "",
        description: "",
      });
      setCoordinates(null);
      setPhotoDataUrl("");
      setPhotoName("");

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

  const useCurrentLocation = () => {
    if (!window.isSecureContext) {
      setLocationError("Location access requires HTTPS or localhost.");
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords: currentCoords }) => {
        setCoordinates({
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
        });
        setLocating(false);
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Allow location access in your browser to show your position."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Your device could not determine a location. Turn on Location Services and try again."
              : "Location request timed out. Check Location Services and try again."
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
    );
  };

  const handleNavigation = (label: string) => {
    if (label === "New Complaint") {
      return;
    }

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

    if (label === "Notifications") {
      navigate("/citizen-notifications");
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
            <ArrowLeft size={16} aria-hidden="true" /> Back to Dashboard
          </button>

          <div className="page-heading">

            <div className="heading-icon">
              <Plus size={22} aria-hidden="true" />
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
                    <span><Pencil size={16} aria-hidden="true" /></span>

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
                      <span><Layers size={16} aria-hidden="true" /></span>

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

                      <span><MapPin size={16} aria-hidden="true" /></span>

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

                    <span><FileText size={16} aria-hidden="true" /></span>

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

                  <div
                    className="upload-box"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handlePhotoDrop}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      aria-label="Attach a JPG or PNG photo"
                      onChange={handlePhotoChange}
                    />

                    <div className="upload-icon">
                      <Upload size={22} aria-hidden="true" />
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

                  {photoDataUrl && (
                    <div className="photo-preview">
                      <img src={photoDataUrl} alt="Complaint attachment preview" />
                      <div className="photo-preview-details">
                        <strong>{photoName}</strong>
                        <button
                          type="button"
                          className="remove-photo-button"
                          onClick={() => {
                            setPhotoDataUrl("");
                            setPhotoName("");
                          }}
                        >
                          Remove photo
                        </button>
                      </div>
                    </div>
                  )}

                  {photoProcessing && <small>Preparing photo...</small>}
                  {photoError && (
                    <p className="photo-error" role="alert">{photoError}</p>
                  )}

                </div>

                {/* LOCATION */}
                <div className="form-field">

                  <label>
                    Location
                    <em>(Optional)</em>
                  </label>

                  <div className="location-picker">
                    <div className="location-box">
                      <div className="location-text">
                        <strong>
                          {coordinates ? "Current location selected" : "Choose your complaint location"}
                        </strong>
                        <span>
                          {coordinates
                            ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
                            : "Use your device location to center the map."}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="location-button"
                        onClick={useCurrentLocation}
                        disabled={locating}
                      >
                        {locating ? "Finding location..." : <><MapPin size={15} aria-hidden="true" /> Use Current Location</>}
                      </button>
                    </div>

                    <iframe
                      className="complaint-map"
                      title="Complaint location map"
                      src={mapUrl}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />

                    {locationError && (
                      <p className="location-error" role="alert">
                        {locationError}
                      </p>
                    )}
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
                  <span><Check size={16} aria-hidden="true" /></span>
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
                    disabled={loading || photoProcessing}
                  >
                    {loading
                      ? "Submitting..."
                      : "Submit Complaint"}

                    {!loading && <Send size={16} aria-hidden="true" />}
                  </button>

                </div>

              </form>

            </section>

            {/* RIGHT SIDE */}
            <aside className="complaint-help">

              <div className="help-card">

                <div className="help-heading">
                  <div><Megaphone size={20} aria-hidden="true" /></div>
                  <h2>What can you report?</h2>
                </div>

                <div className="report-item">
                  <div className="report-icon blue">
                    <CarFront size={20} aria-hidden="true" />
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
                    <Droplets size={20} aria-hidden="true" />
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
                    <Zap size={20} aria-hidden="true" />
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
                    <Trash2 size={16} aria-hidden="true" />
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
                    <Sparkles size={20} aria-hidden="true" />
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
                  <Building2 size={48} aria-hidden="true" />
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