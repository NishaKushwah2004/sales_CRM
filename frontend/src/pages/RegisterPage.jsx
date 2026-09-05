import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";

const minimumPasswordLength = 8;

export default function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (password.length < minimumPasswordLength) {
      setError(
        `Password must be at least ${minimumPasswordLength} characters.`,
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/register", { email, password });
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          "Unable to create account. Please try again.",
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
        <h1 className="mt-3 text-3xl font-bold">Create account</h1>
        {error && (
          <p className="mt-5 rounded-md bg-red-950 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <label
          className="mt-6 block text-sm font-medium"
          htmlFor="register-email"
        >
          Email
        </label>
        <input
          id="register-email"
          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label
          className="mt-4 block text-sm font-medium"
          htmlFor="register-password"
        >
          Password
        </label>
        <input
          id="register-password"
          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          type="password"
          autoComplete="new-password"
          minLength={minimumPasswordLength}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <label
          className="mt-4 block text-sm font-medium"
          htmlFor="confirm-password"
        >
          Confirm Password
        </label>
        <input
          id="confirm-password"
          className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
          type="password"
          autoComplete="new-password"
          minLength={minimumPasswordLength}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
        <button
          className="mt-6 w-full rounded-md bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Creating account..." : "Register"}
        </button>
        <p className="mt-5 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link className="text-sky-300 hover:text-sky-200" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
