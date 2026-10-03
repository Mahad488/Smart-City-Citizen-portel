import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Camera, Check, LockKeyhole } from "lucide-react";
import { changePassword, updateProfile } from "../api";
import { CitizenNavbar, CitizenSidebar } from "./CitizenNavigation";
import "./Citizenportal.css";
import "./MyProfile.css";

interface CitizenProfile {
  citizen_id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  area?: string | null;
}

const MyProfile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [citizen, setCitizen] = useState<CitizenProfile | null>(() => {
    try {
      const saved = localStorage.getItem("citizen");
      return saved ? JSON.parse(saved) as CitizenProfile : null;
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
    name: citizen?.name || "",
    email: citizen?.email || "",
    phone: citizen?.phone || "",
    area: citizen?.area || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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
    setMessage("");
    setSavingProfile(true);

    try {
      const response = await updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.area.trim(),
      });
      const updatedCitizen = response.citizen;
      setCitizen((previous) => ({
        ...previous,
        ...updatedCitizen,
      }));
      setFormData((previous) => ({
        ...previous,
        name: updatedCitizen.name,
        email: updatedCitizen.email,
        phone: updatedCitizen.phone || "",
        area: updatedCitizen.area || "",
      }));

      try {
        localStorage.setItem(
          "citizen",
          JSON.stringify({ ...citizen, ...updatedCitizen })
        );
      } catch (storageError) {
        console.error("Unable to refresh the locally cached profile:", storageError);
      }

      setMessage(response.message || "Profile updated successfully.");
      setMessageIsError(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update profile."
      );
      setMessageIsError(true);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setMessage("");
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setMessage("Please fill all password fields.");
      setMessageIsError(true);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage(
        "New password must contain at least 6 characters."
      );
      setMessageIsError(true);
      return;
    }

    if (new TextEncoder().encode(passwordData.newPassword).length > 72) {
      setMessage("New password must be no more than 72 bytes.");
      setMessageIsError(true);
      return;
    }

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      setMessage("New password and confirm password do not match.");
      setMessageIsError(true);
      return;
    }

    setChangingPassword(true);
    try {
      const response = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setMessage(response.message || "Password changed successfully.");
      setMessageIsError(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to change password."
      );
      setMessageIsError(true);
    } finally {
      setChangingPassword(false);
    }
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
        <div
          className={`profile-message${messageIsError ? " profile-message-error" : ""}`}
          role={messageIsError ? "alert" : "status"}
        >
          {!messageIsError && <Check size={16} aria-hidden="true" />}
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
              {formData.name}
            </h3>

            <p>
              Citizen ID: {citizen?.citizen_id || "—"}
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
                  readOnly
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
                  Address / District
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
                value={citizen?.citizen_id || ""}
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
                onClick={() => {
                  setFormData({
                    name: citizen?.name || "",
                    email: citizen?.email || "",
                    phone: citizen?.phone || "",
                    area: citizen?.area || "",
                  });
                  setMessage("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save Changes"}
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
              disabled={changingPassword}
            >
              {changingPassword ? "Changing..." : "Change Password"}
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