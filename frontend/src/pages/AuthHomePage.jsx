import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
export default function AuthHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
          Authenticated
        </p>
        <h1 className="mt-3 text-3xl font-bold">Welcome, {user.email}</h1>
        <p className="mt-4 text-slate-300">
          Role:{" "}
          <span className="font-semibold text-slate-100">
            {user.role === "MANAGER" ? "Sales Manager" : "Sales Rep"}
          </span>
        </p>
        <Link
          className="mt-8 inline-block rounded-md border border-sky-500 px-4 py-2 text-sm font-semibold text-sky-300"
          to="/dashboard"
        >
          Dashboard
        </Link>
        <Link
          className="ml-3 inline-block rounded-md border border-sky-500 px-4 py-2 text-sm font-semibold text-sky-300"
          to="/companies"
        >
          Companies
        </Link>
        <Link
          className="ml-3 inline-block rounded-md border border-sky-500 px-4 py-2 text-sm font-semibold text-sky-300"
          to="/deals"
        >
          Deals
        </Link>
        <button
          className="ml-3 rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          type="button"
          onClick={handleLogout}
        >
          Log out
        </button>
      </section>
    </main>
  );
}
