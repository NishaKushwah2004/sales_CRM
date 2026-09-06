import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { displayName, roleLabel } from "../lib/format";

export default function AuthHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }
  return (
    <section className="mx-auto max-w-2xl">
      <article className="card p-8">
        <p className="text-sm font-semibold text-indigo-600">Authenticated</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Welcome, {displayName(user.email)}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{user.email}</p>
        <p className="mt-4 text-slate-600">
          Role:{" "}
          <span className="badge badge-indigo ml-1">{roleLabel(user.role)}</span>
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn btn-primary" to="/dashboard">
            Dashboard
          </Link>
          <Link className="btn btn-secondary" to="/companies">
            Companies
          </Link>
          <Link className="btn btn-secondary" to="/deals">
            Deals
          </Link>
          <button className="btn btn-secondary" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </article>
    </section>
  );
}
