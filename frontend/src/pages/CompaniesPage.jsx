import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";
import { displayName } from "../lib/format";

export default function CompaniesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    ownerId: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [companyResponse, ownerResponse] = await Promise.all([
        api.get("/companies"),
        user.role === "MANAGER"
          ? api.get("/companies/owners")
          : Promise.resolve(null),
      ]);
      setCompanies(companyResponse.data.data.companies);
      setOwners(ownerResponse?.data.data.owners || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          "Unable to load companies.",
      );
    } finally {
      setLoading(false);
    }
  }

  // The initial request establishes page data once when the protected page mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, []);

  async function create(event) {
    event.preventDefault();
    setError("");
    try {
      const payload =
        user.role === "MANAGER"
          ? form
          : { name: form.name, industry: form.industry, website: form.website };
      const response = await api.post("/companies", payload);
      navigate(`/companies/${response.data.data.company.id}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          "Unable to create company.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      {error && <p className="alert-error mb-6">{error}</p>}
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {loading ? (
            <p className="text-slate-500">Loading companies...</p>
          ) : companies.length ? (
            <ul className="grid gap-3">
              {companies.map((company) => (
                <li className="card p-5" key={company.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        className="text-base font-semibold text-slate-900 hover:text-indigo-700"
                        to={`/companies/${company.id}`}
                      >
                        {company.name}
                      </Link>
                      <p className="mt-1 text-sm text-slate-500">
                        {company.industry}
                      </p>
                    </div>
                    <span className="badge badge-slate">
                      {displayName(company.owner.email)}
                    </span>
                  </div>
                  {company.website && (
                    <p className="mt-3 truncate text-sm text-slate-500">
                      {company.website}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No active companies are available.</p>
          )}
        </div>
        <form className="card h-fit p-5" onSubmit={create}>
          <h2 className="text-lg font-semibold text-slate-900">Create company</h2>
          {["name", "industry", "website"].map((field) => (
            <label className="mt-3 block text-sm font-medium text-slate-700" key={field}>
              {field[0].toUpperCase() + field.slice(1)}
              <input
                className="input"
                value={form[field]}
                onChange={(event) =>
                  setForm({ ...form, [field]: event.target.value })
                }
                required
              />
            </label>
          ))}
          {user.role === "MANAGER" && (
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Owner
              <select
                className="select"
                value={form.ownerId}
                onChange={(event) =>
                  setForm({ ...form, ownerId: event.target.value })
                }
                required
              >
                <option value="">Select a sales rep</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {displayName(owner.email)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="btn btn-primary mt-5 w-full">Create</button>
        </form>
      </section>
    </div>
  );
}
