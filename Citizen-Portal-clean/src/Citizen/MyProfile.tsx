import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Camera, Check, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { CitizenNavbar, CitizenSidebar } from "./CitizenNavigation";
import { API_BASE_URL } from "../api";
import "./Citizenportal.css";
import "./MyProfile.css";

const MyProfile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [citizen, setCitizen] = useState(() => {
    try {
      const saved = localStorage.getItem("citizen") || localStorage.getItem("citizen_data");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const profileImageKey = `citizen-profile-image-${citizen?.citizen_id || citizen?.id || "current"}`;
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem(profileImageKey);
    } catch {
      return null;
    }
  });

  const [formData, setFormData] = useState({
    name: citizen?.name || "",
    email: citizen?.email || "",
    phone: citizen?.phone || "",
    area: citizen?.area || "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("citizen_token");
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/citizens/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setCitizen(data);
            setFormData({
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              area: data.area || "",
            });
            localStorage.setItem("citizen", JSON.stringify(data));
            localStorage.setItem("citizen_data", JSON.stringify(data));
            return;
          }
        } catch (err) {
          console.error("Failed to load live profile:", err);
        }
      }

      // Fallback to localStorage
      try {
        const saved = localStorage.getItem("citizen") || localStorage.getItem("citizen_data");
        if (saved) {
          const parsed = JSON.parse(saved);
          setCitizen(parsed);
          setFormData({
            name: parsed.name || "",
            email: parsed.email || "",
            phone: parsed.phone || "",
            area: parsed.area || "",
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadProfile();
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "C";
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "C";
  };

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");

  const handleNavigation = (label: string) => {
    if (label === "My Profile") return;

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

    if (label === "Emergency") {
      navigate("/citizen-emergency");
      return;
    }

    if (label === "Notifications") {
      navigate("/citizen-notifications");
      return;
    }

    navigate("/citizen-portal");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setPasswordData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image size should be less than 2MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setMessage("Unable to read the selected image.");
        return;
      }

      try {
        localStorage.setItem(profileImageKey, reader.result);
        setProfileImage(reader.result);
        setMessage("Profile photo saved in this browser.");
      } catch {
        setMessage("Unable to save the photo. Try a smaller image.");
      }
    };

    reader.onerror = () => {
      setMessage("Unable to read the selected image.");
    };

    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setProfileImage(null);

    try {
      localStorage.removeItem(profileImageKey);
    } catch {
      setMessage("Unable to remove the saved photo from this browser.");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("citizen_token");
    try {
      if (token) {
        const res = await fetch(`${API_BASE_URL}/api/citizens/me`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to update profile");
        }
        if (data.citizen) {
          setCitizen(data.citizen);
          localStorage.setItem("citizen", JSON.stringify(data.citizen));
          localStorage.setItem("citizen_data", JSON.stringify(data.citizen));
        }
      } else {
        const updated = { ...citizen, ...formData };
        setCitizen(updated);
        localStorage.setItem("citizen", JSON.stringify(updated));
        localStorage.setItem("citizen_data", JSON.stringify(updated));
      }

      setMessage("Profile information saved successfully.");
    } catch (err: any) {
      setMessage(err.message || "Failed to update profile.");
    }

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const handleChangePassword = async () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setMessage("Please fill all password fields.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage(
        "New password must contain at least 6 characters."
      );
      return;
    }

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      setMessage("New password and confirm password do not match.");
      return;
    }

    const token = localStorage.getItem("citizen_token");
    try {
      if (token) {
        const res = await fetch(`${API_BASE_URL}/api/citizens/me/password`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to change password");
        }
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setMessage("Password changed successfully.");
    } catch (err: any) {
      setMessage(err.message || "Failed to change password.");
    }

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  return (
    <div className="citizen-dashboard">
      <CitizenSidebar
        activeItem="My Profile"
        onNavigate={handleNavigation}
      />

      <main className="dashboard-main">
        <CitizenNavbar
          citizenName={citizen?.name || "Citizen"}
          profileImage={profileImage}
        />

        <div className="dashboard-content">
          <div className="profile-page">

      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div className="profile-page-header">

        <div>
          <h1>My Profile</h1>

          <p>
            Manage your personal information and account settings.
          </p>
        </div>

        <div className="account-status">
          <span className="status-dot"></span>
          Account Active
        </div>

      </div>

      {/* =========================================
          SUCCESS / ERROR MESSAGE
      ========================================= */}

      {message && (
        <div className="profile-message">
          <Check size={16} aria-hidden="true" />
          {message}
        </div>
      )}

      {/* =========================================
          PROFILE CARD
      ========================================= */}

      <section className="profile-card">

        <div className="profile-card-header">
          <div>
            <h2>Profile Information</h2>
            <p>
              Update your personal information and profile photo.
            </p>
          </div>
        </div>

        <div className="profile-content">

          {/* PROFILE PHOTO */}

          <div className="profile-photo-section">

            <div className="profile-photo-wrapper">

              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="profile-photo"
                />
              ) : (
                <div className="profile-photo-placeholder">
                  {getInitials(formData.name || citizen?.name)}
                </div>
              )}

              <button
                type="button"
                className="photo-edit-button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <Camera size={16} aria-hidden="true" />
              </button>

            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />

            <h3>
              {formData.name || "Citizen"}
            </h3>

            <p>
              Citizen ID: {citizen?.citizen_id || "CIT-00000"}
            </p>

            <div className="photo-buttons">

              <button
                type="button"
                className="upload-photo-button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                Upload Photo
              </button>

              {profileImage && (
                <button
                  type="button"
                  className="remove-photo-button"
                  onClick={removePhoto}
                >
                  Remove
                </button>
              )}

            </div>

            <span className="photo-help">
              JPG or PNG • Maximum 2MB
            </span>

          </div>

          {/* PERSONAL INFORMATION */}

          <div className="profile-form">

            <div className="form-row">

              <div className="form-group">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />

              </div>

              <div className="form-group">

                <label>
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />

              </div>

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Phone Number
                </label>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />

              </div>

              <div className="form-group">

                <label>
                  Area / District
                </label>

                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Enter your area"
                />

              </div>

            </div>

            <div className="form-group">

              <label>
                Citizen ID
              </label>

              <input
                type="text"
                value="CIT-10007"
                disabled
              />

              <small>
                Citizen ID cannot be changed.
              </small>

            </div>

            <div className="profile-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() => window.location.reload()}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-button"
                onClick={handleSaveProfile}
              >
                Save Changes
              </button>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================
          PASSWORD CARD
      ========================================= */}

      <section className="profile-card password-card">

        <div className="profile-card-header">

          <div>

            <h2>Change Password</h2>

            <p>
              Keep your account secure by using a strong password.
            </p>

          </div>

          <div className="security-icon">
            <LockKeyhole size={22} aria-hidden="true" />
          </div>

        </div>

        <div className="password-content">

          <div className="form-group">

            <label>
              Current Password
            </label>

            <div className="profile-password-wrapper">
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Enter current password"
              />
              <button
                type="button"
                className="profile-password-toggle"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

          </div>

          <div className="form-row">

            <div className="form-group">

              <label>
                New Password
              </label>

              <div className="profile-password-wrapper">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="profile-password-toggle"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

            </div>

            <div className="form-group">

              <label>
                Confirm New Password
              </label>

              <div className="profile-password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="profile-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

            </div>

          </div>

          <div className="password-rules">

            <strong>Password requirements</strong>

            <div>
              <Check size={14} aria-hidden="true" /> At least 6 characters
            </div>

            <div>
              <Check size={14} aria-hidden="true" /> Use a combination of letters and numbers
            </div>

          </div>

          <div className="password-actions">

            <button
              type="button"
              className="save-password-button"
              onClick={handleChangePassword}
            >
              Change Password
            </button>

          </div>

        </div>

      </section>

      {/* =========================================
          ACCOUNT INFORMATION
      ========================================= */}

      <section className="account-info-card">

        <div>
          <strong>Account Status</strong>
          <span className="active-text">
            <BadgeCheck size={15} aria-hidden="true" /> Active
          </span>
        </div>

        <div>
          <strong>Member Since</strong>
          <span>
            September 2026
          </span>
        </div>

        <div>
          <strong>Account Type</strong>
          <span>
            Citizen
          </span>
        </div>

      </section>

          </div>
        </div>
      </main>
    </div>
  );
};

export default MyProfile;