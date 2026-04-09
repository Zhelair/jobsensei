import React, { useState, useRef, useEffect } from 'react'
import { useProject } from '../../context/ProjectContext'
import { useAI } from '../../context/AIContext'
import { useApp } from '../../context/AppContext'
import { prompts } from '../../utils/prompts'
import { generateId, formatDate, timeAgo, tryParseJSON } from '../../utils/helpers'
import { Plus, X, Download, Building2, ArrowLeft, Check, FileSpreadsheet, Upload, Edit3, Clock, Search, Scale, Copy, Printer, Save, Sparkles } from 'lucide-react'

const STAGES = ['Researching', 'Applied', 'Screening', 'Interviewing', 'Awaiting', 'Offer', 'Rejected']
const FOLLOWUP_DAYS = { Applied: 7, Screening: 5, Interviewing: 3, Awaiting: 5 }

function getOverdueApps(apps) {
  const now = new Date()
  return apps.filter(app => {
    const days = FOLLOWUP_DAYS[app.stage]
    if (!days) return false
    if (app.followupSnoozedUntil && new Date(app.followupSnoozedUntil) > now) return false
    const since = new Date(app.stageUpdatedAt || app.date)
    return (now - since) / (1000 * 60 * 60 * 24) >= days
  })
}
const STAGE_COLORS = {
  Researching: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  Applied: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Screening: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  Interviewing: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  Awaiting: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Offer: 'text-green-400 bg-green-400/10 border-green-400/20',
  Rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
}
const TABS = ['Kanban', 'Stats', 'Company Notes', 'Offers']

const OFFER_FIELDS = [
  { key: 'salaryScore', label: 'Salary', defaultWeight: 30 },
  { key: 'growth',      label: 'Growth', defaultWeight: 25 },
  { key: 'cultureFit',  label: 'Culture', defaultWeight: 20 },
  { key: 'workLife',    label: 'Work-Life', defaultWeight: 15 },
  { key: 'benefits',    label: 'Benefits', defaultWeight: 7 },
  { key: 'remote',      label: 'Flexibility', defaultWeight: 3 },
]

function AutoTextarea({ className, value, onChange, placeholder }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px' }
  }, [value])
  return (
    <textarea ref={ref} className={className} value={value} onChange={onChange} placeholder={placeholder}
      style={{ resize: 'none', overflow: 'hidden', minHeight: '5rem' }} />
  )
}

function exportToCSV(applications) {
  const headers = ['Company', 'Role', 'Stage', 'Date Applied', 'JD URL', 'Notes']
  const rows = applications.map(a => [
    a.company, a.role, a.stage,
    new Date(a.date).toLocaleDateString(),
    a.jdUrl || '', a.notes || ''
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'jobsensei-tracker.csv'; a.click()
  URL.revokeObjectURL(url)
}

function exportToJSON(applications, notes) {
  const data = JSON.stringify({ applications, notes }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'jobsensei-tracker.json'; a.click()
  URL.revokeObjectURL(url)
}

export default function JobTracker() {
  const { getProjectData, updateProjectData, updateProjectDataMultiple, activeApplicationId, setActiveApplication } = useProject()
  const applications = getProjectData('applications')
  const notes = getProjectData('companyNotes')
  const offerData = getProjectData('offerComparisons') || {}
  const currentJD = getProjectData('currentJD')

  function updateOfferData(appId, data) {
    updateProjectData('offerComparisons', { ...offerData, [appId]: data })
  }

  const { callAI, isConnected } = useAI()

  const [tab, setTab] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newApp, setNewApp] = useState({ company: '', role: '', stage: 'Researching', jdUrl: '', jdText: '', notes: '' })
  const [pendingResearch, setPendingResearch] = useState(null)
  const [researchLoading, setResearchLoading] = useState(false)
  const [selectedApp, setSelectedApp] = useState(null)
  const [editingApp, setEditingApp] = useState(null)
  const [importMsg, setImportMsg] = useState('')
  const [synced, setSynced] = useState(false)
  const importRef = useRef(null)

  function syncToProject() {
    updateProjectDataMultiple({ applications, companyNotes: notes, offerComparisons: offerData })
    setSynced(true)
    setTimeout(() => setSynced(false), 2000)
  }

  function openApplication(app) {
    setSelectedApp(app)
    setActiveApplication(app.id)
    if (app.jdText?.trim()) {
      updateProjectData('currentJD', app.jdText)
    }
  }

  async function researchForAdd() {
    if (!newApp.company.trim()) return
    setResearchLoading(true)
    try {
      let searchContext = null
      try {
        const searchRes = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: newApp.company, role: newApp.role }),
        })
        const searchData = await searchRes.json()
        if (!searchData.fallback && searchData.snippets) {
          searchContext = searchData.answer
            ? `Summary: ${searchData.answer}\n\n${searchData.snippets}`
            : searchData.snippets
        }
      } catch {}
      const raw = await callAI({
        systemPrompt: prompts.companyResearch(newApp.company, newApp.role, searchContext),
        messages: [{ role: 'user', content: 'Research this company.' }],
        temperature: 0.5,
      })
      const parsed = tryParseJSON(raw)
      if (parsed) {
        setPendingResearch({ ...parsed, _liveData: !!searchContext })
        if (parsed.prepNotes) setNewApp(p => ({ ...p, notes: parsed.prepNotes }))
      }
    } catch {}
    setResearchLoading(false)
  }

  function setApplications(updater) {
    const next = typeof updater === 'function' ? updater(applications) : updater
    updateProjectData('applications', next)
  }
  function setNotes(updater) {
    const next = typeof updater === 'function' ? updater(notes) : updater
    updateProjectData('companyNotes', next)
  }

  function addApplication() {
    if (!newApp.company.trim()) return
    const { notes: prepNote, ...appFields } = newApp
    const app = { ...appFields, id: generateId(), date: new Date().toISOString(), stageUpdatedAt: new Date().toISOString() }
    const mergedNotes = {
      ...(prepNote.trim() ? { prepNotes: prepNote } : {}),
      ...(pendingResearch || {}),
    }
    const nextApplications = [...applications, app]
    const nextCompanyNotes = Object.keys(mergedNotes).length > 0
      ? { ...notes, [app.id]: mergedNotes }
      : notes

    updateProjectDataMultiple({
      applications: nextApplications,
      companyNotes: nextCompanyNotes,
      activeApplicationId: app.id,
      currentJD: app.jdText?.trim() ? app.jdText : currentJD,
    })
    setNewApp({ company: '', role: '', stage: 'Researching', jdUrl: '', jdText: '', notes: '' })
    setPendingResearch(null)
    setShowAdd(false)
  }

  function updateApp(id, updates) {
    const stageUpdate = updates.stage ? { stageUpdatedAt: new Date().toISOString(), followupSnoozedUntil: null } : {}
    const nextApplications = applications.map(a => a.id === id ? { ...a, ...updates, ...stageUpdate } : a)
    updateProjectData('applications', nextApplications)
    if (activeApplicationId === id && updates.jdText?.trim()) {
      updateProjectData('currentJD', updates.jdText)
    }
    if (selectedApp?.id === id) setSelectedApp(a => ({ ...a, ...updates, ...stageUpdate }))
  }

  function snoozeApp(id, days) {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    updateApp(id, { followupSnoozedUntil: until })
  }

  function dismissApp(id) {
    updateApp(id, { followupSnoozedUntil: '9999-12-31T00:00:00.000Z' })
  }

  function saveEdit(updated) {
    const nextApplications = applications.map(a => a.id === updated.id ? updated : a)
    updateProjectData('applications', nextApplications)
    if (activeApplicationId === updated.id && updated.jdText?.trim()) {
      updateProjectData('currentJD', updated.jdText)
    }
    if (selectedApp?.id === updated.id) setSelectedApp(updated)
    setEditingApp(null)
  }

  function deleteApp(id) {
    const nextApplications = applications.filter(a => a.id !== id)
    const nextActiveId = activeApplicationId === id ? nextApplications[0]?.id || null : activeApplicationId
    const nextActiveApp = nextApplications.find(app => app.id === nextActiveId)
    updateProjectDataMultiple({
      applications: nextApplications,
      activeApplicationId: nextActiveId,
      currentJD: nextActiveApp?.jdText?.trim() ? nextActiveApp.jdText : currentJD,
    })
    if (selectedApp?.id === id) {
      setSelectedApp(null)
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0]; if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (parsed.applications) {
        const idMap = {}
        const importedApps = parsed.applications.map(a => {
          const newId = generateId()
          idMap[a.id] = newId
          return { ...a, id: newId }
        })
        const importedNotes = {}
        if (parsed.notes) {
          Object.entries(parsed.notes).forEach(([oldId, noteData]) => {
            const newId = idMap[oldId]
            if (newId) importedNotes[newId] = noteData
          })
        }
        updateProjectDataMultiple({
          applications: [...applications, ...importedApps],
          companyNotes: { ...notes, ...importedNotes },
        })
        setImportMsg(`✅ Imported ${importedApps.length} applications`)
      } else throw new Error()
    } catch { setImportMsg('❌ Invalid file') }
    setTimeout(() => setImportMsg(''), 3000)
    e.target.value = ''
  }

  const overdueApps = getOverdueApps(applications)

  if (selectedApp) return (
    <CompanyNotesView
      app={selectedApp}
      notes={notes[selectedApp.id] || {}}
      onSaveNotes={n => setNotes(prev => ({ ...prev, [selectedApp.id]: n }))}
      onBack={() => setSelectedApp(null)}
      onUpdateApp={updates => updateApp(selectedApp.id, updates)}
    />
  )

  return (
    <div className="p-4 md:p-6 animate-in">
      {/* Edit job modal */}
      {editingApp && (
        <EditJobModal
          app={editingApp}
          onSave={saveEdit}
          onClose={() => setEditingApp(null)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">Job Tracker</h2>
          <p className="section-sub">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <button onClick={() => document.getElementById('tracker-export-menu').classList.toggle('hidden')}
              className="btn-ghost text-xs">
              <Download size={14}/> Export
            </button>
            <div id="tracker-export-menu" className="hidden absolute right-0 top-full mt-1 bg-navy-800 border border-navy-600 rounded-xl shadow-xl z-20 min-w-36 overflow-hidden">
              <button onClick={() => { exportToJSON(applications, notes); document.getElementById('tracker-export-menu').classList.add('hidden') }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-navy-700">
                <Download size={12}/> JSON
              </button>
              <button onClick={() => { exportToCSV(applications); document.getElementById('tracker-export-menu').classList.add('hidden') }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-navy-700">
                <FileSpreadsheet size={12}/> CSV / Excel
              </button>
            </div>
          </div>
          <button onClick={() => importRef.current?.click()} className="btn-ghost text-xs"><Upload size={14}/> Import</button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport}/>
          <button onClick={syncToProject} className={`btn-ghost text-xs transition-colors ${synced ? 'text-green-400' : ''}`}>
            <Save size={14}/> {synced ? 'Synced ✓' : 'Sync'}
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs"><Plus size={14}/> Add</button>
        </div>
      </div>

      {importMsg && <div className="mb-3 text-xs text-center py-2 rounded-xl bg-navy-700">{importMsg}</div>}

      {showAdd && (
        <div className="card mb-4">
          <h3 className="font-display font-semibold text-white text-sm mb-3">Add Application</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input className="input-field" placeholder="Company *" value={newApp.company}
              onChange={e => { setNewApp(p => ({ ...p, company: e.target.value })); setPendingResearch(null) }}
              onKeyDown={e => e.key === 'Enter' && addApplication()} />
            <input className="input-field" placeholder="Role title" value={newApp.role}
              onChange={e => setNewApp(p => ({ ...p, role: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <select className="input-field" value={newApp.stage}
              onChange={e => setNewApp(p => ({ ...p, stage: e.target.value }))}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input className="input-field" placeholder="JD URL (optional)" value={newApp.jdUrl}
              onChange={e => setNewApp(p => ({ ...p, jdUrl: e.target.value }))} />
          </div>
          <div className="mb-3">
            <label className="text-sm text-slate-400 mb-1.5 block">Job Description</label>
            <AutoTextarea className="textarea-field" placeholder="Paste the job description once to make this application available across the main tools..."
              value={newApp.jdText} onChange={e => setNewApp(p => ({ ...p, jdText: e.target.value }))} />
          </div>

          {newApp.company.trim() && (
            <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border mb-3 transition-all ${pendingResearch ? 'bg-teal-500/10 border-teal-500/30' : 'bg-indigo-500/5 border-indigo-500/25'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${pendingResearch ? 'bg-teal-500/20' : 'bg-indigo-500/20'}`}>
                  {pendingResearch ? <Check size={14} className="text-teal-400"/> : <Search size={14} className="text-indigo-400"/>}
                </div>
                <div className="min-w-0">
                  {pendingResearch
                    ? <>
                        <div className="text-teal-400 text-xs font-semibold">Research ready {pendingResearch._liveData ? '(live data)' : '(AI)'}</div>
                        <div className="text-slate-500 text-xs">Wow facts, culture & prep notes auto-filled below</div>
                      </>
                    : <>
                        <div className="text-white text-xs font-semibold">Research <span className="text-indigo-300">{newApp.company}</span> with AI</div>
                        <div className="text-slate-500 text-xs">Get wow facts, news, culture & prep notes</div>
                      </>
                  }
                </div>
              </div>
              <button onClick={researchForAdd} disabled={researchLoading || !isConnected}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 flex-shrink-0 transition-all ${
                  pendingResearch
                    ? 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30'
                    : 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-md shadow-indigo-500/25'
                }`}>
                <Search size={12}/> {researchLoading ? 'Researching...' : pendingResearch ? 'Re-run' : 'Research'}
              </button>
            </div>
          )}

          <AutoTextarea className="textarea-field mb-1" placeholder="Initial prep note (optional)…"
            value={newApp.notes} onChange={e => setNewApp(p => ({ ...p, notes: e.target.value }))} />
          <p className="text-slate-600 text-xs mb-3">↳ Saved to <strong className="text-slate-500">Company Notes → My prep notes</strong></p>
          <div className="flex gap-2">
            <button onClick={addApplication} disabled={!newApp.company.trim()} className="btn-primary">Add</button>
            <button onClick={() => { setShowAdd(false); setPendingResearch(null) }} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-navy-900 p-1 rounded-xl mb-4">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 py-2 rounded-lg text-xs font-body font-medium transition-all ${tab === i ? 'bg-navy-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
        ))}
      </div>

      {tab === 0 && overdueApps.length > 0 && (
        <div className="mb-3 card border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-yellow-400"/>
            <span className="text-yellow-400 text-xs font-display font-semibold">Follow Up Today ({overdueApps.length})</span>
          </div>
          <div className="space-y-2">
            {overdueApps.map(app => (
              <div key={app.id} className="flex items-center gap-2 flex-wrap">
                <button onClick={() => openApplication(app)} className="text-white text-xs hover:text-teal-400 text-left flex-1 min-w-0 truncate">
                  {app.company}{app.role ? ` — ${app.role}` : ''}
                </button>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`badge text-xs border ${STAGE_COLORS[app.stage]}`}>{app.stage}</span>
                  <span className="text-slate-500 text-xs">{timeAgo(app.stageUpdatedAt || app.date)}</span>
                  <select
                    className="bg-navy-800 border border-navy-600 rounded-lg px-1.5 py-0.5 text-xs text-slate-400 focus:outline-none focus:border-teal-500 cursor-pointer"
                    defaultValue=""
                    onChange={e => { if (e.target.value) { snoozeApp(app.id, parseInt(e.target.value)); e.target.value = '' } }}
                    title="Snooze reminder"
                  >
                    <option value="" disabled>⏰</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                  </select>
                  <button onClick={() => dismissApp(app.id)} className="text-slate-500 hover:text-red-400 transition-colors" title="Dismiss">
                    <X size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-3 min-w-max pb-4">
            {STAGES.map(stage => {
              const stageApps = applications.filter(a => a.stage === stage)
              return (
                <div key={stage} className="w-52 flex-shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 border text-xs font-display font-semibold ${STAGE_COLORS[stage]}`}>
                    {stage} <span className="ml-auto opacity-60">{stageApps.length}</span>
                  </div>
                  <div className="space-y-2 min-h-16">
                    {stageApps.map(app => (
                      <div key={app.id} className={`card p-3 ${activeApplicationId === app.id ? 'border border-teal-500/30 bg-teal-500/5' : ''}`}>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <button onClick={() => openApplication(app)}
                            className="text-white text-xs font-body font-semibold hover:text-teal-400 text-left leading-snug flex-1">
                            {app.company}
                          </button>
                          <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                            {/* Edit button */}
                            <button onClick={() => setEditingApp({ ...app })}
                              className="text-slate-600 hover:text-teal-400 p-0.5" title="Edit job">
                              <Edit3 size={11}/>
                            </button>
                            <button onClick={() => deleteApp(app.id)}
                              className="text-slate-600 hover:text-red-400 p-0.5">
                              <X size={12}/>
                            </button>
                          </div>
                        </div>
                        {app.role && <div className="text-slate-500 text-xs mb-1.5 leading-snug">{app.role}</div>}
                        {activeApplicationId === app.id && <span className="badge-teal mb-1.5 inline-flex">Active</span>}
                        <div className="text-slate-600 text-xs mb-2">{timeAgo(app.date)}</div>
                        <select
                          className="w-full bg-navy-900 border border-navy-600 rounded-lg px-2 py-1 text-xs text-slate-400 focus:outline-none focus:border-teal-500 cursor-pointer"
                          value={app.stage}
                          onChange={e => updateApp(app.id, { stage: e.target.value })}
                        >
                          {STAGES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 1 && <TrackerStats applications={applications} />}

      {tab === 2 && (
        <div className="space-y-2">
          {applications.length === 0 ? (
            <div className="card text-center py-10 text-slate-500">Add applications first.</div>
          ) : [...applications].sort((a, b) => new Date(b.date) - new Date(a.date)).map(app => (
            <button key={app.id} onClick={() => openApplication(app)}
              className="card-hover w-full text-left flex items-center gap-3">
              <Building2 size={18} className="text-slate-500 flex-shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="text-white font-body font-medium text-sm">{app.company}</div>
                <div className="text-slate-500 text-xs">{app.role}</div>
                <div className="text-slate-600 text-xs">{timeAgo(app.date)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {activeApplicationId === app.id && <span className="badge-teal">Active</span>}
                <span className={`badge text-xs border ${STAGE_COLORS[app.stage]}`}>{app.stage}</span>
                <span className="text-slate-600 text-xs">{notes[app.id] ? '📝' : '+'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === 3 && (
        <OfferComparison
          applications={applications}
          offerData={offerData}
          onUpdateOfferData={updateOfferData}
          onSelectApp={app => openApplication(app)}
        />
      )}
    </div>
  )
}

// ── Edit Job Modal ──────────────────────────────────────────────────────────
function EditJobModal({ app, onSave, onClose }) {
  const [form, setForm] = useState({ ...app })
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy-800 border border-navy-600 rounded-2xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white">Edit Application</h3>
          <button onClick={onClose}><X size={16} className="text-slate-400"/></button>
        </div>
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Company *</label>
              <input className="input-field" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Role title</label>
              <input className="input-field" value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Stage</label>
              <select className="input-field" value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">JD URL</label>
              <input className="input-field" placeholder="https://…" value={form.jdUrl || ''}
                onChange={e => setForm(f => ({ ...f, jdUrl: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Job Description</label>
            <AutoTextarea className="textarea-field" placeholder="Paste the saved job description for this application..."
              value={form.jdText || ''} onChange={e => setForm(f => ({ ...f, jdText: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSave(form)} disabled={!form.company.trim()}
            className="btn-primary flex-1 justify-center"><Check size={14}/> Save</button>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Stats ───────────────────────────────────────────────────────────────────
function TrackerStats({ applications }) {
  const total = applications.length
  const byStage = STAGES.reduce((acc, s) => ({ ...acc, [s]: applications.filter(a => a.stage === s).length }), {})
  const active = applications.filter(a => !['Offer', 'Rejected'].includes(a.stage)).length
  return (
    <div className="space-y-4 animate-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total', total, 'text-white'], ['Active', active, 'text-teal-400'], ['Offers', byStage.Offer, 'text-green-400'], ['Rejected', byStage.Rejected, 'text-red-400']].map(([l, v, c]) => (
          <div key={l} className="card text-center">
            <div className={`font-display font-bold text-2xl mb-1 ${c}`}>{v}</div>
            <div className="text-slate-400 text-xs">{l}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="font-display font-semibold text-white text-sm mb-3">Pipeline</h3>
        <div className="space-y-2">
          {STAGES.map(stage => {
            const count = byStage[stage]
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-20 flex-shrink-0">{stage}</span>
                <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }}/>
                </div>
                <span className="text-slate-500 text-xs w-4">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
      {byStage.Offer > 0 && (
        <div className="card border-green-500/20 bg-green-500/5 text-center py-6">
          <div className="text-3xl mb-2">🎉</div>
          <div className="font-display font-bold text-green-400 text-lg">{byStage.Offer} Offer{byStage.Offer > 1 ? 's' : ''}!</div>
          <div className="text-slate-400 text-sm">Conversion: {total > 0 ? Math.round((byStage.Offer / total) * 100) : 0}%</div>
        </div>
      )}
    </div>
  )
}

// ── Company Notes View ──────────────────────────────────────────────────────
function CompanyNotesView({ app, notes, onSaveNotes, onBack, onUpdateApp }) {
  const { callAI, isConnected } = useAI()
  const [form, setForm] = useState({
    people: '', theyMentioned: '', techStack: '', culture: '', openQ: '', prepNotes: '', wowFacts: '', ...notes
  })
  const [jdText, setJdText] = useState(app.jdText || '')
  const [saved, setSaved] = useState(false)
  const [researching, setResearching] = useState(false)
  const [researchMsg, setResearchMsg] = useState('')
  const [cheatSheet, setCheatSheet] = useState('')
  const [cheatLoading, setCheatLoading] = useState(false)

  function save() {
    onSaveNotes(form)
    if (jdText !== (app.jdText || '')) {
      onUpdateApp({ jdText })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function runResearch() {
    setResearching(true)
    setResearchMsg('')
    try {
      let searchContext = null
      try {
        const searchRes = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: app.company, role: app.role }),
        })
        const searchData = await searchRes.json()
        if (!searchData.fallback && searchData.snippets) {
          searchContext = searchData.answer
            ? `Summary: ${searchData.answer}\n\n${searchData.snippets}`
            : searchData.snippets
        }
      } catch {}
      const raw = await callAI({
        systemPrompt: prompts.companyResearch(app.company, app.role, searchContext),
        messages: [{ role: 'user', content: 'Research this company.' }],
        temperature: 0.5,
      })
      const parsed = tryParseJSON(raw)
      if (parsed) {
        setForm(f => ({
          ...f,
          wowFacts: parsed.wowFacts || f.wowFacts,
          techStack: parsed.techStack || f.techStack,
          culture: parsed.culture || f.culture,
          openQ: parsed.openQ || f.openQ,
          prepNotes: parsed.prepNotes || f.prepNotes,
        }))
        setResearchMsg(searchContext
          ? '✓ Notes pre-filled with live data (wow facts, culture & tools) — review and save when ready'
          : '✓ Notes pre-filled — review and save when ready')
      } else {
        setResearchMsg('Could not parse research. Try again.')
      }
    } catch {
      setResearchMsg('Research failed. Check your AI connection.')
    }
    setResearching(false)
  }

  async function generateCheatSheet() {
    const notesText = [
      form.wowFacts && `Wow Facts & Recent News:\n${form.wowFacts}`,
      form.techStack && `Tools & Systems:\n${form.techStack}`,
      form.culture && `Culture:\n${form.culture}`,
      form.openQ && `Open Questions:\n${form.openQ}`,
      form.prepNotes && `Prep Notes:\n${form.prepNotes}`,
      form.people && `People spoken to:\n${form.people}`,
      form.theyMentioned && `Things they mentioned:\n${form.theyMentioned}`,
    ].filter(Boolean).join('\n\n')

    setCheatLoading(true)
    setCheatSheet('')
    try {
      let full = ''
      await callAI({
        systemPrompt: prompts.interviewCheatSheet(app.company, app.role, notesText),
        messages: [{ role: 'user', content: 'Generate interview cheat sheet.' }],
        temperature: 0.5,
        onChunk: (_, acc) => { full = acc; setCheatSheet(acc) },
      })
    } catch {}
    setCheatLoading(false)
  }

  function downloadCheatAsPng(title, content) {
    const canvas = document.createElement('canvas')
    const width = 900
    const padding = 44
    const lineH = 22
    const ctx = canvas.getContext('2d')
    const lines = []
    content.split('\n').forEach(line => {
      if (line.startsWith('## ') || line.startsWith('# ') || (line.startsWith('**') && line.endsWith('**'))) {
        lines.push({ text: line.replace(/^#+\s*/, '').replace(/\*\*/g, ''), bold: true, size: 16, gap: 8 })
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        lines.push({ text: '• ' + line.slice(2), bold: false, size: 14, gap: 2 })
      } else if (line.trim() === '') {
        lines.push({ text: '', bold: false, size: 14, gap: 6 })
      } else {
        lines.push({ text: line, bold: false, size: 14, gap: 2 })
      }
    })
    const wrapped = []
    const maxW = width - padding * 2
    lines.forEach(l => {
      if (!l.text) { wrapped.push({ ...l }); return }
      ctx.font = `${l.bold ? 'bold ' : ''}${l.size}px system-ui,sans-serif`
      const words = l.text.split(' ')
      let cur = ''
      words.forEach(w => {
        const test = cur ? cur + ' ' + w : w
        if (ctx.measureText(test).width > maxW) { wrapped.push({ ...l, text: cur }); cur = w }
        else cur = test
      })
      if (cur) wrapped.push({ ...l, text: cur })
    })
    const headerH = 60
    const totalH = headerH + wrapped.reduce((acc, l) => acc + lineH + (l.gap || 0), 0) + padding * 2
    canvas.width = width; canvas.height = Math.max(totalH, 200)
    ctx.fillStyle = '#0F172A'; ctx.fillRect(0, 0, width, canvas.height)
    ctx.fillStyle = '#14B8A6'; ctx.fillRect(0, 0, width, headerH)
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px system-ui,sans-serif'
    ctx.fillText(title, padding, 36)
    let y = headerH + padding
    wrapped.forEach(l => {
      if (l.text) {
        ctx.font = `${l.bold ? 'bold ' : ''}${l.size}px system-ui,sans-serif`
        ctx.fillStyle = l.bold ? '#F1F5F9' : '#CBD5E1'
        ctx.fillText(l.text, padding, y)
      }
      y += lineH + (l.gap || 0)
    })
    const link = document.createElement('a')
    link.download = `${app.company.replace(/\s+/g, '_')}_cheatsheet.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function printCheatAsPdf() {
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head><title>Interview Cheat Sheet – ${app.company}</title><style>
      body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#111;line-height:1.6}
      h1{font-size:1.4rem;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:16px}
      h2{font-size:1.1rem;margin-top:20px;margin-bottom:6px}
      ul{padding-left:20px;margin:6px 0}li{margin-bottom:4px}
      @media print{body{margin:10px}@page{margin:1cm}}
    </style></head><body>
      <h1>📋 Interview Cheat Sheet: ${app.company}${app.role ? ` — ${app.role}` : ''}</h1>
      <pre style="white-space:pre-wrap;font-family:inherit;font-size:0.9rem">${cheatSheet}</pre>
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-in">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={16}/> Back to Tracker</button>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="section-title">{app.company}</h2>
          <p className="section-sub">{app.role}</p>
        </div>
        <select className="input-field w-36" value={app.stage}
          onChange={e => onUpdateApp({ stage: e.target.value })}>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {app.jdUrl && (
        <div className="mb-3">
          <a href={app.jdUrl} target="_blank" rel="noopener noreferrer"
            className="text-teal-400 text-sm hover:text-teal-300 underline underline-offset-2">
            🔗 View Job Description
          </a>
        </div>
      )}

      <div className="card border-teal-500/20 bg-teal-500/5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <div className="text-white text-sm font-display font-semibold">Active job context</div>
            <div className="text-slate-400 text-xs">This tracker application now pre-fills the main JD-based tools.</div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border ${jdText.trim() ? 'text-teal-300 border-teal-500/30 bg-teal-500/10' : 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'}`}>
            {jdText.trim() ? 'JD attached' : 'Add JD to prefill tools'}
          </span>
        </div>
        <label className="text-sm text-slate-400 mb-1.5 block">Saved Job Description</label>
        <AutoTextarea className="textarea-field" placeholder="Paste the job description once. Interview Sim, Gap Analysis, Question Predictor, Cover Letter, and Resume Checker will use it."
          value={jdText} onChange={e => setJdText(e.target.value)} />
      </div>

      {/* Research banner */}
      <div className="card border-teal-500/20 bg-teal-500/5 mb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white text-sm font-display font-semibold">Research this company</div>
            <div className="text-slate-400 text-xs">AI fills wow facts, tools & systems, culture, open questions & prep notes</div>
          </div>
          <button onClick={runResearch} disabled={!isConnected || researching}
            className="btn-primary text-xs flex-shrink-0">
            <Search size={13}/> {researching ? 'Researching...' : 'Auto-fill Notes'}
          </button>
        </div>
        {researchMsg && (
          <p className={`text-xs mt-2 ${researchMsg.startsWith('✓') ? 'text-teal-400' : 'text-red-400'}`}>
            {researchMsg}
          </p>
        )}
      </div>

      {/* Interview Cheat Sheet — shown before form fields */}
      <div className="card border-indigo-500/20 bg-indigo-500/5 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-white text-sm font-display font-semibold flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400"/> Interview Cheat Sheet
            </div>
            <div className="text-slate-400 text-xs">Generates from your saved notes — fill the fields below first</div>
          </div>
          <button onClick={generateCheatSheet} disabled={!isConnected || cheatLoading}
            className="btn-primary text-xs flex-shrink-0">
            {cheatLoading ? 'Generating...' : cheatSheet ? 'Regenerate' : 'Generate'}
          </button>
        </div>

        {cheatSheet && (
          <div className="mt-4 animate-in">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="text-slate-400 text-xs font-display font-semibold uppercase tracking-wider">📋 Cheat Sheet</span>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard?.writeText(cheatSheet)} className="btn-ghost text-xs">
                  <Copy size={12}/> Copy
                </button>
                <button onClick={printCheatAsPdf} className="btn-ghost text-xs">
                  <Printer size={12}/> PDF
                </button>
                <button onClick={() => downloadCheatAsPng(`${app.company} — Interview Cheat Sheet`, cheatSheet)} className="btn-secondary text-xs">
                  <Download size={12}/> PNG
                </button>
              </div>
            </div>
            <div className="bg-navy-900 rounded-xl p-4">
              {cheatSheet.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h3 key={i} className="font-display font-semibold text-white text-sm mt-3 mb-1">{line.slice(3)}</h3>
                if (line.startsWith('# ')) return <h2 key={i} className="font-display font-bold text-white mb-2">{line.slice(2)}</h2>
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-white font-semibold text-sm mt-2 mb-1">{line.slice(2, -2)}</p>
                if (line.startsWith('- ') || line.startsWith('* ')) return <p key={i} className="text-slate-300 text-sm ml-3 mb-1">• {line.slice(2)}</p>
                if (line.trim() === '') return <div key={i} className="h-2"/>
                return <p key={i} className="text-slate-300 text-sm mb-1">{line}</p>
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {[
          ['people', "People I've spoken to", 'Names, titles, LinkedIn…'],
          ['theyMentioned', 'Things they mentioned', 'Pain points, team, priorities…'],
          ['wowFacts', 'Wow facts & recent news ⭐', 'Recent news, funding, product launch, stock… (auto-filled by Research)'],
          ['techStack', 'Tools & systems', 'Software, platforms, processes for this role… (auto-filled by Research)'],
          ['culture', 'Culture signals', 'Remote policy, values, vibe… (auto-filled by Research)'],
          ['openQ', 'Open questions', 'Things to ask or research… (auto-filled by Research)'],
          ['prepNotes', 'My prep notes', 'Key points to emphasize… (auto-filled by Research)'],
        ].map(([key, label, ph]) => (
          <div key={key}>
            <label className="text-sm text-slate-400 mb-1.5 block">{label}</label>
            <AutoTextarea className="textarea-field" placeholder={ph}
              value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
      </div>

      <button onClick={save} className={`btn-primary mt-4 mb-6 ${saved ? 'bg-green-500 hover:bg-green-400' : ''}`}>
        {saved ? <><Check size={16}/> Saved!</> : <>Save Notes</>}
      </button>
    </div>
  )
}

// ── Offer Comparison ─────────────────────────────────────────────────────────
function OfferComparison({ applications, offerData, onUpdateOfferData, onSelectApp }) {
  const { callAI, isConnected } = useAI()
  const { profile } = useApp()
  const offerApps = applications.filter(a => a.stage === 'Offer')
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(OFFER_FIELDS.map(f => [f.key, f.defaultWeight]))
  )
  const [showWeights, setShowWeights] = useState(false)
  const [advice, setAdvice] = useState('')
  const [loadingAdvice, setLoadingAdvice] = useState(false)

  function getScore(appId) {
    const d = offerData[appId] || {}
    return Math.round(OFFER_FIELDS.reduce((sum, f) => sum + (d[f.key] || 3) * 20 * (weights[f.key] / 100), 0))
  }

  function updateField(appId, field, value) {
    onUpdateOfferData(appId, { ...(offerData[appId] || {}), [field]: value })
  }

  async function getAdvice() {
    setLoadingAdvice(true); setAdvice('')
    const offersText = offerApps.map(app => {
      const d = offerData[app.id] || {}
      return `${app.company} (${app.role || 'role n/a'}): Score ${getScore(app.id)}/100 | Salary: ${d.baseSalary || 'not listed'} | Bonus: ${d.bonus || 'n/a'} | ${OFFER_FIELDS.map(f => `${f.label}: ${d[f.key] || 3}/5`).join(', ')}`
    }).join('\n')
    const profileSummary = `${profile?.currentRole || 'professional'}, targeting ${profile?.targetRole || 'new role'}`
    try {
      await callAI({
        systemPrompt: prompts.offerAdvisor(offersText, profileSummary),
        messages: [{ role: 'user', content: 'Which offer should I take?' }],
        temperature: 0.6,
        onChunk: (_, acc) => setAdvice(acc),
      })
    } catch {}
    setLoadingAdvice(false)
  }

  if (offerApps.length === 0) return (
    <div className="card text-center py-12 animate-in">
      <Scale size={32} className="text-slate-600 mx-auto mb-3"/>
      <div className="text-white font-display font-semibold mb-1">No Offers Yet</div>
      <div className="text-slate-400 text-sm">Move an application to "Offer" stage to compare here.</div>
    </div>
  )

  const sortedOffers = [...offerApps].sort((a, b) => getScore(b.id) - getScore(a.id))
  const weightTotal = Object.values(weights).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-4 animate-in">
      {/* Weights */}
      <div className="card">
        <button onClick={() => setShowWeights(!showWeights)} className="flex items-center justify-between w-full">
          <span className="text-white text-sm font-display font-semibold">What matters to you?</span>
          <span className="text-teal-400 text-xs">{showWeights ? 'Hide ↑' : 'Customize weights ↓'}</span>
        </button>
        {showWeights && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {OFFER_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 mb-1 block">{f.label} <span className="text-teal-400">{weights[f.key]}%</span></label>
                <input type="range" min="0" max="50" value={weights[f.key]}
                  onChange={e => setWeights(w => ({ ...w, [f.key]: parseInt(e.target.value) }))}
                  className="w-full accent-teal-500"/>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3">
              <p className={`text-xs ${weightTotal !== 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                Total: {weightTotal}% {weightTotal !== 100 ? '— adjust sliders to reach 100%' : '✓'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Winner badge */}
      {sortedOffers.length > 1 && (
        <div className="card border-green-500/20 bg-green-500/5 text-center py-3">
          <div className="text-green-400 text-xs font-display font-semibold mb-0.5">Current Leader</div>
          <div className="text-white font-display font-bold text-lg">{sortedOffers[0].company}</div>
          <div className="text-slate-400 text-xs">{sortedOffers[0].role} · Score {getScore(sortedOffers[0].id)}/100</div>
        </div>
      )}

      {/* Offer cards */}
      {sortedOffers.map((app, rank) => {
        const d = offerData[app.id] || {}
        const score = getScore(app.id)
        return (
          <div key={app.id} className={`card ${rank === 0 && sortedOffers.length > 1 ? 'border-green-500/30' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <button onClick={() => onSelectApp(app)} className="text-white font-display font-semibold hover:text-teal-400 text-left text-sm">
                  {app.company}
                </button>
                <div className="text-slate-400 text-xs">{app.role}</div>
              </div>
              <div className={`text-2xl font-display font-bold ${score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-slate-400'}`}>
                {score}<span className="text-slate-500 text-xs font-normal">/100</span>
              </div>
            </div>

            {/* Text fields */}
            <div className="grid sm:grid-cols-2 gap-2 mb-3">
              <input className="input-field text-xs" placeholder="Base salary (e.g. BGN 80,000)"
                value={d.baseSalary || ''} onChange={e => updateField(app.id, 'baseSalary', e.target.value)}/>
              <input className="input-field text-xs" placeholder="Bonus / equity (e.g. 10% + options)"
                value={d.bonus || ''} onChange={e => updateField(app.id, 'bonus', e.target.value)}/>
            </div>

            {/* Rating rows */}
            <div className="space-y-2">
              {OFFER_FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-20 flex-shrink-0">{f.label}</span>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(v => (
                      <button key={v} onClick={() => updateField(app.id, f.key, v)}
                        className={`w-7 h-7 rounded-lg text-xs font-display font-semibold transition-all ${(d[f.key] || 3) === v ? 'bg-teal-500 text-white' : 'bg-navy-700 text-slate-400 hover:bg-navy-600'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <span className="text-slate-600 text-xs flex-shrink-0">{weights[f.key]}%</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* AI Offer Advisor */}
      <div className="card border-indigo-500/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-white text-sm font-display font-semibold">AI Offer Advisor</div>
            <div className="text-slate-400 text-xs">Get a direct recommendation based on your ratings</div>
          </div>
          <button onClick={getAdvice} disabled={loadingAdvice || !isConnected || offerApps.length < 1}
            className="btn-primary text-xs">
            {loadingAdvice ? 'Analyzing...' : 'Get Advice'}
          </button>
        </div>
        {advice && (
          <div className="bg-navy-900 rounded-xl p-3">
            <p className="text-slate-200 text-sm leading-relaxed">{advice}</p>
          </div>
        )}
      </div>
    </div>
  )
}
