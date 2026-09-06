import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/client";
import {
  displayName,
  formatCurrency,
  formatDate,
  stageLabels,
} from "../lib/format";
import {
  IconAlert,
  IconLost,
  IconOpen,
  IconPipeline,
  IconWon,
} from "../components/icons";

const emptyDashboard = {
  metrics: {
    openDeals: 0,
    weightedPipeline: "0.00",
    wonThisMonth: 0,
    lostThisMonth: 0,
  },
  openDealsByStage: [],
  openDealsByOwner: [],
  wonPerWeek: [],
};

const chartTooltip = {
  backgroundColor: "#ffffff",
  borderColor: "#e2e8f0",
  borderRadius: 8,
  color: "#0f172a",
  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
};

export default function DashboardPage() {
  const location = useLocation();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [dashboardResponse, alertResponse] = await Promise.all([
          api.get("/dashboard"),
          api.get("/deals/alerts/past-due"),
        ]);
        setDashboard(dashboardResponse.data.data);
        setAlerts(alertResponse.data.data.alerts);
        setAlertCount(
          alertResponse.data.data.count ??
            alertResponse.data.data.alerts.length,
        );
      } catch (requestError) {
        setError(
          requestError.response?.data?.error?.message ||
            "Unable to load dashboard.",
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (location.hash === "#past-due") {
      document.getElementById("past-due")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, location.hash]);

  async function dismissAlert(dealId) {
    try {
      await api.post(`/deals/${dealId}/alerts/past-due/dismiss`);
      setAlerts((current) =>
        current.filter((alert) => alert.dealId !== dealId),
      );
      setAlertCount((current) => Math.max(0, current - 1));
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          "Unable to dismiss alert.",
      );
    }
  }

  const stageData = dashboard.openDealsByStage.map((item) => ({
    ...item,
    label: stageLabels[item.stage] || item.stage,
  }));
  const ownerData = dashboard.openDealsByOwner.map((item) => ({
    ...item,
    label: displayName(item.ownerEmail),
  }));
  const weeklyData = dashboard.wonPerWeek.map((item) => ({
    ...item,
    label: item.week.slice(5),
  }));
  const { metrics } = dashboard;

  const kpis = [
    {
      label: "Open Deals",
      value: metrics.openDeals,
      icon: IconOpen,
      tone: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Weighted Pipeline",
      value: formatCurrency(metrics.weightedPipeline),
      icon: IconPipeline,
      tone: "text-sky-700 bg-sky-50",
    },
    {
      label: "Won This Month",
      value: metrics.wonThisMonth,
      icon: IconWon,
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Lost This Month",
      value: metrics.lostThisMonth,
      icon: IconLost,
      tone: "text-red-700 bg-red-50",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {error && <p className="alert-error mb-6">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading dashboard...</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((item) => (
              <article className="card p-5" key={item.label}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${item.tone}`}>
                    <item.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                  {item.value}
                </p>
              </article>
            ))}
          </section>

          <section
            id="past-due"
            className="card mt-6 border-amber-200 p-5"
            aria-labelledby="alerts-heading"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <IconAlert className="h-4 w-4" />
              </span>
              <div>
                <h2 id="alerts-heading" className="text-lg font-semibold text-slate-900">
                  Past Due
                </h2>
                <p className="text-sm text-slate-500">
                  {alertCount} open deal{alertCount === 1 ? "" : "s"} past expected close
                </p>
              </div>
            </div>
            {alerts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No past-due deals.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {alerts.map((alert) => (
                  <li
                    className="rounded-lg border border-amber-100 bg-amber-50/60 p-4"
                    key={alert.dealId}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Link
                          className="font-semibold text-slate-900 hover:text-indigo-700"
                          to={`/deals/${alert.dealId}`}
                        >
                          {alert.title}
                        </Link>
                        <p className="mt-1 text-sm text-slate-600">
                          {alert.companyName} · {stageLabels[alert.stage] || alert.stage}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Expected close: {formatDate(alert.expectedCloseDate)}
                        </p>
                      </div>
                      {alert.canDismiss && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => dismissAlert(alert.dealId)}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="card p-5">
              <h2 className="text-lg font-semibold text-slate-900">Open deals by stage</h2>
              <div className="mt-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="card p-5">
              <h2 className="text-lg font-semibold text-slate-900">Open deals by owner</h2>
              {ownerData.length === 0 ? (
                <p className="mt-5 text-slate-500">No open deals are available.</p>
              ) : (
                <div className="mt-5 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ownerData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} stroke="#64748b" />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={90}
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip contentStyle={chartTooltip} />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </article>
          </section>

          <article className="card mt-6 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Won deals per week</h2>
            <p className="mt-1 text-sm text-slate-500">
              Monday-start UTC weeks, including the current week.
            </p>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#059669" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </>
      )}
    </div>
  );
}
