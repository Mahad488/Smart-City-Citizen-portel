import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../api";
import {
  ArrowRight,
  Check,
  CircleAlert,
  LockKeyhole,
  Mail,
  MapPin,
  Navigation,
  Phone,
  UserRound,
} from "lucide-react";
import smartCityMark from "../assets/smart-city-mark.svg";
import "./CitizenAuth.css";

type Mode = "login" | "register";

declare global {
  interface Window {
    google?: any;
  }
}

function CitizenAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

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
    area: "",
  });

  // Load Google Identity Script
  useEffect(() => {
    if (!window.google?.accounts?.id) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // =========================
  // GEOLOCATION API HANDLER
  // =========================

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setFetchingLocation(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Free OpenStreetMap Reverse Geocoding API
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );

          const data = await res.json();

          if (data && data.address) {
            const detectedArea =
              data.address.suburb ||
              data.address.neighbourhood ||
              data.address.city_district ||
              data.address.town ||
              data.address.city ||
              data.address.county ||
              "Current Location";

            setRegisterForm((prev) => ({
              ...prev,
              area: detectedArea,
            }));
            setMessage(`Location detected: ${detectedArea}`);
          } else {
            setRegisterForm((prev) => ({
              ...prev,
              area: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            }));
          }
        } catch (err) {
          setError("Failed to fetch address details. Please enter area manually.");
        } finally {
          setFetchingLocation(false);
        }
      },
      (geoError) => {
        setFetchingLocation(false);
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setError("Location permission denied. Please enter area manually.");
            break;
          case geoError.POSITION_UNAVAILABLE:
            setError("Location information is unavailable.");
            break;
          case geoError.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("An unknown error occurred while fetching location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // =========================
  // GOOGLE SIGN-IN HANDLER
  // =========================

  const handleGoogleCallback = async (response: any) => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/citizens/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Google authentication failed.");
      }

      if (typeof data.token !== "string" || !data.token) {
        throw new Error("Login response did not include an authentication token.");
      }

      localStorage.setItem("citizen_token", data.token);
      localStorage.setItem("citizen", JSON.stringify(data.citizen || data));

      setMessage("Google Login successful!");

      const redirectTo = searchParams.get("redirectTo");
      const statePath = location.state?.from?.pathname;
      const requestedPath = redirectTo || statePath;
      const destination =
        typeof requestedPath === "string" &&
        requestedPath.startsWith("/") &&
        !requestedPath.startsWith("//") &&
        !requestedPath.startsWith("/login") &&
        !requestedPath.startsWith("/citizen-login")
          ? requestedPath
          : "/citizen-portal";

      window.scrollTo(0, 0);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    console.log("Env Client ID:", clientId);

    if (!clientId) {
      setError(`Google Client ID missing! Env value is: "${clientId}"`);
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback,
      });
      window.google.accounts.id.prompt();
    } else {
      setError("Google SDK loading... please try again in 2 seconds.");
    }
  };

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/citizens/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (typeof data.token !== "string" || !data.token) {
        throw new Error("Login response did not include an authentication token.");
      }

      localStorage.setItem("citizen_token", data.token);
      localStorage.setItem("citizen", JSON.stringify(data.citizen || data));

      setMessage("Login successful!");

      const redirectTo = searchParams.get("redirectTo");
      const statePath = location.state?.from?.pathname;
      const requestedPath = redirectTo || statePath;
      const destination =
        typeof requestedPath === "string" &&
        requestedPath.startsWith("/") &&
        !requestedPath.startsWith("//") &&
        !requestedPath.startsWith("/login") &&
        !requestedPath.startsWith("/citizen-login")
          ? requestedPath
          : "/citizen-portal";

      window.scrollTo(0, 0);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // REGISTER
  // =========================

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
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

    if (
      registerForm.password.length < 6 ||
      !/[A-Z]/.test(registerForm.password) ||
      !/[^A-Za-z0-9]/.test(registerForm.password)
    ) {
      setError(
        "Password must be at least 6 characters and include an uppercase letter and a special character."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/citizens/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setMessage("Registration successful. Your account is now active.");

      setRegisterForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        area: "",
      });

      setTimeout(() => {
        setMode("login");
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setMessage("");
  };

  const renderGoogleButton = (text: string) => (
    <button
      type="button"
      onClick={handleGoogleLoginClick}
      style={{
        width: "100%",
        height: "44px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        border: "1px solid #dadce0",
        borderRadius: "6px",
        backgroundColor: "#ffffff",
        color: "#3c4043",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        margin: "12px 0 20px 0",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.617z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.458 2.016.957 4.958l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z"
        />
      </svg>
      {text}
    </button>
  );

  return (
    <div className="citizen-auth-page">
      <div className="citizen-auth-layout">
        {/* LEFT BRAND PANEL */}
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <img
              className="auth-logo-large"
              src={smartCityMark}
              alt="Smart City logo"
            />

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
              Connect with your city, report civic issues, track complaints and
              stay informed about important city services.
            </p>

            <div className="auth-features">
              <div className="auth-feature">
                <div>
                  <Check size={16} aria-hidden="true" />
                </div>
                <span>Report civic issues easily</span>
              </div>

              <div className="auth-feature">
                <div>
                  <Check size={16} aria-hidden="true" />
                </div>
                <span>Track complaint progress</span>
              </div>

              <div className="auth-feature">
                <div>
                  <Check size={16} aria-hidden="true" />
                </div>
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

        {/* RIGHT AUTH PANEL */}
        <div className="auth-form-panel">
          <div className="citizen-auth-card">
            <div className="citizen-auth-header">
              <img
                className="citizen-auth-logo"
                src={smartCityMark}
                alt="Smart City logo"
              />

              <h1>{mode === "login" ? "Welcome Back" : "Create Account"}</h1>

              <p>
                {mode === "login"
                  ? "Sign in to your Citizen Portal"
                  : "Join your Smart City community"}
              </p>
            </div>

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
                className={mode === "register" ? "active" : ""}
                onClick={() => switchMode("register")}
              >
                Register
              </button>
            </div>

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

            {/* LOGIN MODE */}
            {mode === "login" && (
              <>
                <form onSubmit={handleLogin} className="citizen-auth-form">
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
                        type="password"
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
                    </div>
                  </div>

                  <div className="auth-extra-row">
                    <label className="remember-me">
                      <input type="checkbox" />
                      <span>Remember me</span>
                    </label>

                    <button type="button" className="forgot-password">
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
                </form>

                {renderGoogleButton("Continue with Google")}

                <p className="auth-switch-text" style={{ textAlign: "center" }}>
                  Don't have an account?{" "}
                  <button type="button" onClick={() => switchMode("register")}>
                    Register here
                  </button>
                </p>
              </>
            )}

            {/* REGISTER MODE */}
            {mode === "register" && (
              <>
                <form onSubmit={handleRegister} className="citizen-auth-form">
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

                    <div className="auth-form-group">
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

                    <div className="auth-form-group">
                      <label>Phone</label>
                      <div className="auth-input-wrapper">
                        <span className="input-icon">
                          <Phone size={16} aria-hidden="true" />
                        </span>
                        <input
                          type="text"
                          placeholder="+92 300 1234567"
                          value={registerForm.phone}
                          onChange={(e) =>
                            setRegisterForm({
                              ...registerForm,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="auth-form-group full">
                      <label>Password</label>
                      <div className="auth-input-wrapper register-password-wrapper">
                        <span className="input-icon">
                          <LockKeyhole size={16} aria-hidden="true" />
                        </span>
                        <input
                          type="password"
                          placeholder="Create a password"
                          value={registerForm.password}
                          required
                          minLength={6}
                          pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{6,}"
                          title="Use at least 6 characters, including an uppercase letter and a special character."
                          onChange={(e) =>
                            setRegisterForm({
                              ...registerForm,
                              password: e.target.value,
                            })
                          }
                        />
                      </div>
                      <small className="auth-field-hint">
                        At least 6 characters, including one uppercase letter
                        and one special character.
                      </small>
                    </div>

                    <div className="auth-form-group full">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "6px",
                        }}
                      >
                        <label style={{ margin: 0 }}>Area / Location</label>
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          disabled={fetchingLocation}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: 0,
                          }}
                        >
                          <Navigation size={12} />
                          {fetchingLocation ? "Detecting..." : "Use my location"}
                        </button>
                      </div>

                      <div className="auth-input-wrapper">
                        <span className="input-icon">
                          <MapPin size={16} aria-hidden="true" />
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. Central City or click Use my location"
                          value={registerForm.area}
                          required
                          onChange={(e) =>
                            setRegisterForm({
                              ...registerForm,
                              area: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="citizen-auth-submit"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Citizen Account"}
                  </button>

                  <div className="auth-divider" style={{ marginTop: "16px" }}>
                    <span>OR</span>
                  </div>
                </form>

                {renderGoogleButton("Sign up with Google")}

                <p className="auth-switch-text" style={{ textAlign: "center" }}>
                  Already registered?{" "}
                  <button type="button" onClick={() => switchMode("login")}>
                    Login
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CitizenAuth;