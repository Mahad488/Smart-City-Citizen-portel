import React, { useState, useEffect } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../api";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import smartCityMark from "../assets/smart-city-mark.svg";
import { reverseGeocodeCoordinates } from "../location";
import "./CitizenAuth.css";

const COUNTRY_CODES = [
  { code: "+92", label: "🇵🇰 +92 (PK)" },
  { code: "+971", label: "🇦🇪 +971 (UAE)" },
  { code: "+966", label: "🇸🇦 +966 (SA)" },
  { code: "+44", label: "🇬🇧 +44 (UK)" },
  { code: "+1", label: "🇺🇸 +1 (US)" },
  { code: "+974", label: "🇶🇦 +974 (QA)" },
  { code: "+968", label: "🇴🇲 +968 (OM)" },
  { code: "+965", label: "🇰🇼 +965 (KW)" },
  { code: "+973", label: "🇧🇭 +973 (BH)" },
  { code: "+90", label: "🇹🇷 +90 (TR)" },
  { code: "+49", label: "🇩🇪 +49 (DE)" },
  { code: "+61", label: "🇦🇺 +61 (AU)" },
  { code: "+91", label: "🇮🇳 +91 (IN)" },
  { code: "+880", label: "🇧🇩 +880 (BD)" },
  { code: "+60", label: "🇲🇾 +60 (MY)" },
  { code: "+65", label: "🇸🇬 +65 (SG)" },
  { code: "+86", label: "🇨🇳 +86 (CN)" },
];

type Mode = "login" | "register";

function CitizenAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [countryCode, setCountryCode] = useState("+92");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState(() =>
    searchParams.get("sessionExpired") === "1"
      ? "Your session expired. Please log in again to continue."
      : ""
  );

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    area: "Central City",
  });

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("remember_me") === "true";
  });

  const [showForgotModal, setShowForgotModal] = useState(() => {
    return Boolean(searchParams.get("resetToken") || searchParams.get("resetEmail"));
  });
  const [forgotTab, setForgotTab] = useState<"request" | "reset">(() => {
    return searchParams.get("resetToken") ? "reset" : "request";
  });
  const [forgotEmail, setForgotEmail] = useState(() => searchParams.get("resetEmail") || "");
  const [resetToken, setResetToken] = useState(() => searchParams.get("resetToken") || "");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail && !loginForm.email) {
      setLoginForm((prev) => ({ ...prev, email: savedEmail }));
    }
  }, []);

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem("remember_me", "true");
        localStorage.setItem("remembered_email", loginForm.email);
      } else {
        localStorage.removeItem("remember_me");
        localStorage.removeItem("remembered_email");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/citizens/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...loginForm,
            rememberMe,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.token) {
        localStorage.setItem("citizen_token", data.token);
      }

      localStorage.setItem(
        "citizen",
        JSON.stringify(data.citizen || data)
      );

      setMessage("Login successful!");

      const redirectTo = searchParams.get("redirectTo");
      const destination =
        redirectTo?.startsWith("/") &&
        !redirectTo.startsWith("//") &&
        !redirectTo.startsWith("/citizen-login")
          ? redirectTo
          : "/citizen-portal";

      navigate(destination, { replace: true });

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // GOOGLE LOGIN
  // =========================

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/citizens/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Google login failed");
      }

      localStorage.setItem("citizen_token", data.token);
      localStorage.setItem("citizen", JSON.stringify(data.citizen));
      localStorage.setItem("citizen_data", JSON.stringify(data.citizen));

      setMessage("Google login successful!");

      const redirectTo = searchParams.get("redirectTo");
      const destination =
        redirectTo?.startsWith("/") &&
        !redirectTo.startsWith("//") &&
        !redirectTo.startsWith("/citizen-login")
          ? redirectTo
          : "/citizen-portal";

      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");
    setForgotLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/citizens/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to process request");
      setForgotMessage(data.message);
    } catch (err: any) {
      setForgotError(err.message || "Failed to send reset instructions");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotMessage("");

    if (resetPassword.length < 6) {
      setForgotError("Password must be at least 6 characters");
      return;
    }
    if (resetPassword !== resetConfirmPassword) {
      setForgotError("Passwords do not match");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/citizens/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          token: resetToken,
          newPassword: resetPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");
      setForgotMessage(data.message);
      setTimeout(() => {
        setShowForgotModal(false);
        setMessage("Password reset successfully! Please log in.");
      }, 2500);
    } catch (err: any) {
      setForgotError(err.message || "Failed to reset password");
    } finally {
      setForgotLoading(false);
    }
  };

  // =========================
  // REGISTER
  // =========================

  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (
      !registerForm.name ||
      !registerForm.email ||
      !registerForm.password
    ) {
      setError("Name, email and password are required");
      return;
    }

    setLoading(true);

    const formattedPhone = phoneNumber.trim()
      ? `${countryCode} ${phoneNumber.trim().replace(/^0+/, "")}`
      : "";

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/citizens/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...registerForm,
            phone: formattedPhone,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      setMessage(
        data.message || "Registration successful! You can now log in."
      );

      const registeredEmail = registerForm.email;

      setRegisterForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        area: "Central City",
      });
      setPhoneNumber("");
      setCountryCode("+92");
      setLocationError("");

      if (registeredEmail) {
        setLoginForm((prev) => ({
          ...prev,
          email: registeredEmail,
        }));
      }

      setTimeout(() => {
        setMode("login");
        setMessage(
          "Registration successful! Please log in with your credentials."
        );
      }, 1500);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed"
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
      async ({ coords }) => {
        const lat = coords.latitude;
        const lon = coords.longitude;

        try {
          const address = await reverseGeocodeCoordinates(lat, lon);
          setRegisterForm((prev) => ({
            ...prev,
            area: address,
          }));
        } catch (err) {
          console.error("Location lookup error:", err);
          setRegisterForm((prev) => ({
            ...prev,
            area: `Lat ${lat.toFixed(4)}, Lng ${lon.toFixed(4)}`,
          }));
          setLocationError("Could not fetch full street address. Coordinates added instead.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Allow location access in your browser to detect your current location."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Your device could not determine a location. Please enable location services."
              : "Location request timed out. Please try again."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setMessage("");
    setLocationError("");
  };

  return (
    <div className="citizen-auth-page">

      {/* BACK TO HOME */}
      <div className="citizen-auth-layout">

        {/* =========================
            LEFT BRAND PANEL
        ========================== */}

        <div className="auth-brand-panel">

          <div className="auth-brand-content">

            <img className="auth-logo-large" src={smartCityMark} alt="Smart City logo" />

            <div className="auth-brand-title">
              <span>SMART CITY</span>
              <small>Citizen Portal</small>
            </div>

            <div className="auth-brand-line" />

            <h2>
              Your city.
              <br />
              Your voice.
              <br />
              <span>Your impact.</span>
            </h2>

            <p>
              Connect with your city, report civic issues,
              track complaints and stay informed about
              important city services.
            </p>

            <div className="auth-features">

              <div className="auth-feature">
                <div><Check size={16} aria-hidden="true" /></div>
                <span>Report civic issues easily</span>
              </div>

              <div className="auth-feature">
                <div><Check size={16} aria-hidden="true" /></div>
                <span>Track complaint progress</span>
              </div>

              <div className="auth-feature">
                <div><Check size={16} aria-hidden="true" /></div>
                <span>Receive city notifications</span>
              </div>

            </div>

          </div>

          <div className="auth-city-decoration">
            <div className="city-building building-one" />
            <div className="city-building building-two" />
            <div className="city-building building-three" />
            <div className="city-building building-four" />
            <div className="city-building building-five" />
          </div>

        </div>


        {/* =========================
            RIGHT AUTH PANEL
        ========================== */}

        <div className="auth-form-panel">

          <div className="citizen-auth-card">

            {/* HEADER */}

            <div className="citizen-auth-header">

              <img className="citizen-auth-logo" src={smartCityMark} alt="Smart City logo" />

              <h1>
                {mode === "login"
                  ? "Welcome Back"
                  : "Create Account"}
              </h1>

              <p>
                {mode === "login"
                  ? "Sign in to your Citizen Portal"
                  : "Join your Smart City community"}
              </p>

            </div>


            {/* TABS */}

            <div className="citizen-auth-tabs">

              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => switchMode("login")}
              >
                Login
              </button>

              <button
                type="button"
                className={
                  mode === "register" ? "active" : ""
                }
                onClick={() => switchMode("register")}
              >
                Register
              </button>

            </div>


            {/* MESSAGE */}

            {message && (
              <div className="citizen-auth-success">
                <Check size={16} aria-hidden="true" />
                {message}
              </div>
            )}

            {error && (
              <div className="citizen-auth-error">
                <CircleAlert size={16} aria-hidden="true" />
                {error}
              </div>
            )}


            {/* =========================
                LOGIN
            ========================== */}

            {mode === "login" && (

              <form
                onSubmit={handleLogin}
                className="citizen-auth-form"
              >

                <div className="auth-form-group">

                  <label>Email Address</label>

                  <div className="auth-input-wrapper">
                    <span className="input-icon">
                      <Mail size={16} aria-hidden="true" />
                    </span>

                    <input
                      type="email"
                      placeholder="citizen@email.com"
                      value={loginForm.email}
                      required
                      onChange={(e) =>
                        setLoginForm({
                          ...loginForm,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>

                </div>


                <div className="auth-form-group">

                  <label>Password</label>

                  <div className="auth-input-wrapper">
                    <span className="input-icon">
                      <LockKeyhole size={16} aria-hidden="true" />
                    </span>

                    <input
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginForm.password}
                      required
                      onChange={(e) =>
                        setLoginForm({
                          ...loginForm,
                          password: e.target.value,
                        })
                      }
                    />

                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                </div>


                <div className="auth-extra-row">

                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    className="forgot-password"
                    onClick={() => {
                      setForgotEmail(loginForm.email || "");
                      setForgotError("");
                      setForgotMessage("");
                      setShowForgotModal(true);
                    }}
                  >
                    Forgot password?
                  </button>

                </div>


                <button
                  type="submit"
                  className="citizen-auth-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="button-loader" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Login to Citizen Portal
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>


                <div className="auth-divider">
                  <span>OR</span>
                </div>

                <div className="google-auth-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google Login Failed")}
                    theme="filled_blue"
                    shape="pill"
                    text="continue_with"
                    width="300"
                  />
                </div>


                <p className="auth-switch-text">
                  Don't have an account?{" "}

                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                  >
                    Register here
                  </button>
                </p>

              </form>
            )}


            {/* =========================
                REGISTER
            ========================== */}

            {mode === "register" && (

              <form
                onSubmit={handleRegister}
                className="citizen-auth-form"
              >

                <div className="register-grid">

                  <div className="auth-form-group full">

                    <label>Full Name</label>

                    <div className="auth-input-wrapper">
                      <span className="input-icon">
                        <UserRound size={16} aria-hidden="true" />
                      </span>

                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={registerForm.name}
                        required
                        onChange={(e) =>
                          setRegisterForm({
                            ...registerForm,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                  </div>


                  <div className="auth-form-group full">

                    <label>Email Address</label>

                    <div className="auth-input-wrapper">
                      <span className="input-icon">
                        <Mail size={16} aria-hidden="true" />
                      </span>

                      <input
                        type="email"
                        placeholder="citizen@email.com"
                        value={registerForm.email}
                        required
                        onChange={(e) =>
                          setRegisterForm({
                            ...registerForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>

                  </div>


                  <div className="auth-form-group full">

                    <label>Phone / Contact Number</label>

                    <div className="auth-input-wrapper auth-phone-input-wrapper">
                      <div className="phone-country-select-wrapper">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="phone-country-select"
                          aria-label="Country Code"
                        >
                          {COUNTRY_CODES.map((item, idx) => (
                            <option key={`${item.code}-${idx}`} value={item.code}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <input
                        type="tel"
                        placeholder="300 1234567"
                        value={phoneNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9\s-]/g, "");
                          setPhoneNumber(val);
                        }}
                        className="phone-number-field"
                      />
                    </div>

                  </div>


                  <div className="auth-form-group full">

                    <label>Password</label>

                    <div className="auth-input-wrapper">
                      <span className="input-icon">
                        <LockKeyhole size={16} aria-hidden="true" />
                      </span>

                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={registerForm.password}
                        required
                        minLength={6}
                        onChange={(e) =>
                          setRegisterForm({
                            ...registerForm,
                            password: e.target.value,
                          })
                        }
                      />

                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowRegisterPassword((prev) => !prev)}
                        aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                  </div>


                  <div className="auth-form-group full">

                    <label>Area / Location</label>

                    <div className="auth-location-control">
                      <div className="auth-input-wrapper">
                        <span className="input-icon">
                          <MapPin size={16} aria-hidden="true" />
                        </span>

                        <input
                          type="text"
                          list="suggested-areas"
                          placeholder="Enter your area or use current location"
                          value={registerForm.area}
                          required
                          onChange={(e) => {
                            setRegisterForm({
                              ...registerForm,
                              area: e.target.value,
                            });
                            setLocationError("");
                          }}
                        />

                        <datalist id="suggested-areas">
                          <option value="Central City" />
                          <option value="North District" />
                          <option value="South District" />
                          <option value="East Zone" />
                          <option value="West Zone" />
                        </datalist>
                      </div>

                      <button
                        type="button"
                        className="auth-location-btn"
                        onClick={useCurrentLocation}
                        disabled={locating}
                        title="Detect and use my current location"
                      >
                        {locating ? (
                          <>
                            <Loader2 size={15} className="auth-spin" aria-hidden="true" />
                            <span>Locating...</span>
                          </>
                        ) : (
                          <>
                            <MapPin size={15} aria-hidden="true" />
                            <span>Use My Location</span>
                          </>
                        )}
                      </button>
                    </div>

                    {locationError && (
                      <p className="auth-location-error" role="alert">
                        {locationError}
                      </p>
                    )}

                  </div>

                </div>


                <button
                  type="submit"
                  className="citizen-auth-submit"
                  disabled={loading}
                >
                  {loading
                    ? "Creating account..."
                    : "Create Citizen Account"}
                </button>

                <div className="auth-divider" style={{ marginTop: '20px' }}>
                  <span>OR</span>
                </div>

                <div className="google-auth-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '20px' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google Login Failed")}
                    theme="filled_blue"
                    shape="pill"
                    text="signup_with"
                    width="300"
                  />
                </div>


                <div className="auth-note">
                  <Info size={16} aria-hidden="true" />

                  <p>
                    Your account will remain pending until
                    an administrator approves it.
                  </p>
                </div>


                <p className="auth-switch-text">
                  Already registered?{" "}

                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                  >
                    Login
                  </button>
                </p>

              </form>
            )}

          </div>

        </div>

      </div>

      {showForgotModal && (
        <div className="auth-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <h3>Account Password Recovery</h3>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div className="auth-modal-body">
              <div className="auth-modal-tabs">
                <button
                  type="button"
                  className={`auth-modal-tab ${forgotTab === "request" ? "active" : ""}`}
                  onClick={() => { setForgotTab("request"); setForgotError(""); setForgotMessage(""); }}
                >
                  1. Request Reset
                </button>
                <button
                  type="button"
                  className={`auth-modal-tab ${forgotTab === "reset" ? "active" : ""}`}
                  onClick={() => { setForgotTab("reset"); setForgotError(""); setForgotMessage(""); }}
                >
                  2. Enter Code & New Password
                </button>
              </div>

              {forgotMessage && (
                <div className="citizen-auth-success">
                  <Check size={16} />
                  <span>{forgotMessage}</span>
                </div>
              )}

              {forgotError && (
                <div className="citizen-auth-error">
                  <CircleAlert size={16} />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotTab === "request" ? (
                <form onSubmit={handleRequestReset}>
                  <p style={{ marginBottom: "12px" }}>
                    Enter your registered email address and we will email you a secure one-time reset code.
                  </p>
                  <div className="auth-form-group">
                    <label>Registered Email</label>
                    <input
                      type="email"
                      required
                      placeholder="citizen@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="citizen-auth-submit"
                    style={{ marginTop: "16px" }}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "Sending Instructions..." : "Send Reset Code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <div className="auth-form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>

                  <div className="auth-form-group" style={{ marginTop: "12px" }}>
                    <label>Reset Code / Token</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter 64-char code from email"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                    />
                  </div>

                  <div className="auth-form-group" style={{ marginTop: "12px" }}>
                    <label>New Password (min 6 chars)</label>
                    <input
                      type="password"
                      required
                      placeholder="New secure password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                  </div>

                  <div className="auth-form-group" style={{ marginTop: "12px" }}>
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Re-type new password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="citizen-auth-submit"
                    style={{ marginTop: "16px" }}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? "Resetting Password..." : "Update Password"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default CitizenAuth;