import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CitizenNavbar, CitizenSidebar } from "./CitizenNavigation";
import "./Citizenportal.css";
import "./MyProfile.css";

const MyProfile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [citizen] = useState(() => {
    try {
      const saved = localStorage.getItem("citizen");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const profileImageKey = `citizen-profile-image-${citizen?.citizen_id || "current"}`;
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem(profileImageKey);
    } catch {
      return null;
    }
  });

  const [formData, setFormData] = useState({
    name: "Muhammad Mahad Rafiq",
    email: "muhammadmahad2021@gmail.com",
    phone: "03333333333",
    area: "South District",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");

  const handleNavigation = (label: string) => {
    if (label === "My Profile") return;

    if (label === "Logout") {
      localStorage.removeItem("citizen");
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

  const handleSaveProfile = () => {
    setMessage("Profile information saved successfully.");

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const handleChangePassword = () => {
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

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setMessage("Password changed successfully.");

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
          <span>✓</span>
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
                  MR
                </div>
              )}

              <button
                type="button"
                className="photo-edit-button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                ✎
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
              {formData.name}
            </h3>

            <p>
              Citizen ID: CIT-10007
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
            🔐
          </div>

        </div>

        <div className="password-content">

          <div className="form-group">

            <label>
              Current Password
            </label>

            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter current password"
            />

          </div>

          <div className="form-row">

            <div className="form-group">

              <label>
                New Password
              </label>

              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
              />

            </div>

            <div className="form-group">

              <label>
                Confirm New Password
              </label>

              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
              />

            </div>

          </div>

          <div className="password-rules">

            <strong>Password requirements</strong>

            <div>
              ✓ At least 6 characters
            </div>

            <div>
              ✓ Use a combination of letters and numbers
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
            ● Active
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