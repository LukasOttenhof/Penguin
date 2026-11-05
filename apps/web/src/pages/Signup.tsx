import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { penguinLogo } from "../brand-assets";
import "./auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);

    const firstName = String(data.get("first_name") ?? "").trim();
    const lastName = String(data.get("last_name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      setLoading(false);
      return;
    }

    try {
        const res = await fetch("/api/teachers/create_teacher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email,
            password,
          }),
        });

        if (!res.ok) {
          // The api replies with { error: "..." } — show it
          const body = await res.json().catch(() => null);
          setError(body?.error ?? "Couldn't create your account. Please try again.");
          return;
        }

        // 201 Created — account made
        navigate("/app");
      } catch {
        setError("Can't reach the server. Is the API running?");
      } finally {
        setLoading(false);
      }
  }
    
    
  

  return (
    <div className="auth-shell">
      <Link to="/" className="auth-brand">
        <img src={penguinLogo} alt="Penguin logo" />
        Penguin<span>.</span>
      </Link>

      <div className="auth-card">
        <h1>Create a teacher account</h1>
        <p className="auth-sub">Set up your class in minutes. Students join with a code — no student emails needed.</p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              First name
              <input
                name="first_name"
                type="text"
                autoComplete="given-name"
                placeholder="Alex"
                required
                autoFocus
              />
            </label>
            <label>
              Last name
              <input
                name="last_name"
                type="text"
                autoComplete="family-name"
                placeholder="Taylor"
                required
              />
            </label>
          </div>

          <label>
            School email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@school.edu"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>

          <label>
            Confirm password
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              required
            />
          </label>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        <div className="auth-demo-note">
          Demo mode — no real account is created. You'll be taken straight to the teacher workspace.
        </div>
      </div>
    </div>
  );
}
