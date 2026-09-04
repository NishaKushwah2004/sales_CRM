import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/useAuth'

const emptyForm = { title: '', value: '', expectedCloseDate: '', companyId: '', ownerId: '' }
const stages = { NEW: 'New', QUALIFIED: 'Qualified', PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' }

function errorMessage(error, fallback) {
  return error.response?.data?.error?.message || fallback
}

export default function DealsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [deals, setDeals] = useState([])
  const [companies, setCompanies] = useState([])
  const [owners, setOwners] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [dealResponse, companyResponse, ownerResponse] = await Promise.all([
        api.get('/deals'),
        api.get('/companies'),
        user.role === 'MANAGER' ? api.get('/deals/owners') : Promise.resolve(null),
      ])
      setDeals(dealResponse.data.data.deals)
      setCompanies(companyResponse.data.data.companies)
      setOwners(ownerResponse?.data.data.owners || [])
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load deals.'))
    } finally {
      setLoading(false)
    }
  }

  // Initial page load synchronizes data from the authenticated API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function create(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title,
        value: form.value,
        expectedCloseDate: form.expectedCloseDate,
        companyId: form.companyId,
      }
      if (user.role === 'MANAGER') payload.ownerId = form.ownerId
      const response = await api.post('/deals', payload)
      setForm(emptyForm)
      navigate(`/deals/${response.data.data.deal.id}`)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to create deal.'))
    } finally {
      setSaving(false)
    }
  }

  async function remove(dealId) {
    if (!window.confirm('Delete this deal? It will be removed from normal deal lists.')) return
    try {
      await api.delete(`/deals/${dealId}`)
      setDeals((current) => current.filter((deal) => deal.id !== dealId))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to delete deal.'))
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <Link className="text-sm text-sky-400" to="/">Back to account</Link>
        <h1 className="mt-4 text-3xl font-bold">Deals</h1>
        <p className="mt-2 text-slate-400">Your accessible deals. Managers can see every deal.</p>
        {error && <p className="mt-4 rounded bg-red-950 p-3 text-red-200">{error}</p>}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            {loading ? <p>Loading deals...</p> : deals.length === 0 ? (
              <p className="rounded border border-dashed border-slate-700 p-6 text-slate-400">No active deals are available.</p>
            ) : (
              <ul className="space-y-3">
                {deals.map((deal) => (
                  <li className="rounded border border-slate-800 bg-slate-900 p-4" key={deal.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link className="font-semibold text-sky-300" to={`/deals/${deal.id}`}>{deal.title}</Link>
                        <p className="mt-1 text-sm text-slate-300">{deal.company.name} · {stages[deal.stage]}</p>
                        <p className="mt-1 text-sm text-slate-400">₹ {deal.value} · Close {deal.expectedCloseDate.slice(0, 10)} · {deal.owner.email}</p>
                      </div>
                      <button className="rounded border border-red-700 px-3 py-1 text-sm text-red-200" onClick={() => remove(deal.id)}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="rounded border border-slate-800 bg-slate-900 p-5" onSubmit={create}>
            <h2 className="text-lg font-semibold">Create deal</h2>
            <label className="mt-3 block text-sm">Title<input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.title} onChange={(e) => change('title', e.target.value)} required /></label>
            <label className="mt-3 block text-sm">Value<input type="text" inputMode="decimal" pattern="^\d{1,12}(\.\d{1,2})?$" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.value} onChange={(e) => change('value', e.target.value)} placeholder="100000.00" required /></label>
            <label className="mt-3 block text-sm">Expected close date<input type="date" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.expectedCloseDate} onChange={(e) => change('expectedCloseDate', e.target.value)} required /></label>
            <label className="mt-3 block text-sm">Company<select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.companyId} onChange={(e) => change('companyId', e.target.value)} required><option value="">Select a company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            {user.role === 'MANAGER' && <label className="mt-3 block text-sm">Owner<select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.ownerId} onChange={(e) => change('ownerId', e.target.value)} required><option value="">Select a sales rep</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.email}</option>)}</select></label>}
            <button className="mt-5 rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={saving}>{saving ? 'Creating...' : 'Create deal'}</button>
          </form>
        </section>
      </div>
    </main>
  )
}
