import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../api";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Navigation,
  Phone,
  UserRound,
} from "lucide-react";
import smartCityMark from "../assets/smart-city-mark.svg";
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [countryCode, setCountryCode] = useState("+92");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [googleSdkLoaded, setGoogleSdkLoaded] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

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

  // Load Google Identity Services
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setGoogleSdkLoaded(true);
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    const handleLoad = () => setGoogleSdkLoaded(true);
    const handleError = () =>
      setError("Google Sign-In could not be loaded. Please refresh and try again.");

    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    return () => {
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
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

  const handleGoogleCallback = async (
    response: any,
    intent: "login" | "register",
  ) => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/citizens/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: response.credential,
          credential: response.credential,
          idToken: response.credential,
          intent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Google authentication failed.");
      }

      if (intent === "register") {
        setMessage(
          "Google account created successfully. Please continue with Google from the login tab."
        );
        setMode("login");
        return;
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

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google Client ID is missing from the frontend environment.");
      return;
    }

    const container = googleButtonRef.current;
    if (!googleSdkLoaded || !container || !window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) =>
        handleGoogleCallback(response, mode === "register" ? "register" : "login"),
      use_fedcm: false,
    });
    window.google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      text: mode === "register" ? "signup_with" : "signin_with",
      width: Math.max(200, Math.min(400, container.clientWidth || 280)),
    });

    return () => {
      container.replaceChildren();
    };
  }, [googleSdkLoaded, mode]);

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

    if (!registerForm.email.trim().toLowerCase().endsWith(".com")) {
      setError("Email address must end with .com.");
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

    const formattedPhone = phoneNumber.trim()
      ? `${countryCode} ${phoneNumber.trim().replace(/^0+/, "")}`
      : "";

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/citizens/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...registerForm,
          phone: formattedPhone,
        }),
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

                <div className="google-signin-container" ref={googleButtonRef} />

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
                      <div className="auth-input-wrapper register-password-wrapper">
                        <span className="input-icon">
                          <LockKeyhole size={16} aria-hidden="true" />
                        </span>
                        <input
                          type={showRegisterPassword ? "text" : "password"}
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

                <div className="google-signin-container" ref={googleButtonRef} />

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