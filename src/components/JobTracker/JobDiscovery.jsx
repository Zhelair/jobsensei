import React, { useRef, useState } from 'react'
import { Search, ExternalLink, Plus, X } from 'lucide-react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'
import { shortlist, discoveryDate, discoverySignature } from '../../lib/jobDiscovery'

export default function JobDiscovery({ applications, onSave }) {
  const { profile, setActiveSection } = useApp()
  const { secureSession } = useAuth()
  const { getProjectData, updateProjectData } = useProject()
  const stored = getProjectData('jobDiscovery') || {}
  const [preferences, setPreferences] = useState(stored.preferences || { keywords: profile?.targetRole || profile?.currentRole || '', location: '', source: 'linkedin', recency: '' })
  const [snapshot, setSnapshot] = useState(stored.snapshot || null)
  const [cache, setCache] = useState(stored.cache || {})
  const [activity, setActivity] = useState(stored.activity || {})
  const [hideViewed, setHideViewed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const searching = useRef(false)
  function persist(nextSnapshot, nextActivity, nextPreferences = preferences) {
    updateProjectData('jobDiscovery', { preferences: nextPreferences, snapshot: nextSnapshot, activity: nextActivity, cache })
  }
  function mark(id, field) {
    const next = { ...activity, [id]: { ...activity[id], [field]: new Date().toISOString() } }
    setActivity(next); persist(snapshot, next)
  }
  async function search(event) {
    event.preventDefault()
    if (searching.current) return
    const signature = discoverySignature(preferences)
    const cached = cache[signature] || (snapshot?.signature === signature ? snapshot : null)
    if (cached && Date.now() - Date.parse(cached.checkedAt) < 15 * 60 * 1000) { setSnapshot(cached); setNotice('Showing this search’s cached results. Searches refresh after 15 minutes.'); return }
    if (!secureSession?.access_token) { setNotice('Sign in to find jobs.'); return }
    searching.current = true; setBusy(true); setNotice('')
    try {
      const response = await fetch('/api/discover-jobs', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secureSession.access_token}` }, body: JSON.stringify(preferences), signal: AbortSignal.timeout(20000) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Search unavailable.')
      if (!Array.isArray(data.results)) throw new Error('Search returned an invalid response. Previous results have been kept.')
      const nextActivity = { ...activity }
      for (const job of data.results) if (!nextActivity[job.id]) nextActivity[job.id] = { firstSeen: data.checkedAt }
      const next = { ...data, signature, keywords: preferences.keywords, location: preferences.location, previousCheck: snapshot?.checkedAt || null }
      const nextCache = Object.fromEntries(Object.entries({ ...cache, [signature]: next }).slice(-8))
      setCache(nextCache); setSnapshot(next); setActivity(nextActivity)
      updateProjectData('jobDiscovery', { preferences, snapshot: next, activity: nextActivity, cache: nextCache })
      setNotice(data.results.length ? '' : 'No supported vacancy pages were found. Try broader keywords or another source.')
    } catch (error) { setNotice(error.name === 'TimeoutError' ? 'Search timed out. Please try again later.' : error.message) }
    finally { searching.current = false; setBusy(false) }
  }
  const visibleSnapshot = snapshot?.signature === discoverySignature(preferences) ? snapshot : cache[discoverySignature(preferences)]
  const jobs = shortlist(visibleSnapshot?.results || [], applications, activity, visibleSnapshot?.keywords || preferences.keywords, hideViewed, visibleSnapshot?.location || preferences.location)
  return <div className="space-y-4">
    <section className="card">
      <h2 className="font-display font-bold text-white text-xl">Discover your next role</h2>
      <p className="text-slate-300 text-sm mt-2">Find up to ten indexed job listings. Try your usual role, adjacent roles, or skills such as SQL and Power BI. Review the keywords before searching.</p>
      <form onSubmit={search} className="space-y-3 mt-4">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-300">Roles or keywords<input required maxLength={300} className="input-field w-full mt-1" value={preferences.keywords} onChange={e => setPreferences({ ...preferences, keywords: e.target.value })} placeholder="Fraud analyst, compliance, SQL" disabled={busy} /></label>
          <label className="text-sm text-slate-300">Location or remote preference<input maxLength={100} className="input-field w-full mt-1" value={preferences.location} onChange={e => setPreferences({ ...preferences, location: e.target.value })} placeholder="Sofia, Bulgaria or remote Europe" disabled={busy} /></label>
          <label className="text-sm text-slate-300">Source<select className="input-field w-full mt-1" value={preferences.source} onChange={e => setPreferences({ ...preferences, source: e.target.value })} disabled={busy}><option value="linkedin">LinkedIn public listings</option><option value="careers">Company boards: Greenhouse / Lever</option></select></label>
          <label className="text-sm text-slate-300">Search recency<select className="input-field w-full mt-1" value={preferences.recency} onChange={e => setPreferences({ ...preferences, recency: e.target.value })} disabled={busy}><option value="">Any time</option><option value="day">Last 24 hours</option><option value="week">Last week</option><option value="month">Last month</option></select></label>
        </div>
        <p className="text-xs text-slate-300">Recency uses search-index dates, which may differ from vacancy posting dates. Listings can be missing or expired. Confirm details on the original website.</p>
        <button className="btn-primary" disabled={busy || !preferences.keywords.trim()}><Search size={16} />{busy ? 'Finding jobs…' : 'Find jobs'}</button>
      </form>
      <p className="text-xs text-slate-300 mt-3">Repeat searches reuse cached results for 15 minutes. Tavily’s monthly search allowance is separate from your AI credits. Only these search preferences are sent; your resume is not uploaded.</p>
      <button type="button" className="btn-ghost text-xs mt-2" onClick={() => { sessionStorage.setItem('js_feedback_source', 'request'); setActiveSection(SECTIONS.ACCOUNT) }}>Missing your job board? Request a source.</button>
    </section>
    {notice && <p role="status" className="card text-sm text-slate-300">{notice}</p>}
    {visibleSnapshot && <div className="flex flex-wrap justify-between gap-3 text-sm text-slate-300"><span>Results for: {visibleSnapshot.keywords} · Checked {new Date(visibleSnapshot.checkedAt).toLocaleString()} · {jobs.length} shown</span><label><input type="checkbox" checked={hideViewed} onChange={e => setHideViewed(e.target.checked)} /> Hide viewed jobs</label></div>}
    {visibleSnapshot?.results?.length > 0 && !jobs.length && <p className="card text-sm text-slate-300">All results in this search are saved, dismissed, or hidden by your viewed-jobs filter.</p>}
    <div className="grid lg:grid-cols-2 gap-4">{jobs.map(job => <article key={job.id} className="card flex flex-col">
      {(!visibleSnapshot.previousCheck || Date.parse(activity[job.id]?.firstSeen) > Date.parse(visibleSnapshot.previousCheck)) && <span className="text-teal-400 text-xs mb-2">New since your last check</span>}
      <h3 className="font-display font-bold text-white">{job.title}</h3>
      <p className="text-slate-300 text-xs mt-2">{new URL(job.url).hostname} · {discoveryDate(job)}{activity[job.id]?.viewed ? ' · Viewed' : ''}</p>
      <p className="text-slate-300 text-sm mt-3 whitespace-pre-wrap">{job.snippet}</p>
      <p className="text-teal-400 text-xs mt-3">{job.matched.length ? `Keyword overlap: ${job.matched.join(', ')}` : 'Search result; no exact keyword overlap in the excerpt.'}</p>
      <div className="flex flex-wrap gap-2 mt-4"><a className="btn-secondary text-xs" href={job.url} target="_blank" rel="noopener noreferrer" onClick={() => mark(job.id, 'viewed')}><ExternalLink size={14} />Open listing</a><button className="btn-primary text-xs" onClick={() => onSave(job)}><Plus size={14} />Create workspace</button><button className="btn-ghost text-xs" onClick={() => mark(job.id, 'dismissed')}><X size={14} />Dismiss</button></div>
    </article>)}</div>
  </div>
}
