import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../api/client'
import { useAuth } from '../auth/useAuth'

const emptyDashboard = {
  metrics: { openDeals: 0, weightedPipeline: '0.00', wonThisMonth: 0, lostThisMonth: 0 },
  openDealsByStage: [],
  openDealsByOwner: [],
  wonPerWeek: [],
}
const stageLabels = { NEW: 'New', QUALIFIED: 'Qualified', PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation' }

function formatCurrency(value) {
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DashboardPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [dashboardResponse, alertResponse] = await Promise.all([
          api.get('/dashboard'),
          api.get('/deals/alerts/past-due'),
        ])
        setDashboard(dashboardResponse.data.data)
        setAlerts(alertResponse.data.data.alerts)
      } catch (requestError) {
        setError(requestError.response?.data?.error?.message || 'Unable to load dashboard.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function dismissAlert(dealId) {
    try {
      await api.post(`/deals/${dealId}/alerts/past-due/dismiss`)
      setAlerts((current) => current.filter((alert) => alert.dealId !== dealId))
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to dismiss alert.')
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const stageData = dashboard.openDealsByStage.map((item) => ({ ...item, label: stageLabels[item.stage] || item.stage }))
  const ownerData = dashboard.openDealsByOwner.map((item) => ({ ...item, label: item.ownerEmail }))
  const weeklyData = dashboard.wonPerWeek.map((item) => ({ ...item, label: item.week.slice(5) }))
  const { metrics } = dashboard

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap items-center gap-3 text-sm"><Link className="text-sky-300" to="/">Dashboard</Link><Link className="text-slate-300 hover:text-sky-300" to="/companies">Companies</Link><Link className="text-slate-300 hover:text-sky-300" to="/deals">Deals</Link><button className="text-slate-400 hover:text-slate-100" type="button" onClick={handleLogout}>Log out</button></nav>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Sales overview</p>
        <h1 className="mt-3 text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-slate-400">A server-calculated view of your accessible pipeline.</p>
        {error && <p className="mt-6 rounded bg-red-950 p-3 text-red-200">{error}</p>}
        {loading ? <p className="mt-8 text-slate-300">Loading dashboard...</p> : <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Open Deals', metrics.openDeals],
              ['Weighted Pipeline', formatCurrency(metrics.weightedPipeline)],
              ['Won This Month', metrics.wonThisMonth],
              ['Lost This Month', metrics.lostThisMonth],
            ].map(([label, value]) => <article className="rounded border border-slate-800 bg-slate-900 p-5" key={label}><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-2xl font-semibold text-slate-100">{value}</p></article>)}
          </section>

          <section className="mt-6 rounded border border-amber-800 bg-amber-950/40 p-5" aria-labelledby="alerts-heading">
            <h2 id="alerts-heading" className="text-lg font-semibold text-amber-100">Past Due</h2>
            {alerts.length === 0 ? <p className="mt-3 text-sm text-amber-200/70">No past-due deals.</p> : <ul className="mt-4 space-y-3">{alerts.map((alert) => <li className="rounded border border-amber-800/70 bg-slate-950/40 p-4" key={alert.dealId}><div className="flex flex-wrap items-start justify-between gap-4"><div><Link className="font-semibold text-amber-100" to={`/deals/${alert.dealId}`}>{alert.title}</Link><p className="mt-1 text-sm text-amber-200/80">{alert.companyName} · {stageLabels[alert.stage] || alert.stage}</p><p className="mt-1 text-sm text-amber-200/70">Expected close: {alert.expectedCloseDate}</p></div>{alert.canDismiss && <button className="rounded border border-amber-500 px-3 py-1 text-sm text-amber-100" onClick={() => dismissAlert(alert.dealId)}>Dismiss</button>}</div></li>)}</ul>}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded border border-slate-800 bg-slate-900 p-5"><h2 className="text-lg font-semibold">Open deals by stage</h2><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={stageData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="label" stroke="#94a3b8" /><YAxis allowDecimals={false} stroke="#94a3b8" /><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} /><Bar dataKey="count" fill="#38bdf8" /></BarChart></ResponsiveContainer></div></article>
            <article className="rounded border border-slate-800 bg-slate-900 p-5"><h2 className="text-lg font-semibold">Open deals by owner</h2>{ownerData.length === 0 ? <p className="mt-5 text-slate-400">No open deals are available.</p> : <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={ownerData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis type="number" allowDecimals={false} stroke="#94a3b8" /><YAxis type="category" dataKey="label" width={130} stroke="#94a3b8" /><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} /><Bar dataKey="count" fill="#a78bfa" /></BarChart></ResponsiveContainer></div>}</article>
          </section>

          <article className="mt-6 rounded border border-slate-800 bg-slate-900 p-5"><h2 className="text-lg font-semibold">Won deals per week</h2><p className="mt-1 text-sm text-slate-400">Monday-start UTC weeks, including the current week.</p><div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={weeklyData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="label" stroke="#94a3b8" /><YAxis allowDecimals={false} stroke="#94a3b8" /><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} /><Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></article>
        </>}
      </div>
    </main>
  )
}
