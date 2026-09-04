import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/useAuth'

const stages = { NEW: 'New', QUALIFIED: 'Qualified', PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost' }
const stageOrder = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
const forwardActions = { NEW: ['QUALIFIED'], QUALIFIED: ['PROPOSAL'], PROPOSAL: ['NEGOTIATION'], NEGOTIATION: ['WON', 'LOST'] }
const backwardActions = { QUALIFIED: 'NEW', PROPOSAL: 'QUALIFIED', NEGOTIATION: 'PROPOSAL' }
const empty = { title: '', value: '', expectedCloseDate: '', companyId: '', ownerId: '' }

function errorMessage(error, fallback) {
  return error.response?.data?.error?.message || fallback
}

export default function DealDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [deal, setDeal] = useState(null)
  const [companies, setCompanies] = useState([])
  const [owners, setOwners] = useState([])
  const [form, setForm] = useState(empty)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lifecycleSaving, setLifecycleSaving] = useState(false)
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
        setError(errorMessage(requestError, 'Unable to load deal.'))
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
      setError(errorMessage(requestError, 'Unable to update deal.'))
    } finally { setSaving(false) }
  }

  async function changeStage(nextStage, backwardReason = '') {
    setLifecycleSaving(true); setError('')
    try {
      const response = await api.patch(`/deals/${id}/stage`, { stage: nextStage, ...(backwardReason ? { reason: backwardReason } : {}) })
      setDeal(response.data.data.deal)
      setReason('')
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to change deal stage.'))
    } finally { setLifecycleSaving(false) }
  }

  async function moveBack(event) {
    event.preventDefault()
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setError('A reason is required when moving a deal backward.')
      return
    }
    await changeStage(backwardActions[deal.stage], trimmedReason)
  }

  async function reopen() {
    setLifecycleSaving(true); setError('')
    try {
      const response = await api.post(`/deals/${id}/reopen`)
      setDeal(response.data.data.deal)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to reopen deal.'))
    } finally { setLifecycleSaving(false) }
  }

  async function remove() {
    if (!window.confirm('Delete this deal?')) return
    try { await api.delete(`/deals/${id}`); navigate('/deals') } catch (requestError) { setError(errorMessage(requestError, 'Unable to delete deal.')) }
  }

  if (loading) return <main className="min-h-screen bg-slate-950 p-12 text-slate-100">Loading deal...</main>
  if (error && !deal) return <main className="min-h-screen bg-slate-950 p-12 text-red-200">{error}</main>
  if (!deal) return null

  const closed = deal.stage === 'WON' || deal.stage === 'LOST'
  const nextStages = forwardActions[deal.stage] || []
  const previousStage = backwardActions[deal.stage]

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sky-400" to="/deals">Back to deals</Link>
        <h1 className="mt-4 text-3xl font-bold">{deal.title}</h1>
        <p className="mt-2 text-sm text-slate-400">Stage: {stages[deal.stage]} · Owner: {deal.owner.email} · Company: {deal.company.name}</p>
        {error && <p className="mt-4 rounded bg-red-950 p-3 text-red-200">{error}</p>}

        <section className="mt-8 rounded border border-slate-800 bg-slate-900 p-6" aria-labelledby="lifecycle-heading">
          <h2 id="lifecycle-heading" className="text-xl font-semibold">Deal Lifecycle</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {stageOrder.map((stage) => <div className={`rounded border p-2 text-center text-sm ${deal.stage === stage ? 'border-sky-400 bg-sky-950 text-sky-200' : 'border-slate-700 text-slate-400'}`} key={stage}>{stages[stage]}</div>)}
          </div>
          {closed ? (
            <div className="mt-5">
              <p className="text-slate-300">This deal is closed. Only a manager can reopen it.</p>
              {user.role === 'MANAGER' && <button className="mt-4 rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={lifecycleSaving} onClick={reopen}>{lifecycleSaving ? 'Reopening...' : 'Reopen Deal'}</button>}
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="flex flex-wrap gap-3">{nextStages.map((nextStage) => <button className="rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={lifecycleSaving} key={nextStage} onClick={() => changeStage(nextStage)}>{lifecycleSaving ? 'Updating...' : nextStage === 'WON' ? 'Mark Won' : nextStage === 'LOST' ? 'Mark Lost' : `Advance to ${stages[nextStage]}`}</button>)}</div>
              {previousStage && <form onSubmit={moveBack}><label className="block text-sm text-slate-300">Reason for moving backward<textarea className="mt-1 min-h-20 w-full rounded border border-slate-700 bg-slate-950 p-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why the deal is moving back." required /></label><button className="mt-3 rounded border border-slate-600 px-4 py-2 text-slate-200 disabled:opacity-50" disabled={lifecycleSaving}>{lifecycleSaving ? 'Updating...' : `Move back to ${stages[previousStage]}`}</button></form>}
            </div>
          )}
        </section>

        <form className="mt-8 rounded border border-slate-800 bg-slate-900 p-6" onSubmit={save}>
          <label className="mt-3 block text-sm">Title<input className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.title} onChange={(e) => change('title', e.target.value)} required /></label>
          <label className="mt-3 block text-sm">Value<input type="text" inputMode="decimal" pattern="^\d{1,12}(\.\d{1,2})?$" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.value} onChange={(e) => change('value', e.target.value)} required /></label>
          <label className="mt-3 block text-sm">Expected close date<input type="date" className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.expectedCloseDate} onChange={(e) => change('expectedCloseDate', e.target.value)} required /></label>
          <label className="mt-3 block text-sm">Company<select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.companyId} onChange={(e) => change('companyId', e.target.value)} required>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          {user.role === 'MANAGER' && <label className="mt-3 block text-sm">Owner<select className="mt-1 w-full rounded border border-slate-700 bg-slate-950 p-2" value={form.ownerId} onChange={(e) => change('ownerId', e.target.value)} required>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.email}</option>)}</select></label>}
          <div className="mt-6 flex gap-3"><button className="rounded bg-sky-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button><button className="rounded border border-red-700 px-4 py-2 text-red-200" type="button" onClick={remove}>Delete</button></div>
        </form>
      </div>
    </main>
  )
}