import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/useAuth'

const stages = { NEW: 'New', QUALIFIED: 'Qualified', PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' }

export default function CompanyDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [company, setCompany] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      const response = await api.get(`/companies/${id}`)
      const current = response.data.data.company
      setCompany(current)
      setForm(current)
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to load company.')
    }
  }

  // Initial page load synchronizes data from the authenticated API.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load() }, [id])

  async function save(event) {
    event.preventDefault()
    setError('')
    try {
      const response = await api.patch(`/companies/${id}`, { name: form.name, industry: form.industry, website: form.website })
      const current = response.data.data.company
      setCompany((old) => ({ ...old, ...current }))
      setForm((old) => ({ ...old, ...current }))
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to update company.')
    }
  }

  async function changeArchive(action) {
    try {
      const response = await api.post(`/companies/${id}/${action}`)
      const current = response.data.data.company
      setCompany((old) => ({ ...old, ...current }))
      setForm((old) => ({ ...old, ...current }))
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to update archive status.')
    }
  }

  if (error && !company) return <main className="min-h-screen bg-slate-950 p-12 text-red-200">{error}</main>
  if (!company || !form) return <main className="min-h-screen bg-slate-950 p-12 text-slate-100">Loading company...</main>

  return <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100"><div className="mx-auto max-w-5xl"><Link className="text-sky-400" to="/companies">Back to companies</Link><div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{company.name}</h1><p className="mt-2 text-sm text-slate-400">Owner: {company.owner.email}</p></div>{user.role === 'MANAGER' && <button className="rounded border border-red-500 px-4 py-2 text-red-200" onClick={() => changeArchive(company.archivedAt ? 'restore' : 'archive')}>{company.archivedAt ? 'Restore company' : 'Archive company'}</button>}</div>{error && <p className="mt-4 rounded bg-red-950 p-3 text-red-200">{error}</p>}<section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]"><form className="rounded border border-slate-800 bg-slate-900 p-6" onSubmit={save}><h2 className="text-lg font-semibold">Company details</h2>{['name','industry','website'].map((field) => <label className="mt-3 block text-sm" key={field}>{field[0].toUpperCase() + field.slice(1)}<input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required /></label>)}{!company.archivedAt && <button className="mt-5 rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950">Save changes</button>}</form><section className="rounded border border-slate-800 bg-slate-900 p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Deals</h2><Link className="text-sm text-sky-400" to="/deals">View all deals</Link></div>{company.deals?.length ? <ul className="mt-4 space-y-3">{company.deals.map((deal) => <li className="rounded border border-slate-800 p-3" key={deal.id}><Link className="font-medium text-sky-300" to={`/deals/${deal.id}`}>{deal.title}</Link><p className="mt-1 text-sm text-slate-300">₹ {deal.value} · {stages[deal.stage]} · Close {deal.expectedCloseDate.slice(0, 10)}</p><p className="mt-1 text-xs text-slate-500">Owner: {deal.owner.email}</p></li>)}</ul> : <p className="mt-4 text-sm text-slate-400">No accessible active deals for this company.</p>}</section></section></div></main>
}
