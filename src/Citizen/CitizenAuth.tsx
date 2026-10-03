import React, { useState } from "react";
import { API_BASE_URL } from "../api";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import smartCityMark from "../assets/smart-city-mark.svg";
import "./CitizenAuth.css";

type Mode = "login" | "register";

function CitizenAuth() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      const response = await fetch(
        `${API_BASE_URL}/api/citizens/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (typeof data.token !== "string" || !data.token) {
        throw new Error("Login response did not include an authentication token.");
      }

      localStorage.setItem("citizen_token", data.token);
      localStorage.setItem(
        "citizen",
        JSON.stringify(data.citizen || data)
      );

      setMessage("Login successful!");

      window.location.href = "/citizen-portal";

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

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/citizens/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registerForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      setMessage(
        "Registration submitted successfully. Please wait for admin approval."
      );

      setRegisterForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        area: "Central City",
      });

      setTimeout(() => {
        setMode("login");
        setMessage(
          "Your account is pending admin approval."
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

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError("");
    setMessage("");
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

                  <button
                    type="button"
                    className="forgot-password"
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


                  <div className="auth-form-group">

                    <label>Password</label>

                    <div className="auth-input-wrapper">
                      <span className="input-icon">
                        <LockKeyhole size={16} aria-hidden="true" />
                      </span>

                      <input
                        type="password"
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
                    </div>

                  </div>


                  <div className="auth-form-group">

                    <label>Area</label>

                    <div className="auth-input-wrapper select-wrapper">
                      <span className="input-icon">
                        <MapPin size={16} aria-hidden="true" />
                      </span>

                      <select
                        value={registerForm.area}
                        onChange={(e) =>
                          setRegisterForm({
                            ...registerForm,
                            area: e.target.value,
                          })
                        }
                      >
                        <option>Central City</option>
                        <option>North District</option>
                        <option>South District</option>
                        <option>East Zone</option>
                        <option>West Zone</option>
                      </select>
                    </div>

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

    </div>
  );
}

export default CitizenAuth;