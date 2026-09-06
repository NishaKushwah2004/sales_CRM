import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/useAuth";
import {
  displayName,
  formatCurrency,
  formatDate,
  stageClass,
  stageLabels,
} from "../lib/format";

export default function CompanyDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await api.get(`/companies/${id}`);
      const current = response.data.data.company;
      setCompany(current);
      setForm(current);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          "Unable to load company.",
      );
    }
  }

  // Initial page load synchronizes data from the authenticated API.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, [id]);

  async function save(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await api.patch(`/companies/${id}`, {
        name: form.name,
        industry: form.industry,
        website: form.website,
      });
      const current = response.data.data.company;
      setCompany((old) => ({ ...old, ...current }));
      setForm((old) => ({ ...old, ...current }));
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          "Unable to update company.",
      );
    }
  }

  async function changeArchive(action) {
    try {
      const response = await api.post(`/companies/${id}/${action}`);
      const current = response.data.data.company;
      setCompany((old) => ({ ...old, ...current }));
      setForm((old) => ({ ...old, ...current }));
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          "Unable to update archive status.",
      );
    }
  }

  if (error && !company)
    return <p className="alert-error">{error}</p>;
  if (!company || !form)
    return <p className="text-slate-500">Loading company...</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <Link className="text-sm font-medium text-indigo-600 hover:text-indigo-500" to="/companies">
        Back to companies
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{company.name}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Owner: {displayName(company.owner.email)}
          </p>
          {company.archivedAt && (
            <span className="badge badge-amber mt-3">Archived</span>
          )}
        </div>
        {user.role === "MANAGER" && (
          <button
            className={company.archivedAt ? "btn btn-secondary" : "btn btn-danger"}
            onClick={() =>
              changeArchive(company.archivedAt ? "restore" : "archive")
            }
          >
            {company.archivedAt ? "Restore company" : "Archive company"}
          </button>
        )}
      </div>
      {error && <p className="alert-error mt-4">{error}</p>}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <form className="card p-6" onSubmit={save}>
          <h3 className="text-lg font-semibold text-slate-900">Company details</h3>
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
          {!company.archivedAt && (
            <button className="btn btn-primary mt-5">Save changes</button>
          )}
        </form>
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Deals</h3>
            <Link className="text-sm font-medium text-indigo-600" to="/deals">
              View all deals
            </Link>
          </div>
          {company.deals?.length ? (
            <ul className="mt-4 space-y-3">
              {company.deals.map((deal) => (
                <li className="rounded-lg border border-slate-200 p-3" key={deal.id}>
                  <Link
                    className="font-medium text-slate-900 hover:text-indigo-700"
                    to={`/deals/${deal.id}`}
                  >
                    {deal.title}
                  </Link>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    {formatCurrency(deal.value)} · Close {formatDate(deal.expectedCloseDate)}
                    <span className={stageClass(deal.stage)}>
                      {stageLabels[deal.stage]}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Owner: {displayName(deal.owner.email)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No accessible active deals for this company.
            </p>
          )}
        </section>
      </section>
    </div>
  );
}
