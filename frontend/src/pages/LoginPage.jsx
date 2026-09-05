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
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-12 text-slate-100">
      <form
        className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8"
        onSubmit={handleSubmit}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          Sales CRM
        </p>
        <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
        {location.state?.registered && (
          <p className="mt-5 rounded-md bg-emerald-950 px-3 py-2 text-sm text-emerald-200">
            Account created. You can now sign in.
          </p>
        )}
        {error && (
          <p className="mt-5 rounded-md bg-red-950 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <label className="mt-6 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button
          className="mt-6 w-full rounded-md bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
        <p className="mt-5 text-center text-sm text-slate-400">
          Don't have an account?{" "}
          <Link className="text-sky-300 hover:text-sky-200" to="/register">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}
