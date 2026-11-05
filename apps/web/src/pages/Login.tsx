import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { penguinLogo } from "../brand-assets";
import "./auth.css";

type Role = "teacher" | "student";

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>(
    params.get("role") === "student" ? "student" : "teacher",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(event.currentTarget);


    if (role === "teacher") {
      const email = String(data.get("email") ?? "").trim();
      const password = String(data.get("password") ?? "");
      if (!email || !password) { setError("Please fill in all fields."); setLoading(false); return; }
      try {
        const res = await fetch("/api/teachers/login_teacher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
          }),
        });

        if (!res.ok) {
      
          const body = await res.json().catch(() => null);
          setError(body?.error ?? "Couldn't login. Please try again.");
          return;
        }

        // 200 logged in
        navigate("/app");
      } catch {
        setError("Can't reach the server. Is the API running?");
      } finally {
        setLoading(false);
      }

      
    } else {
      const username = String(data.get("username") ?? "").trim();
      const joinCode = String(data.get("join_code") ?? "").trim();
      const password = String(data.get("password") ?? "");
      if (!username || !joinCode || !password) { setError("Please fill in all fields."); setLoading(false); return; }
      navigate("/student");
    }

    setLoading(false);
  }

  return (
    <div className="auth-shell">
      <Link to="/" className="auth-brand">
        <img src={penguinLogo} alt="Penguin logo" />
        Penguin<span>.</span>
      </Link>

      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="auth-sub">Sign in to continue to your workspace.</p>

        {/* Role toggle */}
        <div className="auth-role-toggle" role="group" aria-label="Select your role">
          <button
            type="button"
            className={`auth-role-btn ${role === "teacher" ? "active" : ""}`}
            onClick={() => { setRole("teacher"); setError(""); }}
          >
            I'm a teacher
          </button>
          <button
            type="button"
            className={`auth-role-btn ${role === "student" ? "active" : ""}`}
            onClick={() => { setRole("student"); setError(""); }}
          >
            I'm a student
          </button>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {role === "teacher" ? (
            <>
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@school.edu"
                  required
                  autoFocus
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Username
                <input
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. amelia.b8"
                  required
                  autoFocus
                />
              </label>
              <label>
                Class join code
                <input
                  name="join_code"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. CELLS-001"
                  required
                />
              </label>
              <p className="auth-hint">Your teacher gives you this code when you join a class.</p>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </label>
            </>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {role === "teacher" && (
          <p className="auth-footer">
            No account yet?{" "}
            <Link to="/signup">Create a teacher account</Link>
          </p>
        )}
        {role === "student" && (
          <p className="auth-footer">
            New student? Ask your teacher for a username and join code.
          </p>
        )}

        <div className="auth-demo-note">
          Demo mode — enter any values to continue. No account required.
        </div>
      </div>
    </div>
  );
}
