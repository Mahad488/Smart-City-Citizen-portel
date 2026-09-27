import React, { useState } from "react";
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
  // CITIZEN LOGIN
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
        "https://smart-city-production-c48b.up.railway.app/api/citizens/login",
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
        throw new Error(
          data.message || "Login failed"
        );
      }

      // Save citizen session
      localStorage.setItem(
        "citizen",
        JSON.stringify(data.citizen || data)
      );

      setMessage("Login successful!");

      // Open citizen portal
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
  // CITIZEN REGISTER
  // =========================

  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      setError("Name, email and password are required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "https://smart-city-production-c48b.up.railway.app/api/citizens/register",
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

      // Clear form
      setRegisterForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        area: "Central City",
      });

      // Switch to login
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

  return (
    <div className="citizen-auth-page">

      <div className="citizen-auth-card">

        {/* HEADER */}

        <div className="citizen-auth-header">

          <div className="citizen-auth-logo">
            SC
          </div>

          <h1>Smart City</h1>

          <p>
            Citizen Portal
          </p>

        </div>

        {/* TABS */}

        <div className="citizen-auth-tabs">

          <button
            className={
              mode === "login"
                ? "active"
                : ""
            }
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
          >
            Login
          </button>

          <button
            className={
              mode === "register"
                ? "active"
                : ""
            }
            onClick={() => {
              setMode("register");
              setError("");
              setMessage("");
            }}
          >
            Register
          </button>

        </div>

        {/* MESSAGE */}

        {message && (
          <div className="citizen-auth-success">
            {message}
          </div>
        )}

        {error && (
          <div className="citizen-auth-error">
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

              <label>Email</label>

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

            <div className="auth-form-group">

              <label>Password</label>

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

            <button
              type="submit"
              className="citizen-auth-submit"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Login"}
            </button>

            <p className="auth-switch-text">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setMessage("");
                }}
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

            <div className="auth-form-group">

              <label>Full Name</label>

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

            <div className="auth-form-group">

              <label>Email</label>

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

            <div className="auth-form-group">

              <label>Password</label>

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

            <div className="auth-form-group">

              <label>Phone</label>

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

            <div className="auth-form-group">

              <label>Area</label>

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

            <button
              type="submit"
              className="citizen-auth-submit"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : "Create Citizen Account"}
            </button>

            <p className="auth-note">
              Your account will remain pending until an
              administrator approves it.
            </p>

            <p className="auth-switch-text">
              Already registered?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
                Login
              </button>
            </p>

          </form>
        )}

      </div>

    </div>
  );
}

export default CitizenAuth;