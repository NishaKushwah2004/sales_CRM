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
    <main className="grid min-h-screen bg-[#F8FAFC] lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-indigo-700 px-12 py-12 text-white lg:flex">
        <p className="text-sm font-semibold tracking-wide">Sales CRM</p>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            Create your Sales CRM account.
          </h1>
          <p className="mt-4 max-w-md text-indigo-100">
            Registration uses the existing account API. After signup you can
            sign in with your email and password.
          </p>
        </div>
        <p className="text-sm text-indigo-200">Secure workspace access</p>
      </section>
      <section className="grid place-items-center px-6 py-12">
        <form className="card w-full max-w-md p-8" onSubmit={handleSubmit}>
          <p className="text-sm font-semibold text-indigo-600">Sales CRM</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Create account
          </h1>
          {error && <p className="alert-error mt-5">{error}</p>}
          <label
            className="mt-6 block text-sm font-medium text-slate-700"
            htmlFor="register-email"
          >
            Email
          </label>
          <input
            id="register-email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label
            className="mt-4 block text-sm font-medium text-slate-700"
            htmlFor="register-password"
          >
            Password
          </label>
          <input
            id="register-password"
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={minimumPasswordLength}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <label
            className="mt-4 block text-sm font-medium text-slate-700"
            htmlFor="confirm-password"
          >
            Confirm Password
          </label>
          <input
            id="confirm-password"
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={minimumPasswordLength}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <button
            className="btn btn-primary mt-6 w-full py-2.5"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Register"}
          </button>
          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link className="font-semibold text-indigo-600 hover:text-indigo-500" to="/login">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
