import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/useAuth";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          "Unable to sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className="grid min-h-screen bg-[#F8FAFC] lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-indigo-700 px-12 py-12 text-white lg:flex">
        <p className="text-sm font-semibold tracking-wide">Sales CRM</p>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            A clean workspace for pipeline, companies, and follow-ups.
          </h1>
          <p className="mt-4 max-w-md text-indigo-100">
            Sign in to manage deals, collaborators, and past-due alerts with the
            same access rules you already use.
          </p>
        </div>
        <p className="text-sm text-indigo-200">Professional sales operations</p>
      </section>
      <section className="grid place-items-center px-6 py-12">
        <form className="card w-full max-w-md p-8" onSubmit={handleSubmit}>
          <p className="text-sm font-semibold text-indigo-600">Sales CRM</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use your account email and password.
          </p>
          {location.state?.registered && (
            <p className="alert-success mt-5">
              Account created. You can now sign in.
            </p>
          )}
          {error && <p className="alert-error mt-5">{error}</p>}
          <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            className="btn btn-primary mt-6 w-full py-2.5"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
          <p className="mt-5 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link className="font-semibold text-indigo-600 hover:text-indigo-500" to="/register">
              Register
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
