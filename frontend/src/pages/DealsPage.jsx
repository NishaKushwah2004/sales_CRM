import { Link, useNavigate } from "react-router-dom";
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

const emptyForm = {
  title: "",
  value: "",
  expectedCloseDate: "",
  companyId: "",
  ownerId: "",
};
const stages = stageLabels;
const initialFilters = {
  search: "",
  companyId: "",
  stage: "",
  ownerId: "",
  sortBy: "lastUpdate",
  sortOrder: "desc",
  page: 1,
  pageSize: 10,
};

function errorMessage(error, fallback) {
  return error.response?.data?.error?.message || fallback;
}

export default function DealsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [owners, setOwners] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDealIds, setSelectedDealIds] = useState([]);
  const [bulkOwnerId, setBulkOwnerId] = useState("");
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [companyResponse, ownerResponse] = await Promise.all([
          api.get("/companies"),
          user.role === "MANAGER"
            ? api.get("/deals/owners")
            : Promise.resolve(null),
        ]);
        setCompanies(companyResponse.data.data.companies);
        setOwners(ownerResponse?.data.data.owners || []);
      } catch (requestError) {
        setError(errorMessage(requestError, "Unable to load deal filters."));
      }
    }
    loadMetadata();
  }, [user.role]);

  useEffect(() => {
    const controller = new AbortController();
    const delay = filters.search.trim() ? 300 : 0;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (filters.search.trim()) params.set("search", filters.search.trim());
        if (filters.companyId) params.set("companyId", filters.companyId);
        if (filters.stage) params.set("stage", filters.stage);
        if (filters.ownerId) params.set("ownerId", filters.ownerId);
        params.set("sortBy", filters.sortBy);
        params.set("sortOrder", filters.sortOrder);
        params.set("page", String(filters.page));
        params.set("pageSize", String(filters.pageSize));
        const response = await api.get(`/deals?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setDeals(response.data.data.deals);
          setPagination(response.data.data.pagination);
        }
      } catch (requestError) {
        if (!controller.signal.aborted)
          setError(errorMessage(requestError, "Unable to load deals."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, delay);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    filters.search,
    filters.companyId,
    filters.stage,
    filters.ownerId,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.pageSize,
    refreshVersion,
  ]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value, page: 1 }));
  }

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        value: form.value,
        expectedCloseDate: form.expectedCloseDate,
        companyId: form.companyId,
      };
      if (user.role === "MANAGER") payload.ownerId = form.ownerId;
      const response = await api.post("/deals", payload);
      setForm(emptyForm);
      navigate(`/deals/${response.data.data.deal.id}`);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to create deal."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(dealId) {
    if (
      !window.confirm(
        "Delete this deal? It will be removed from normal deal lists.",
      )
    )
      return;
    try {
      await api.delete(`/deals/${dealId}`);
      setDeals((current) => current.filter((deal) => deal.id !== dealId));
      setPagination((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to delete deal."));
    }
  }

  function toggleDeal(dealId) {
    setSelectedDealIds((current) =>
      current.includes(dealId)
        ? current.filter((id) => id !== dealId)
        : [...current, dealId],
    );
  }

  function toggleVisibleDeals() {
    const visibleIds = deals.map((deal) => deal.id);
    setSelectedDealIds((current) =>
      visibleIds.every((id) => current.includes(id))
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );
  }

  async function bulkReassign() {
    if (!bulkOwnerId || selectedDealIds.length === 0) return;
    setBulkSaving(true);
    setError("");
    try {
      const response = await api.post("/deals/bulk-reassign", {
        dealIds: selectedDealIds,
        ownerId: bulkOwnerId,
      });
      setBulkResults(response.data.data.results);
      setSelectedDealIds([]);
      setRefreshVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        errorMessage(requestError, "Unable to reassign selected deals."),
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function bulkAdvance() {
    if (selectedDealIds.length === 0) return;
    setBulkSaving(true);
    setError("");
    try {
      const response = await api.post("/deals/bulk-advance", {
        dealIds: selectedDealIds,
      });
      setBulkResults(response.data.data.results);
      setSelectedDealIds([]);
      setRefreshVersion((current) => current + 1);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to advance selected deals."));
    } finally {
      setBulkSaving(false);
    }
  }

  async function exportCsv() {
    setError("");
    try {
      const response = await api.get("/deals/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sales-crm-open-deals.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to export open deals."));
    }
  }

  const allVisibleSelected =
    deals.length > 0 &&
    deals.every((deal) => selectedDealIds.includes(deal.id));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <a className="btn btn-primary" href="#create-deal">
          New Deal
        </a>
        <button className="btn btn-secondary" onClick={exportCsv}>
          Export open deals
        </button>
      </div>
      {error && <p className="alert-error mt-4">{error}</p>}

      <section className="card mt-6 p-5">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-slate-700 lg:col-span-2">
            Search deals or companies
            <input
              className="input"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search by title or company"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Company
            <select
              className="select"
              value={filters.companyId}
              onChange={(event) =>
                updateFilter("companyId", event.target.value)
              }
            >
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Stage
            <select
              className="select"
              value={filters.stage}
              onChange={(event) => updateFilter("stage", event.target.value)}
            >
              <option value="">All stages</option>
              {Object.entries(stages).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {user.role === "MANAGER" && (
            <label className="text-sm font-medium text-slate-700">
              Owner
              <select
                className="select"
                value={filters.ownerId}
                onChange={(event) =>
                  updateFilter("ownerId", event.target.value)
                }
              >
                <option value="">All owners</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {displayName(owner.email)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm font-medium text-slate-700">
            Sort by
            <select
              className="select"
              value={filters.sortBy}
              onChange={(event) => updateFilter("sortBy", event.target.value)}
            >
              <option value="lastUpdate">Last update</option>
              <option value="value">Value</option>
              <option value="expectedCloseDate">Expected close date</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Order
            <select
              className="select"
              value={filters.sortOrder}
              onChange={(event) =>
                updateFilter("sortOrder", event.target.value)
              }
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Page size
            <select
              className="select"
              value={filters.pageSize}
              onChange={(event) =>
                updateFilter("pageSize", Number(event.target.value))
              }
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
        </div>
      </section>

      {user.role === "MANAGER" && (
        <section className="card mt-6 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">
              {selectedDealIds.length} selected
            </span>
            <button className="btn btn-secondary" onClick={toggleVisibleDeals}>
              {allVisibleSelected ? "Clear visible" : "Select all visible"}
            </button>
            <select
              className="select mt-0 max-w-56"
              value={bulkOwnerId}
              onChange={(event) => setBulkOwnerId(event.target.value)}
              aria-label="Reassign owner"
            >
              <option value="">Reassign to...</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {displayName(owner.email)}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              disabled={
                !bulkOwnerId || selectedDealIds.length === 0 || bulkSaving
              }
              onClick={bulkReassign}
            >
              Bulk reassign
            </button>
            <button
              className="btn btn-secondary"
              disabled={selectedDealIds.length === 0 || bulkSaving}
              onClick={bulkAdvance}
            >
              Bulk advance
            </button>
          </div>
          {bulkResults.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {bulkResults.map((result) => (
                <li
                  className={result.success ? "text-emerald-700" : "text-red-700"}
                  key={result.dealId}
                >
                  {result.dealId}:{" "}
                  {result.success
                    ? `Success${result.oldStage ? ` (${result.oldStage} to ${result.newStage})` : ""}`
                    : `Rejected - ${result.reason}`}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]" id="tasks">
        <div>
          <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
            <span>
              {pagination.total} matching deal
              {pagination.total === 1 ? "" : "s"}
            </span>
            <span>
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
          </div>
          {loading ? (
            <p className="text-slate-500">Loading deals...</p>
          ) : deals.length === 0 ? (
            <p className="empty-state">No deals match the current search.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {user.role === "MANAGER" && <th className="w-10"></th>}
                    <th>Deal</th>
                    <th>Company</th>
                    <th>Stage</th>
                    <th>Value</th>
                    <th>Close</th>
                    <th>Owner</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id}>
                      {user.role === "MANAGER" && (
                        <td>
                          <input
                            aria-label={`Select ${deal.title}`}
                            type="checkbox"
                            checked={selectedDealIds.includes(deal.id)}
                            onChange={() => toggleDeal(deal.id)}
                          />
                        </td>
                      )}
                      <td>
                        <Link
                          className="font-semibold text-slate-900 hover:text-indigo-700"
                          to={`/deals/${deal.id}`}
                        >
                          {deal.title}
                        </Link>
                      </td>
                      <td>{deal.company.name}</td>
                      <td>
                        <span className={stageClass(deal.stage)}>
                          {stages[deal.stage]}
                        </span>
                      </td>
                      <td>{formatCurrency(deal.value)}</td>
                      <td>{formatDate(deal.expectedCloseDate)}</td>
                      <td>{displayName(deal.owner.email)}</td>
                      <td>
                        <button
                          className="btn btn-danger px-2 py-1"
                          onClick={() => remove(deal.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-5 flex items-center justify-between">
            <button
              className="btn btn-secondary"
              disabled={loading || pagination.page <= 1}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: current.page - 1,
                }))
              }
            >
              Previous
            </button>
            <button
              className="btn btn-secondary"
              disabled={loading || pagination.page >= pagination.totalPages}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: current.page + 1,
                }))
              }
            >
              Next
            </button>
          </div>
        </div>

        <form className="card h-fit p-5" onSubmit={create} id="create-deal">
          <h2 className="text-lg font-semibold text-slate-900">Create deal</h2>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Title
            <input
              className="input"
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
              required
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Value
            <input
              type="text"
              inputMode="decimal"
              pattern="^\d{1,12}(\.\d{1,2})?$"
              className="input"
              value={form.value}
              onChange={(e) => change("value", e.target.value)}
              placeholder="100000.00"
              required
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Expected close date
            <input
              type="date"
              className="input"
              value={form.expectedCloseDate}
              onChange={(e) => change("expectedCloseDate", e.target.value)}
              required
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            Company
            <select
              className="select"
              value={form.companyId}
              onChange={(e) => change("companyId", e.target.value)}
              required
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          {user.role === "MANAGER" && (
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Owner
              <select
                className="select"
                value={form.ownerId}
                onChange={(e) => change("ownerId", e.target.value)}
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
          <button className="btn btn-primary mt-5 w-full" disabled={saving}>
            {saving ? "Creating..." : "Create deal"}
          </button>
        </form>
      </section>
    </div>
  );
}
