import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/useAuth'

const stages = { NEW: 'New', QUALIFIED: 'Qualified', PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' }
const empty = { title: '', value: '', expectedCloseDate: '', companyId: '', ownerId: '' }

export default function DealDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [deal, setDeal] = useState(null)
  const [companies, setCompanies] = useState([])
  const [owners, setOwners] = useState([])
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [dealResponse, companyResponse, ownerResponse] = await Promise.all([
          api.get(`/deals/${id}`),
          api.get('/companies'),
          user.role === 'MANAGER' ? api.get('/deals/owners') : Promise.resolve(null),
        ])
        const current = dealResponse.data.data.deal
        setDeal(current)
        setForm({ title: current.title, value: String(current.value), expectedCloseDate: current.expectedCloseDate.slice(0, 10), companyId: current.companyId, ownerId: current.ownerId })
        setCompanies(companyResponse.data.data.companies)
        setOwners(ownerResponse?.data.data.owners || [])
      } catch (requestError) {
        setError(requestError.response?.data?.error?.message || 'Unable to load deal.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user.role])

  function change(field, value) { setForm((current) => ({ ...current, [field]: value })) }

  async function save(event) {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = { title: form.title, value: form.value, expectedCloseDate: form.expectedCloseDate, companyId: form.companyId }
      if (user.role === 'MANAGER') payload.ownerId = form.ownerId
      const response = await api.patch(`/deals/${id}`, payload)
      const updated = response.data.data.deal
      setDeal(updated)
      setForm({ title: updated.title, value: String(updated.value), expectedCloseDate: updated.expectedCloseDate.slice(0, 10), companyId: updated.companyId, ownerId: updated.ownerId })
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to update deal.')
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!window.confirm('Delete this deal?')) return
    try { await api.delete(`/deals/${id}`); navigate('/deals') } catch (requestError) { setError(requestError.response?.data?.error?.message || 'Unable to delete deal.') }
  }

  if (loading) return <main className="min-h-screen bg-slate-950 p-12 text-slate-100">Loading deal...</main>
  if (error && !deal) return <main className="min-h-screen bg-slate-950 p-12 text-red-200">{error}</main>
  if (!deal) return null

  return <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100"><div className="mx-auto max-w-3xl"><Link className="text-sky-400" to="/deals">Back to deals</Link><h1 className="mt-4 text-3xl font-bold">{deal.title}</h1><p className="mt-2 text-sm text-slate-400">Stage: {stages[deal.stage]} · Owner: {deal.owner.email} · Company: {deal.company.name}</p>{error && <p className="mt-4 rounded bg-red-950 p-3 text-red-200">{error}</p>}<form className="mt-8 rounded border border-slate-800 bg-slate-900 p-6" onSubmit={save}><label className="mt-3 block text-sm">Title<input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.title} onChange={(e) => change('title', e.target.value)} required /></label><label className="mt-3 block text-sm">Value<input type="text" inputMode="decimal" pattern="^\d{1,12}(\.\d{1,2})?$" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.value} onChange={(e) => change('value', e.target.value)} required /></label><label className="mt-3 block text-sm">Expected close date<input type="date" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.expectedCloseDate} onChange={(e) => change('expectedCloseDate', e.target.value)} required /></label><label className="mt-3 block text-sm">Company<select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.companyId} onChange={(e) => change('companyId', e.target.value)} required>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>{user.role === 'MANAGER' && <label className="mt-3 block text-sm">Owner<select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.ownerId} onChange={(e) => change('ownerId', e.target.value)} required>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.email}</option>)}</select></label>}<div className="mt-6 flex gap-3"><button className="rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button><button type="button" className="rounded border border-red-700 px-4 py-2 text-red-200" onClick={remove}>Delete deal</button></div></form></div></main>
}
